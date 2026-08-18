import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { currentStaffAccessStep } from '$lib/auth/staffAuthService';

export const ssr = false;

/**
 * Solo se renderiza cuando hace falta de verdad: sesión de staff válida,
 * sin contraseña temporal pendiente, sin ningún factor TOTP verificado
 * todavía. Cualquier otro estado redirige a donde corresponda — incluida
 * una sesión de staff que ya tiene un factor verificado (debe ir a
 * verificar/step-up, no a inscribir uno nuevo).
 */
export const load: PageLoad = async () => {
	const step = await currentStaffAccessStep();
	if (step === 'not-staff') redirect(303, '/acceso-interno');
	if (step === 'change-password') redirect(303, '/acceso-interno/cambiar-contrasena');
	if (step === 'proceed') redirect(303, '/moderacion');
	if (step === 'verify') redirect(303, '/acceso-interno/verificar');
};
