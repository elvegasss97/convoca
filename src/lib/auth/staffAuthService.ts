import { supabase } from '$lib/supabase/client';
import { authService } from './authService';
import { isStaffRole, nextMfaStep, type MfaStep } from './staffAccess';

/**
 * Acceso interno de staff (/acceso-interno): correo+contraseña exclusivo
 * para cuentas con `profiles.role` moderator/admin, con verificación en
 * dos pasos (TOTP) obligatoria. Reutiliza Supabase Auth íntegramente
 * (`signInWithPassword`, `auth.mfa.*`) — no es un sistema de
 * autenticación paralelo, es una segunda PANTALLA sobre el mismo backend
 * de autenticación que ya usan `/login`/`/registro` (Google) y el
 * organizador (contraseña, tras el interruptor `ENABLE_PASSWORD_AUTH`).
 *
 * Nunca se importa `signInWithPassword` de `authService.ts` para esto:
 * esa función exige `ENABLE_PASSWORD_AUTH`, el interruptor del acceso
 * público por contraseña de la CIUDADANÍA (ver `$lib/config/env.ts`) —
 * un ajuste de producto sin relación con esta pantalla interna, que debe
 * seguir funcionando esté ese interruptor activo o no.
 */

export const STAFF_ACCESS_DENIED_MESSAGE =
	'Acceso denegado. Esta pantalla es exclusiva para personal autorizado.';

/**
 * Estado de acceso de la sesión activa: 'not-staff' si no hay sesión o el
 * rol no es moderator/admin (mismo caso, a propósito: no se distingue de
 * cara a la interfaz — ver `STAFF_ACCESS_DENIED_MESSAGE`); si no,
 * `MfaStep` según el nivel de verificación en dos pasos alcanzado.
 *
 * Esta comprobación es solo de conveniencia para decidir a qué pantalla
 * ir — la barrera real es RLS (`is_moderator_or_admin()`, 0052). Nada
 * aquí concede ni revoca acceso a datos por sí mismo.
 */
export async function currentStaffMfaStep(): Promise<MfaStep | 'not-staff'> {
	const session = await authService.getSession();
	if (!session || !isStaffRole(session.user.role)) return 'not-staff';

	const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
	if (error) {
		throw new Error('No se ha podido comprobar el estado de verificación en dos pasos.');
	}
	return nextMfaStep(data.currentLevel, data.nextLevel);
}

/**
 * Inicia sesión en /acceso-interno. Un único mensaje genérico para
 * CUALQUIER fallo (credenciales incorrectas, cuenta sin rol de staff):
 * nunca revela cuál de los dos ocurrió, para no confirmar por el mensaje
 * de error si un correo dado tiene o no una cuenta, ni si esa cuenta es
 * de staff.
 */
export async function signInStaff(email: string, password: string): Promise<MfaStep> {
	const { error } = await supabase.auth.signInWithPassword({
		email: email.trim().toLowerCase(),
		password
	});
	if (error) throw new Error(STAFF_ACCESS_DENIED_MESSAGE);

	const step = await currentStaffMfaStep();
	if (step === 'not-staff') {
		await supabase.auth.signOut();
		throw new Error(STAFF_ACCESS_DENIED_MESSAGE);
	}
	return step;
}

// ---------------------------------------------------------------------------
// TOTP: configuración (primera vez) y verificación (step-up / confirmación)
// ---------------------------------------------------------------------------

export interface TotpEnrollment {
	factorId: string;
	/** SVG del código QR. Renderizar como `data:image/svg+xml;utf-8,${encodeURIComponent(qrCodeSvg)}` (indicación del propio SDK de Supabase). */
	qrCodeSvg: string;
	/** Alternativa en texto por si no se puede escanear el QR. */
	secret: string;
}

/**
 * Da de baja cualquier factor TOTP SIN VERIFICAR de un intento anterior
 * abandonado (recargar esta pantalla crea un factor nuevo cada vez, ver
 * `enroll()` de Supabase) antes de inscribir uno nuevo — evita acumular
 * factores huérfanos. Nunca toca un factor ya verificado.
 */
async function cleanUpUnverifiedTotpFactors(): Promise<void> {
	const { data } = await supabase.auth.mfa.listFactors();
	const stale = (data?.all ?? []).filter(
		(f) => f.factor_type === 'totp' && f.status === 'unverified'
	);
	for (const factor of stale) {
		await supabase.auth.mfa.unenroll({ factorId: factor.id });
	}
}

export async function enrollTotp(): Promise<TotpEnrollment> {
	await cleanUpUnverifiedTotpFactors();

	const { data, error } = await supabase.auth.mfa.enroll({
		factorType: 'totp',
		issuer: 'Convoca',
		friendlyName: 'Centro de Operaciones'
	});
	if (error || !data) {
		throw new Error('No se ha podido iniciar la configuración de verificación en dos pasos.');
	}
	return { factorId: data.id, qrCodeSvg: data.totp.qr_code, secret: data.totp.secret };
}

/**
 * Confirma un código de 6 dígitos. Sirve tanto para la confirmación
 * inicial de `enrollTotp()` como para el "step-up" de
 * `getVerifiedTotpFactorId()` — mismo mecanismo de Supabase
 * (`challengeAndVerify`, pensado explícitamente para factores TOTP).
 */
export async function verifyTotpCode(factorId: string, code: string): Promise<void> {
	const { error } = await supabase.auth.mfa.challengeAndVerify({
		factorId,
		code: code.trim()
	});
	if (error) throw new Error('Código incorrecto o caducado. Inténtalo de nuevo.');
}

/** Factor TOTP ya verificado de la cuenta activa, para la pantalla de verificación (step-up). */
export async function getVerifiedTotpFactorId(): Promise<string | undefined> {
	const { data } = await supabase.auth.mfa.listFactors();
	return data?.totp?.[0]?.id;
}
