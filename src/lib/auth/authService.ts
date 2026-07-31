import { browser } from '$app/environment';
import type {
	AuthService,
	User,
	UserSession,
	UserRole,
	SignUpInput,
	SignInInput,
	OrganizerPrivateProfile
} from './types';
import { AuthError } from './types';
import { supabase, setSessionScope } from '$lib/supabase/client';
import { ENABLE_PASSWORD_AUTH } from '$lib/config/env';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

/**
 * Defensa en profundidad para la beta (Google como único método público):
 * `PUBLIC_AUTH_PASSWORD_ENABLED=false` no solo oculta el formulario en la
 * interfaz — estas cuatro operaciones lo comprueban ellas mismas, así que
 * ni manipulando el DOM para revelar un formulario oculto se puede
 * completar un registro o inicio de sesión por contraseña. `signOut`,
 * `signInWithGoogle`, `updateDisplayName` y `deleteAccount` no dependen de
 * este interruptor: no son específicos de la autenticación por contraseña.
 */
function assertPasswordAuthEnabled(): void {
	if (!ENABLE_PASSWORD_AUTH) {
		throw new AuthError('El acceso con correo y contraseña no está disponible en este momento.');
	}
}

/**
 * Servicio de autenticación real sobre Supabase Auth.
 *
 * Implementa la misma interfaz `AuthService` que antes cubría el mock de
 * `localStorage` (ver `./types.ts`): ningún componente ni pantalla necesita
 * cambiar, solo este archivo. El rol y el organizador vinculado NUNCA se
 * leen de metadatos que el propio cliente pueda escribir — se consultan en
 * `public.profiles` / `public.organizers`, protegidas por RLS, que es la
 * única fuente de verdad (ver `supabase/migrations/0001_extensions_and_helpers.sql`
 * y `0007_new_user_trigger.sql`).
 */

async function fetchRole(userId: string): Promise<UserRole> {
	const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
	return (data?.role as UserRole | undefined) ?? 'organizer';
}

async function fetchOrganizerId(userId: string): Promise<string | undefined> {
	const { data } = await supabase
		.from('organizers')
		.select('id')
		.eq('created_by', userId)
		.maybeSingle();
	return data?.id;
}

async function buildSession(supabaseSession: SupabaseSession): Promise<UserSession> {
	const supaUser = supabaseSession.user;
	const [role, organizerId] = await Promise.all([
		fetchRole(supaUser.id),
		fetchOrganizerId(supaUser.id)
	]);

	const user: User = {
		id: supaUser.id,
		email: supaUser.email ?? '',
		role,
		emailVerified: Boolean(supaUser.email_confirmed_at),
		organizerId,
		createdAt: supaUser.created_at
	};

	return {
		user,
		token: supabaseSession.access_token,
		expiresAt: new Date((supabaseSession.expires_at ?? 0) * 1000).toISOString(),
		remembered: true
	};
}

function redirectOrigin(): string | undefined {
	return browser ? window.location.origin : undefined;
}

async function getSession(): Promise<UserSession | null> {
	const { data } = await supabase.auth.getSession();
	if (!data.session) return null;
	return buildSession(data.session);
}

function onAuthStateChange(callback: (session: UserSession | null) => void): () => void {
	const { data } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
		if (!supabaseSession) {
			callback(null);
			return;
		}
		buildSession(supabaseSession).then(callback);
	});
	return () => data.subscription.unsubscribe();
}

export function validateSignUpInput(input: SignUpInput): void {
	const email = input.email.trim();
	if (!email || !email.includes('@'))
		throw new AuthError('Introduce un correo electrónico válido.', 'email');
	if (!input.displayName.trim()) throw new AuthError('Indica el nombre público del organizador.');
	if (input.password.length < 8)
		throw new AuthError('La contraseña debe tener al menos 8 caracteres.', 'password');
	if (!input.acceptedTerms || !input.acceptedPeacefulUse) {
		throw new AuthError('Debes aceptar las condiciones y la declaración de uso pacífico.');
	}
}

export interface MappedAuthError {
	message: string;
	field?: 'email' | 'password';
}

const NETWORK_ERROR_RE = /failed to fetch|network|fetch failed|econnrefused|load failed/i;
const RATE_LIMIT_RE = /rate limit/i;

/**
 * Traductor de errores del REGISTRO. A propósito NUNCA devuelve el mensaje
 * de credenciales de /login (bug real corregido: antes ambos flujos
 * compartían un único `mapAuthError` cuyo caso por defecto era el mensaje
 * de login — un 429 de límite de envío de correos durante el registro
 * caía en ese `default` y mostraba "Correo o contraseña incorrectos",
 * que no tiene ningún sentido al crear una cuenta).
 */
export function mapSignUpError(error: { message: string }): MappedAuthError {
	const message = error.message ?? '';

	if (/already registered|already exists|user already/i.test(message)) {
		return {
			message:
				'Ya existe una cuenta con ese correo electrónico. Inicia sesión o recupera tu contraseña.'
		};
	}
	if (RATE_LIMIT_RE.test(message)) {
		return {
			message:
				'Se han enviado demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentarlo.'
		};
	}
	if (/email.*invalid|invalid.*email|unable to validate email/i.test(message)) {
		return { message: 'Este correo electrónico no es válido.', field: 'email' };
	}
	if (/password/i.test(message)) {
		if (/least 8|8 characters|minimum.*8|should be at least/i.test(message)) {
			return { message: 'La contraseña debe tener al menos 8 caracteres.', field: 'password' };
		}
		return {
			message:
				'La contraseña no cumple los requisitos de seguridad. Prueba con una más larga o con más variedad de caracteres.',
			field: 'password'
		};
	}
	if (NETWORK_ERROR_RE.test(message)) {
		return { message: 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.' };
	}
	return { message: 'No se ha podido crear la cuenta. Inténtalo de nuevo en unos minutos.' };
}

/**
 * Traductor de errores del INICIO DE SESIÓN. El mensaje genérico de
 * "Correo o contraseña incorrectos" vive EXCLUSIVAMENTE aquí, como caso por
 * defecto de un fallo real de `signInWithPassword` — nunca en el registro.
 */
export function mapSignInError(error: { message: string }): MappedAuthError {
	const message = error.message ?? '';

	if (/email not confirmed/i.test(message)) {
		return {
			message:
				'Confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.'
		};
	}
	if (RATE_LIMIT_RE.test(message)) {
		return { message: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' };
	}
	if (NETWORK_ERROR_RE.test(message)) {
		return { message: 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.' };
	}
	return { message: 'Correo o contraseña incorrectos.' };
}

/**
 * Deduplica llamadas a signUp() en vuelo para el mismo correo: si el botón
 * se pulsa dos veces seguidas (doble toque, doble clic antes de que el
 * `disabled` del botón se refleje), la segunda llamada reutiliza la misma
 * petición en curso en vez de disparar un segundo signUp real contra
 * Supabase — evita gastar cuota de envío de correo o crear datos
 * duplicados por una carrera de eventos del navegador.
 */
const inFlightSignUps = new Map<string, Promise<UserSession | null>>();

/**
 * `null` significa: cuenta creada, pero Supabase exige confirmar el correo
 * antes de dar sesión activa (comportamiento por defecto del proyecto). La
 * pantalla de registro debe mostrar un aviso de "revisa tu correo" en ese
 * caso, no tratarlo como un fallo.
 */
async function signUp(input: SignUpInput): Promise<UserSession | null> {
	assertPasswordAuthEnabled();
	validateSignUpInput(input);
	const email = input.email.trim().toLowerCase();

	const existing = inFlightSignUps.get(email);
	if (existing) return existing;

	const promise = performSignUp(input, email).finally(() => {
		inFlightSignUps.delete(email);
	});
	inFlightSignUps.set(email, promise);
	return promise;
}

async function performSignUp(input: SignUpInput, email: string): Promise<UserSession | null> {
	setSessionScope(true);

	let result: Awaited<ReturnType<typeof supabase.auth.signUp>>;
	try {
		result = await supabase.auth.signUp({
			email,
			password: input.password,
			options: {
				data: {
					display_name: input.displayName.trim(),
					organizer_kind: input.organizerKind,
					organization_name: input.organizationName?.trim() || undefined,
					accepted_terms: input.acceptedTerms,
					accepted_peaceful_use: input.acceptedPeacefulUse
				},
				emailRedirectTo: redirectOrigin() ? `${redirectOrigin()}/login` : undefined
			}
		});
	} catch (err) {
		const mapped = mapSignUpError({ message: err instanceof Error ? err.message : String(err) });
		throw new AuthError(mapped.message, mapped.field);
	}

	const { data, error } = result;

	if (error) {
		const mapped = mapSignUpError(error);
		throw new AuthError(mapped.message, mapped.field);
	}

	// Cuando el correo ya pertenece a una cuenta CONFIRMADA, Supabase no
	// devuelve un `error` (para no revelar por mensaje de error si el
	// correo existe): en su lugar responde 200 con un `user` cuyo array
	// `identities` viene vacío. Es la única forma documentada de detectar
	// "correo ya registrado" en ese caso — sin esto, se mostraría la
	// pantalla de "revisa tu correo" para una cuenta que ya existe.
	if (data.user && data.user.identities && data.user.identities.length === 0) {
		throw new AuthError(
			'Ya existe una cuenta con ese correo electrónico. Inicia sesión o recupera tu contraseña.'
		);
	}

	if (!data.session) return null;
	return buildSession(data.session);
}

async function signInWithPassword(input: SignInInput): Promise<UserSession> {
	assertPasswordAuthEnabled();
	setSessionScope(input.rememberSession);

	let result: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
	try {
		result = await supabase.auth.signInWithPassword({
			email: input.email.trim().toLowerCase(),
			password: input.password
		});
	} catch (err) {
		const mapped = mapSignInError({ message: err instanceof Error ? err.message : String(err) });
		throw new AuthError(mapped.message, mapped.field);
	}

	const { data, error } = result;
	if (error || !data.session) {
		const mapped = mapSignInError({ message: error?.message ?? '' });
		throw new AuthError(mapped.message, mapped.field);
	}
	return buildSession(data.session);
}

/** Reenvía el correo de confirmación de registro (p. ej. si el primero no llegó, expiró, o cayó en spam). */
async function resendSignUpConfirmation(email: string): Promise<void> {
	assertPasswordAuthEnabled();
	const { error } = await supabase.auth.resend({
		type: 'signup',
		email: email.trim().toLowerCase(),
		options: {
			emailRedirectTo: redirectOrigin() ? `${redirectOrigin()}/login` : undefined
		}
	});
	if (error) {
		const mapped = mapSignUpError(error);
		throw new AuthError(mapped.message, mapped.field);
	}
}

/**
 * Inicia "Continuar con Google". Redirige la pestaña entera a Google — no
 * hay sesión que devolver aquí; el flujo se completa en `/auth/callback`
 * (PKCE: `detectSessionInUrl` intercambia el `code` automáticamente al
 * cargar esa página). Un error aquí solo puede significar que ni siquiera
 * se pudo iniciar la redirección (p. ej. sin red).
 *
 * Solo se piden los scopes mínimos (`openid email profile`) y NUNCA
 * `access_type: 'offline'` ni `prompt: 'consent'`: esos parámetros son
 * justamente los que hacen que Google emita un `provider_refresh_token`
 * para acceder a servicios de Google en nombre de la persona — Convoca no
 * necesita ni quiere ese acceso, solo identificar la cuenta.
 */
async function signInWithGoogle(redirectTo: string): Promise<void> {
	setSessionScope(true);
	const origin = redirectOrigin();
	const callbackUrl = origin
		? `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
		: undefined;

	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: callbackUrl,
			scopes: 'openid email profile'
		}
	});
	if (error) {
		throw new AuthError('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.');
	}
}

async function signOut(): Promise<void> {
	await supabase.auth.signOut();
}

async function resetPasswordForEmail(email: string): Promise<void> {
	assertPasswordAuthEnabled();
	// Se resuelve igual exista o no la cuenta (Supabase no distingue en la
	// respuesta): no se filtra qué correos están registrados.
	await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
		redirectTo: redirectOrigin() ? `${redirectOrigin()}/recuperar-cuenta` : undefined
	});
}

async function updateDisplayName(displayName: string, organizationName?: string): Promise<void> {
	const { data } = await supabase.auth.getUser();
	const userId = data.user?.id;
	if (!userId) throw new AuthError('No has iniciado sesión.');

	const { data: organizer, error: organizerError } = await supabase
		.from('organizers')
		.update({ display_name: displayName.trim() })
		.eq('created_by', userId)
		.select('id')
		.maybeSingle();
	if (organizerError) throw new AuthError('No se han podido guardar los cambios.');

	if (organizer?.id) {
		await supabase
			.from('organizer_private_profiles')
			.update({ legal_organization_name: organizationName?.trim() || null })
			.eq('organizer_id', organizer.id);
	}
}

/**
 * Autoeliminación real de cuenta: requiere `auth.admin.deleteUser`, que solo
 * puede ejecutarse con la `service_role key` — esa clave NUNCA debe existir
 * en el navegador. Por eso esto llama a la Edge Function `delete-account`
 * (`supabase/functions/delete-account`), que sí la usa, pero solo en el
 * servidor, autenticando al llamante por su propio JWT.
 */
async function deleteAccount(): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return;

	const { error } = await supabase.functions.invoke('delete-account', {
		method: 'POST'
	});
	if (error) {
		throw new AuthError(
			'No se ha podido eliminar la cuenta. Si tienes convocatorias creadas, cancélalas o transfiérelas antes de eliminar la cuenta.'
		);
	}
	await supabase.auth.signOut();
}

export const authService: AuthService = {
	getSession,
	onAuthStateChange,
	signUp,
	signInWithPassword,
	signInWithGoogle,
	signOut,
	resetPasswordForEmail,
	resendSignUpConfirmation,
	updateDisplayName,
	deleteAccount
};

/**
 * Fuera de `AuthService` a propósito: no es una operación de autenticación,
 * sino una lectura del perfil privado del organizador (tabla
 * `organizer_private_profiles`, protegida por RLS).
 */
export async function getMyOrganizerPrivateProfile(
	userId: string
): Promise<OrganizerPrivateProfile | undefined> {
	const { data } = await supabase
		.from('organizer_private_profiles')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle();
	if (!data) return undefined;
	return {
		organizerId: data.organizer_id,
		userId: data.user_id,
		legalOrganizationName: data.legal_organization_name ?? undefined,
		acceptedTermsAt: data.accepted_terms_at ?? '',
		acceptedPeacefulUseAt: data.accepted_peaceful_use_at ?? ''
	};
}
