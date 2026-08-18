import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { currentStaffMfaStep } from '$lib/auth/staffAuthService';

/**
 * `ssr = false` por el mismo motivo que `/moderacion` (`authService`
 * lee la sesión de `localStorage`, inaccesible en servidor — ver el
 * comentario de `src/routes/moderacion/+page.ts`).
 */
export const ssr = false;

/**
 * Si ya hay una sesión de staff activa, no se muestra el formulario de
 * nuevo: se continúa justo donde se dejó (verificación pendiente,
 * configuración de MFA pendiente, o directamente /moderacion si ya está
 * todo hecho). Si no hay sesión de staff (incluida ninguna sesión en
 * absoluto), se renderiza el formulario de acceso.
 */
export const load: PageLoad = async () => {
	const step = await currentStaffMfaStep();
	if (step === 'proceed') redirect(303, '/moderacion');
	if (step === 'verify') redirect(303, '/acceso-interno/verificar');
	if (step === 'enroll') redirect(303, '/acceso-interno/configurar-mfa');
};
