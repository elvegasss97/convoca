import type { OrganizerKind } from '$lib/types';

/**
 * Tipos del subsistema de autenticación.
 *
 * ⚠️ IMPORTANTE — ESTO ES UN MOCK, NO SEGURIDAD REAL ⚠️
 * Toda la implementación detrás de estos tipos (`authService.ts`) vive
 * enteramente en el navegador: usuarios, sesión y "hash" de contraseña se
 * guardan en `localStorage`. Cualquier persona con acceso a las
 * herramientas de desarrollador del navegador puede leer, falsificar o
 * eliminar esos datos. No aporta ninguna garantía de seguridad real y
 * NUNCA debe usarse en producción.
 *
 * Estos tipos y la forma de `AuthService` están deliberadamente alineados
 * con la API de Supabase Auth (`supabase.auth.signUp`,
 * `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `getSession`,
 * `onAuthStateChange`) para que sustituir `authService.ts` por un cliente
 * real de Supabase no requiera cambiar ningún componente ni pantalla.
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
	/** Siempre `false` en el mock: no hay envío real de correo de verificación. */
	emailVerified: boolean;
	/** Id del perfil público de organizador vinculado a esta cuenta (rol `organizer`). */
	organizerId?: string;
	createdAt: string;
}

export interface UserSession {
	user: User;
	/**
	 * Token opaco de esta sesión local. No es un JWT real y no debe tratarse
	 * como una credencial: solo identifica la sesión guardada en este
	 * navegador para este prototipo.
	 */
	token: string;
	expiresAt: string;
	/** Si la persona marcó "recordar sesión" (sesión de larga duración) o no (expira antes). */
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
	acceptedPeacefulUseAt: string;
}

export interface SignUpInput {
	email: string;
	password: string;
	displayName: string;
	organizerKind: OrganizerKind;
	organizationName?: string;
	acceptedTerms: boolean;
	acceptedPeacefulUse: boolean;
}

export interface SignInInput {
	email: string;
	password: string;
	rememberSession: boolean;
}

export class AuthError extends Error {}

/**
 * Contrato del servicio de autenticación. `authService.ts` lo implementa
 * con localStorage; un futuro `supabaseAuthService.ts` lo implementará con
 * `@supabase/supabase-js` sin que cambie ni una línea fuera de ese archivo.
 */
export interface AuthService {
	getSession(): Promise<UserSession | null>;
	/** Se notifica en cada login/logout/registro, incluido entre pestañas. */
	onAuthStateChange(callback: (session: UserSession | null) => void): () => void;
	signUp(input: SignUpInput): Promise<UserSession>;
	signInWithPassword(input: SignInInput): Promise<UserSession>;
	signOut(): Promise<void>;
	resetPasswordForEmail(email: string): Promise<void>;
	updateDisplayName(displayName: string, organizationName?: string): Promise<void>;
	/** Borra la cuenta y su perfil de organizador. Nunca borra convocatorias de otras cuentas. */
	deleteAccount(): Promise<void>;
}
