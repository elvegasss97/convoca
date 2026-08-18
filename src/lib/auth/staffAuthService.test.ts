import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Mock de Supabase y de `authService.getSession()` (se mockea aparte
 * porque `staffAuthService.ts` la reutiliza tal cual, en vez de volver a
 * consultar `profiles` a mano). `vi.hoisted` porque `vi.mock` se eleva
 * por encima de los imports — mismo patrón que `authService.test.ts`.
 */
const { authMocks, getSessionMock, fromMock } = vi.hoisted(() => {
	interface Factor {
		id: string;
		factor_type: string;
		status: string;
	}

	const authMocks = {
		signInWithPassword: vi.fn(async () => ({
			data: { session: {} as Record<string, unknown> | null },
			error: null as { message: string } | null
		})),
		signOut: vi.fn(async () => ({ error: null })),
		getUser: vi.fn(async () => ({
			data: {
				user: { user_metadata: {} as Record<string, unknown> } as {
					user_metadata: Record<string, unknown>;
				} | null
			},
			error: null
		})),
		updateUser: vi.fn(async () => ({
			data: {} as Record<string, unknown> | null,
			error: null as { message: string } | null
		})),
		mfa: {
			getAuthenticatorAssuranceLevel: vi.fn(async () => ({
				data: { currentLevel: 'aal1' as string | null, nextLevel: 'aal1' as string | null },
				error: null as { message: string } | null
			})),
			enroll: vi.fn(async () => ({
				data: {
					id: 'factor-1',
					totp: { qr_code: '<svg/>', secret: 'SECRET123', uri: 'otpauth://x' }
				},
				error: null as { message: string } | null
			})),
			challengeAndVerify: vi.fn(async () => ({
				data: {} as Record<string, unknown> | null,
				error: null as { message: string } | null
			})),
			listFactors: vi.fn(async () => ({
				data: { all: [] as Factor[], totp: [] as { id: string }[] },
				error: null
			})),
			unenroll: vi.fn(async () => ({ data: {}, error: null }))
		}
	};
	const getSessionMock = vi.fn(async () => null as { user: { id: string; role: string } } | null);
	const fromMock = vi.fn();
	return { authMocks, getSessionMock, fromMock };
});

vi.mock('$lib/supabase/client', () => ({
	supabase: { auth: authMocks, from: fromMock }
}));

vi.mock('./authService', () => ({
	authService: { getSession: getSessionMock }
}));

import {
	changeStaffPassword,
	currentStaffAccessStep,
	enrollTotp,
	getVerifiedTotpFactorId,
	signInStaff,
	verifyTotpCode,
	STAFF_ACCESS_DENIED_MESSAGE
} from './staffAuthService';

beforeEach(() => {
	vi.clearAllMocks();
	authMocks.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
	authMocks.getUser.mockResolvedValue({ data: { user: { user_metadata: {} } }, error: null });
	authMocks.updateUser.mockResolvedValue({ data: {}, error: null });
	authMocks.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
		data: { currentLevel: 'aal1', nextLevel: 'aal1' },
		error: null
	});
	authMocks.mfa.listFactors.mockResolvedValue({ data: { all: [], totp: [] }, error: null });
	getSessionMock.mockResolvedValue(null);
});

describe('currentStaffAccessStep', () => {
	it('not-staff si no hay sesión', async () => {
		getSessionMock.mockResolvedValue(null);
		expect(await currentStaffAccessStep()).toBe('not-staff');
	});

	it('not-staff si la sesión es de un organizer', async () => {
		getSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'organizer' } });
		expect(await currentStaffAccessStep()).toBe('not-staff');
	});

	it('change-password si la cuenta tiene una contraseña temporal pendiente, antes incluso de mirar el MFA', async () => {
		getSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
		authMocks.getUser.mockResolvedValue({
			data: { user: { user_metadata: { must_change_password: true } } },
			error: null
		});
		expect(await currentStaffAccessStep()).toBe('change-password');
		expect(authMocks.mfa.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
	});

	it('deriva el paso a partir del AAL para una sesión de staff sin contraseña pendiente', async () => {
		getSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'moderator' } });
		authMocks.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
			data: { currentLevel: 'aal2', nextLevel: 'aal2' },
			error: null
		});
		expect(await currentStaffAccessStep()).toBe('proceed');
	});
});

describe('signInStaff', () => {
	it('mensaje genérico si las credenciales son incorrectas — nunca revela el motivo', async () => {
		authMocks.signInWithPassword.mockResolvedValue({
			data: { session: null },
			error: { message: 'Invalid login credentials' }
		});
		await expect(signInStaff('x@test.local', 'bad')).rejects.toThrow(STAFF_ACCESS_DENIED_MESSAGE);
		expect(authMocks.signOut).not.toHaveBeenCalled();
	});

	it('mismo mensaje genérico si las credenciales son correctas pero el rol no es de staff, y cierra sesión', async () => {
		getSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'organizer' } });
		await expect(signInStaff('x@test.local', 'good')).rejects.toThrow(STAFF_ACCESS_DENIED_MESSAGE);
		expect(authMocks.signOut).toHaveBeenCalledTimes(1);
	});

	it('devuelve el paso de MFA correspondiente si el rol es de staff', async () => {
		getSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
		authMocks.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
			data: { currentLevel: 'aal1', nextLevel: 'aal2' },
			error: null
		});
		await expect(signInStaff('x@test.local', 'good')).resolves.toBe('verify');
		expect(authMocks.signOut).not.toHaveBeenCalled();
	});
});

describe('enrollTotp', () => {
	it('da de baja los factores TOTP sin verificar antes de inscribir uno nuevo', async () => {
		authMocks.mfa.listFactors.mockResolvedValue({
			data: {
				all: [
					{ id: 'stale-1', factor_type: 'totp', status: 'unverified' },
					{ id: 'verified-1', factor_type: 'totp', status: 'verified' },
					{ id: 'phone-1', factor_type: 'phone', status: 'unverified' }
				],
				totp: []
			},
			error: null
		});
		await enrollTotp();
		expect(authMocks.mfa.unenroll).toHaveBeenCalledTimes(1);
		expect(authMocks.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'stale-1' });
	});

	it('devuelve el factorId/QR/secreto de la inscripción', async () => {
		const result = await enrollTotp();
		expect(result).toEqual({ factorId: 'factor-1', qrCodeSvg: '<svg/>', secret: 'SECRET123' });
	});
});

describe('verifyTotpCode', () => {
	it('recorta espacios del código antes de enviarlo', async () => {
		await verifyTotpCode('factor-1', '  123456  ');
		expect(authMocks.mfa.challengeAndVerify).toHaveBeenCalledWith({
			factorId: 'factor-1',
			code: '123456'
		});
	});

	it('lanza un mensaje legible si el código es incorrecto', async () => {
		authMocks.mfa.challengeAndVerify.mockResolvedValue({
			data: null,
			error: { message: 'Invalid TOTP code' }
		});
		await expect(verifyTotpCode('factor-1', '000000')).rejects.toThrow(
			'Código incorrecto o caducado.'
		);
	});
});

describe('getVerifiedTotpFactorId', () => {
	it('devuelve el id del primer factor TOTP verificado', async () => {
		authMocks.mfa.listFactors.mockResolvedValue({
			data: { all: [], totp: [{ id: 'verified-1' }] },
			error: null
		});
		expect(await getVerifiedTotpFactorId()).toBe('verified-1');
	});

	it('undefined si no hay ningún factor verificado', async () => {
		authMocks.mfa.listFactors.mockResolvedValue({ data: { all: [], totp: [] }, error: null });
		expect(await getVerifiedTotpFactorId()).toBeUndefined();
	});
});

describe('changeStaffPassword', () => {
	it('envía la nueva contraseña y borra el marcador de contraseña temporal', async () => {
		await changeStaffPassword('nueva-contrasena-larga');
		expect(authMocks.updateUser).toHaveBeenCalledWith({
			password: 'nueva-contrasena-larga',
			data: { must_change_password: false }
		});
	});

	it('lanza un mensaje legible si Supabase rechaza la actualización', async () => {
		authMocks.updateUser.mockResolvedValue({ data: null, error: { message: 'weak password' } });
		await expect(changeStaffPassword('123')).rejects.toThrow(
			'No se ha podido actualizar la contraseña. Inténtalo de nuevo.'
		);
	});
});
