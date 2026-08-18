import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { currentStaffAccessStep } from '$lib/auth/staffAuthService';

export const ssr = false;

export const load: PageLoad = async () => {
	const step = await currentStaffAccessStep();
	if (step === 'not-staff') redirect(303, '/acceso-interno');
	if (step === 'change-password') redirect(303, '/acceso-interno/cambiar-contrasena');
	if (step === 'proceed') redirect(303, '/moderacion');
	if (step === 'enroll') redirect(303, '/acceso-interno/configurar-mfa');
};
