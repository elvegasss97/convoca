import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authService } from '$lib/auth/authService';
import { currentStaffAccessStep } from '$lib/auth/staffAuthService';
import { isStaffRole } from '$lib/auth/staffAccess';
import { listDetectedMunicipalIssuesForModeration } from '$lib/services/municipalRadarModerationService';

export const ssr = false;

export const load: PageLoad = async () => {
	const session = await authService.getSession();
	if (!session || !isStaffRole(session.user.role)) redirect(303, '/acceso-interno');

	const accessStep = await currentStaffAccessStep();
	if (accessStep === 'change-password') redirect(303, '/acceso-interno/cambiar-contrasena');
	if (accessStep === 'enroll') redirect(303, '/acceso-interno/configurar-mfa');
	if (accessStep === 'verify') redirect(303, '/acceso-interno/verificar');

	const items = await listDetectedMunicipalIssuesForModeration();
	return { session, items };
};
