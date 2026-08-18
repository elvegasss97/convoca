import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { currentStaffAccessStep } from '$lib/auth/staffAuthService';

export const ssr = false;

/**
 * Solo se renderiza cuando de verdad hace falta: sesión de staff con
 * `user_metadata.must_change_password` (cuentas creadas con contraseña
 * temporal vía la API administrativa de Supabase). Cualquier otro estado
 * redirige a donde corresponda.
 */
export const load: PageLoad = async () => {
	const step = await currentStaffAccessStep();
	if (step === 'not-staff') redirect(303, '/acceso-interno');
	if (step === 'proceed') redirect(303, '/moderacion');
	if (step === 'verify') redirect(303, '/acceso-interno/verificar');
	if (step === 'enroll') redirect(303, '/acceso-interno/configurar-mfa');
};
