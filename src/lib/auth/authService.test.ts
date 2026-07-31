import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthError } from './types';
import type { SignUpInput } from './types';

/**
 * Bug real corregido (ver historial de conversación): el registro mostraba
 * "Correo o contraseña incorrectos" — un mensaje de /login — cuando
 * `signUp()` fallaba por cualquier motivo que no fuera "ya registrado" o
 * contraseña corta (p. ej. el límite de envío de correos de Supabase,
 * `over_email_send_rate_limit`, verificado en los logs reales del
 * proyecto). La causa era un único `mapAuthError()` compartido entre
 * registro y login cuyo caso por defecto era el mensaje de login. Estas
 * pruebas fijan el comportamiento correcto: registro y login tienen
 * traductores de error separados (`mapSignUpError`/`mapSignInError`), y
 * "Correo o contraseña incorrectos" solo puede salir del segundo.
 */

// `redirectOrigin()` en authService.ts solo construye una URL absoluta
// cuando `browser` es true y existe `window.location` — en el entorno de
// pruebas (vitest, Node, sin DOM) no hay ninguno de los dos por defecto.
// Se simulan aquí para poder comprobar de verdad la URL de redirectTo que
// se le pasa a signInWithOAuth, en vez de asumirlo sin probarlo.
vi.mock('$app/environment', () => ({ browser: true }));
vi.stubGlobal('window', { location: { origin: 'https://convoca.test' } });

vi.mock('$lib/supabase/client', () => {
	const auth = {
		signUp: vi.fn(),
		signInWithPassword: vi.fn(),
		signInWithOAuth: vi.fn(async () => ({ data: { url: null, provider: 'google' }, error: null })),
		resend: vi.fn(),
		getSession: vi.fn(async () => ({ data: { session: null } })),
		getUser: vi.fn(async () => ({ data: { user: null } })),
		onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
		signOut: vi.fn()
	};
	return {
		supabase: {
			auth,
			from: vi.fn((table: string) => ({
				select: () => ({
					eq: () => ({
						maybeSingle: async () =>
							table === 'profiles'
								? { data: { role: 'organizer' }, error: null }
								: { data: null, error: null }
					})
				})
			}))
		},
		setSessionScope: vi.fn()
	};
});

import { supabase } from '$lib/supabase/client';
import {
	authService,
	validateSignUpInput,
	mapSignUpError,
	mapSignInError,
	hasCompletedLegalAcceptance
} from './authService';
import type { OrganizerPrivateProfile } from './types';
import { LEGAL_VERSIONS } from '$lib/legal/versions';

function baseInput(overrides: Partial<SignUpInput> = {}): SignUpInput {
	return {
		email: 'organizadora@example.org',
		password: 'contraseña-larga',
		displayName: 'Asociación de prueba',
		organizerKind: 'persona',
		acceptedTerms: true,
		acceptedPrivacy: true,
		acceptedPeacefulUse: true,
		...overrides
	};
}

describe('validateSignUpInput', () => {
	it('acepta una entrada válida', () => {
		expect(() => validateSignUpInput(baseInput())).not.toThrow();
	});

	it('rechaza un correo sin arroba', () => {
		expect(() => validateSignUpInput(baseInput({ email: 'no-es-un-correo' }))).toThrow(AuthError);
	});

	it('rechaza un nombre público vacío', () => {
		expect(() => validateSignUpInput(baseInput({ displayName: '   ' }))).toThrow(AuthError);
	});

	it('rechaza una contraseña de menos de 8 caracteres', () => {
		expect(() => validateSignUpInput(baseInput({ password: '1234567' }))).toThrow(AuthError);
	});

	it('rechaza si no se aceptan las condiciones', () => {
		expect(() => validateSignUpInput(baseInput({ acceptedTerms: false }))).toThrow(AuthError);
	});

	it('rechaza si no se acepta la política de privacidad', () => {
		expect(() => validateSignUpInput(baseInput({ acceptedPrivacy: false }))).toThrow(AuthError);
	});

	it('rechaza si no se acepta la declaración de uso pacífico', () => {
		expect(() => validateSignUpInput(baseInput({ acceptedPeacefulUse: false }))).toThrow(AuthError);
	});
});

function baseProfile(overrides: Partial<OrganizerPrivateProfile> = {}): OrganizerPrivateProfile {
	return {
		organizerId: 'org-1',
		userId: 'user-1',
		acceptedTermsAt: '2026-07-31T00:00:00.000Z',
		acceptedPrivacyAt: '2026-07-31T00:00:00.000Z',
		acceptedPeacefulUseAt: '2026-07-31T00:00:00.000Z',
		acceptedTermsVersion: LEGAL_VERSIONS.terms,
		acceptedPrivacyVersion: LEGAL_VERSIONS.privacy,
		acceptedPeacefulUseVersion: LEGAL_VERSIONS.peacefulUse,
		...overrides
	};
}

describe('hasCompletedLegalAcceptance — gate antes de crear la primera convocatoria', () => {
	it('sin perfil (undefined) se trata como pendiente', () => {
		expect(hasCompletedLegalAcceptance(undefined)).toBe(false);
	});

	it('con las tres aceptaciones en la versión vigente, está completo', () => {
		expect(hasCompletedLegalAcceptance(baseProfile())).toBe(true);
	});

	it('falta accepted_privacy_at (p. ej. altas por Google) -> pendiente', () => {
		expect(hasCompletedLegalAcceptance(baseProfile({ acceptedPrivacyAt: '' }))).toBe(false);
	});

	it('la versión aceptada no coincide con la vigente -> pendiente aunque haya fecha', () => {
		expect(hasCompletedLegalAcceptance(baseProfile({ acceptedTermsVersion: '2020-01-01' }))).toBe(
			false
		);
	});
});

describe('mapSignUpError — traductor de errores de REGISTRO', () => {
	it('límite de envío de correo -> mensaje de "demasiados correos", nunca el de credenciales', () => {
		const mapped = mapSignUpError({ message: '429: email rate limit exceeded' });
		expect(mapped.message).toMatch(/demasiados correos/i);
		expect(mapped.message).not.toMatch(/correo o contraseña incorrectos/i);
	});

	it('correo ya registrado -> mensaje adecuado con sugerencia de acción', () => {
		const mapped = mapSignUpError({ message: 'User already registered' });
		expect(mapped.message).toMatch(/ya existe una cuenta/i);
	});

	it('correo con formato inválido -> error de campo "email"', () => {
		const mapped = mapSignUpError({ message: 'Email address "x" is invalid' });
		expect(mapped.field).toBe('email');
	});

	it('contraseña débil -> error de campo "password" con el requisito explicado', () => {
		const mapped = mapSignUpError({ message: 'Password should be at least 8 characters' });
		expect(mapped.field).toBe('password');
		expect(mapped.message).toMatch(/8 caracteres/);
	});

	it('fallo de red -> mensaje de conexión, no de credenciales', () => {
		const mapped = mapSignUpError({ message: 'Failed to fetch' });
		expect(mapped.message).toMatch(/conectar/i);
	});

	it('caso por defecto -> mensaje genérico de registro, JAMÁS "correo o contraseña incorrectos"', () => {
		const mapped = mapSignUpError({ message: 'algo_completamente_inesperado' });
		expect(mapped.message).not.toMatch(/correo o contraseña incorrectos/i);
	});
});

describe('mapSignInError — traductor de errores de LOGIN', () => {
	it('credenciales inválidas -> "Correo o contraseña incorrectos." (aquí SÍ es el mensaje correcto)', () => {
		const mapped = mapSignInError({ message: 'Invalid login credentials' });
		expect(mapped.message).toBe('Correo o contraseña incorrectos.');
	});

	it('correo sin confirmar -> mensaje distinto al de credenciales', () => {
		const mapped = mapSignInError({ message: 'Email not confirmed' });
		expect(mapped.message).toMatch(/confirma tu correo/i);
	});

	it('límite de intentos -> mensaje de límite, no de credenciales', () => {
		const mapped = mapSignInError({ message: 'email rate limit exceeded' });
		expect(mapped.message).toMatch(/demasiados intentos/i);
	});

	it('fallo de red -> mensaje de conexión', () => {
		const mapped = mapSignInError({ message: 'Failed to fetch' });
		expect(mapped.message).toMatch(/conectar/i);
	});
});

describe('authService.signUp — orquestación real', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('con confirmación de correo activa (data.session null) devuelve null y NUNCA intenta signInWithPassword', async () => {
		vi.mocked(supabase.auth.signUp).mockResolvedValue({
			data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: null },
			error: null
		} as never);

		const result = await authService.signUp(
			baseInput({ email: 'pendiente-confirmar@example.org' })
		);

		expect(result).toBeNull();
		expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
	});

	it('con sesión inmediata, devuelve la sesión construida a partir del usuario', async () => {
		vi.mocked(supabase.auth.signUp).mockResolvedValue({
			data: {
				user: { id: 'u2', identities: [{ id: 'i2' }] },
				session: {
					user: {
						id: 'u2',
						email: 'confirmada@example.org',
						email_confirmed_at: '2026-01-01T00:00:00Z',
						created_at: '2026-01-01T00:00:00Z'
					},
					access_token: 'tok-123',
					expires_at: 9999999999
				}
			},
			error: null
		} as never);

		const result = await authService.signUp(baseInput({ email: 'confirmada@example.org' }));

		expect(result?.user.email).toBe('confirmada@example.org');
		expect(result?.token).toBe('tok-123');
	});

	it('correo ya registrado (sin error, identities vacío) lanza AuthError con el mensaje adecuado', async () => {
		vi.mocked(supabase.auth.signUp).mockResolvedValue({
			data: { user: { id: 'u3', identities: [] }, session: null },
			error: null
		} as never);

		await expect(
			authService.signUp(baseInput({ email: 'existente@example.org' }))
		).rejects.toMatchObject({
			message: expect.stringMatching(/ya existe una cuenta/i)
		});
	});

	it('un error genérico durante el registro (p. ej. límite de correo) nunca muestra el mensaje de login', async () => {
		vi.mocked(supabase.auth.signUp).mockResolvedValue({
			data: { user: null, session: null },
			error: { message: 'email rate limit exceeded' }
		} as never);

		const err = await authService
			.signUp(baseInput({ email: 'otra@example.org' }))
			.catch((e) => e as AuthError);

		expect(err).toBeInstanceOf(AuthError);
		expect((err as AuthError).message).not.toMatch(/correo o contraseña incorrectos/i);
	});

	it('fallo de red (excepción del cliente) se traduce a un mensaje de conexión, nunca de credenciales', async () => {
		vi.mocked(supabase.auth.signUp).mockRejectedValue(new TypeError('Failed to fetch'));

		const err = await authService
			.signUp(baseInput({ email: 'red-caida@example.org' }))
			.catch((e) => e as AuthError);

		expect(err).toBeInstanceOf(AuthError);
		expect((err as AuthError).message).toMatch(/conectar/i);
	});

	it('doble pulsación del botón: dos llamadas simultáneas para el mismo correo solo disparan una petición real', async () => {
		let resolveSignUp!: (value: unknown) => void;
		const pending = new Promise((resolve) => {
			resolveSignUp = resolve;
		});
		vi.mocked(supabase.auth.signUp).mockReturnValue(pending as never);

		const email = 'doble-envio@example.org';
		const call1 = authService.signUp(baseInput({ email }));
		const call2 = authService.signUp(baseInput({ email }));

		resolveSignUp({
			data: { user: { id: 'u4', identities: [{ id: 'i4' }] }, session: null },
			error: null
		});

		const [result1, result2] = await Promise.all([call1, call2]);

		expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
		expect(result1).toBeNull();
		expect(result2).toBeNull();
	});
});

describe('authService.signInWithPassword — orquestación real', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('credenciales incorrectas muestra el mensaje de login (aquí sí es el caso correcto)', async () => {
		vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
			data: { session: null },
			error: { message: 'Invalid login credentials' }
		} as never);

		const err = await authService
			.signInWithPassword({ email: 'x@example.org', password: 'mal', rememberSession: true })
			.catch((e) => e as AuthError);

		expect(err).toBeInstanceOf(AuthError);
		expect((err as AuthError).message).toBe('Correo o contraseña incorrectos.');
	});

	it('fallo de red en login también se traduce a mensaje de conexión', async () => {
		vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(new TypeError('Failed to fetch'));

		const err = await authService
			.signInWithPassword({ email: 'x@example.org', password: 'algo', rememberSession: true })
			.catch((e) => e as AuthError);

		expect(err).toBeInstanceOf(AuthError);
		expect((err as AuthError).message).toMatch(/conectar/i);
	});
});

describe('authService.signInWithGoogle — scopes mínimos, sin acceso a Google', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('pide el proveedor "google" con los scopes mínimos openid/email/profile', async () => {
		await authService.signInWithGoogle('/crear');

		expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: 'google',
				options: expect.objectContaining({ scopes: 'openid email profile' })
			})
		);
	});

	it('NUNCA pide access_type=offline ni prompt=consent (eso emitiría un provider_refresh_token que Convoca no debe guardar)', async () => {
		await authService.signInWithGoogle('/crear');

		const call = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0];
		expect(call.options?.queryParams).toBeUndefined();
	});

	it('propaga el destino como parte de redirectTo, nunca como una URL externa arbitraria', async () => {
		await authService.signInWithGoogle('/crear');

		const call = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0];
		expect(call.options?.redirectTo).toContain('/auth/callback');
		expect(call.options?.redirectTo).toContain(encodeURIComponent('/crear'));
	});

	it('si Supabase devuelve error, lanza AuthError en vez de dejarlo pasar en silencio', async () => {
		vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
			data: { url: null, provider: 'google' },
			error: { message: 'algo falló' }
		} as never);

		await expect(authService.signInWithGoogle('/crear')).rejects.toBeInstanceOf(AuthError);
	});
});
