import type { OrganizerKind } from '$lib/types';

/**
 * Tipos del subsistema de autenticación.
 *
 * `authService.ts` implementa `AuthService` sobre Supabase Auth
 * (`supabase.auth.signUp`, `signInWithPassword`, `signOut`,
 * `resetPasswordForEmail`, `getSession`, `onAuthStateChange`). Ningún
 * componente ni pantalla depende de Supabase directamente: todos dependen
 * de esta interfaz.
 */

export type UserRole = 'organizer' | 'moderator' | 'admin';

/**
 * Cuenta de usuario, sin ningún dato sensible (nunca incluye contraseña ni
 * su hash). Es lo único que se expone fuera de `authService.ts`.
 */
export interface User {
	id: string;
	email: string;
	role: UserRole;
	emailVerified: boolean;
	/** Id del perfil público de organizador vinculado a esta cuenta (rol `organizer`). */
	organizerId?: string;
	createdAt: string;
}

export interface UserSession {
	user: User;
	/** Access token JWT de la sesión de Supabase Auth. */
	token: string;
	expiresAt: string;
	/** Si la persona marcó "recordar sesión" (persistida en localStorage) o no (solo dura la pestaña, sessionStorage). */
	remembered: boolean;
}

/**
 * Datos privados de la cuenta de un organizador — nunca deben aparecer en
 * `Organizer` (el perfil público) ni en ningún objeto público de convocatoria.
 * Separado a propósito de `OrganizerPublicProfile` (= `Organizer` en `$lib/types`).
 */
export interface OrganizerPrivateProfile {
	organizerId: string;
	userId: string;
	/** Nombre legal de la organización, cuando el tipo de organizador lo requiere. */
	legalOrganizationName?: string;
	acceptedTermsAt: string;
	acceptedPrivacyAt: string;
	acceptedPeacefulUseAt: string;
	/** Versión de cada texto legal aceptada (ver `$lib/legal/versions.ts`). Vacío = nunca aceptado. */
	acceptedTermsVersion: string;
	acceptedPrivacyVersion: string;
	acceptedPeacefulUseVersion: string;
}

export interface SignUpInput {
	email: string;
	password: string;
	displayName: string;
	organizerKind: OrganizerKind;
	organizationName?: string;
	acceptedTerms: boolean;
	acceptedPrivacy: boolean;
	acceptedPeacefulUse: boolean;
}

export interface SignInInput {
	email: string;
	password: string;
	rememberSession: boolean;
}

/**
 * `field`, cuando está presente, indica que el mensaje pertenece a un campo
 * concreto del formulario (para mostrarlo junto a ese campo, con
 * `FieldError`, en vez de en un banner genérico arriba del todo).
 */
export class AuthError extends Error {
	field?: 'email' | 'password';
	constructor(message: string, field?: 'email' | 'password') {
		super(message);
		this.field = field;
	}
}

/**
 * Contrato del servicio de autenticación. `authService.ts` lo implementa
 * sobre `@supabase/supabase-js`.
 */
export interface AuthService {
	getSession(): Promise<UserSession | null>;
	/** Se notifica en cada login/logout/registro, incluido entre pestañas. */
	onAuthStateChange(callback: (session: UserSession | null) => void): () => void;
	/** `null` = cuenta creada pero pendiente de confirmación de correo (sin sesión activa todavía). */
	signUp(input: SignUpInput): Promise<UserSession | null>;
	signInWithPassword(input: SignInInput): Promise<UserSession>;
	/**
	 * Inicia el flujo de "Continuar con Google" (redirección de página
	 * completa, PKCE). `redirectTo` es la ruta interna de Convoca a la que
	 * volver tras `/auth/callback` — nunca una URL absoluta arbitraria.
	 */
	signInWithGoogle(redirectTo: string): Promise<void>;
	signOut(): Promise<void>;
	resetPasswordForEmail(email: string): Promise<void>;
	/** Reenvía el correo de confirmación de registro (p. ej. si el primero no llegó o expiró). */
	resendSignUpConfirmation(email: string): Promise<void>;
	updateDisplayName(displayName: string, organizationName?: string): Promise<void>;
	/** Borra la cuenta y su perfil de organizador. Nunca borra convocatorias de otras cuentas. */
	deleteAccount(): Promise<void>;
}
