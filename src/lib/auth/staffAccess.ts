/**
 * Lógica pura del acceso de staff (/acceso-interno): qué rol cuenta como
 * "personal autorizado" y qué pantalla sigue tras comprobar el nivel de
 * verificación en dos pasos (AAL) de la sesión activa. Aparte de
 * `staffAuthService.ts` para poder probarse sin mockear Supabase — mismo
 * criterio que el resto de `$lib/auth`/`$lib/utils`.
 *
 * La barrera de seguridad REAL nunca vive aquí ni en ningún otro archivo
 * de `src/`: es `public.is_moderator_or_admin()` en Postgres (rol +
 * aal2, `supabase/migrations/0052_staff_mfa_required.sql`), evaluada por
 * RLS en cada consulta. Este módulo decide solo qué mostrar/a dónde
 * redirigir — nunca qué datos se pueden leer o escribir.
 */

export type StaffRole = 'moderator' | 'admin';

export function isStaffRole(role: string): role is StaffRole {
	return role === 'moderator' || role === 'admin';
}

/**
 * `enroll`: no hay ningún factor TOTP verificado todavía — primera
 * configuración.
 * `verify`: existe un factor verificado pero la sesión actual sigue en
 * aal1 — hace falta un código para el "step-up" a aal2.
 * `proceed`: la sesión ya está en aal2, puede continuar a /moderacion.
 */
export type MfaStep = 'enroll' | 'verify' | 'proceed';

/**
 * A partir de `currentLevel`/`nextLevel` de
 * `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`: `nextLevel` es
 * 'aal2' cuando existe al menos un factor verificado (haya o no
 * alcanzado ya ese nivel la sesión actual); si `nextLevel` se queda en
 * 'aal1' es que no hay ningún factor verificado — no hay a qué "subir".
 */
export function nextMfaStep(currentLevel: string | null, nextLevel: string | null): MfaStep {
	if (currentLevel === 'aal2') return 'proceed';
	if (nextLevel === 'aal2') return 'verify';
	return 'enroll';
}

/**
 * Paso completo de acceso de staff: cambio de contraseña obligatorio
 * (cuentas creadas con contraseña temporal de un solo uso, vía la API
 * administrativa de Supabase — nunca por invitación por correo) antes
 * incluso de comprobar el MFA.
 */
export type StaffAccessStep = 'change-password' | MfaStep;

/**
 * `user_metadata.must_change_password` lo fija la API administrativa al
 * crear una cuenta de staff con contraseña temporal, y esta misma app lo
 * borra (`changeStaffPassword()`) en cuanto la persona establece la
 * suya. No es un mecanismo de seguridad en sí — quien de verdad decide
 * si puede entrar es RLS (rol + aal2) — solo evita que alguien siga
 * usando la contraseña temporal más allá del primer acceso.
 */
export function mustChangePassword(
	userMetadata: Record<string, unknown> | null | undefined
): boolean {
	return userMetadata?.must_change_password === true;
}
