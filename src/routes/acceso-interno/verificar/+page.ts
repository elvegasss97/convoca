import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { currentStaffMfaStep } from '$lib/auth/staffAuthService';

export const ssr = false;

export const load: PageLoad = async () => {
	const step = await currentStaffMfaStep();
	if (step === 'not-staff') redirect(303, '/acceso-interno');
	if (step === 'proceed') redirect(303, '/moderacion');
	if (step === 'enroll') redirect(303, '/acceso-interno/configurar-mfa');
};
