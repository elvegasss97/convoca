import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authService } from '$lib/auth/authService';
import {
	listPendingReview,
	listReportedEvents,
	listAllAuditLogs
} from '$lib/services/moderationService';
import { getPendingDocuments, listOrganizers } from '$lib/services/organizersService';
import { listReportedChannels } from '$lib/services/channelsService';

export const load: PageLoad = async ({ url }) => {
	const session = await authService.getSession();

	// Ruta separada del panel del organizador a propósito: ni comparte rutas
	// ni permisos. Un organizador normal no puede entrar aquí.
	if (!session || (session.user.role !== 'moderator' && session.user.role !== 'admin')) {
		redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	const [pending, reported, auditLog, pendingDocuments, organizers, reportedChannels] =
		await Promise.all([
			listPendingReview(),
			listReportedEvents(),
			listAllAuditLogs(),
			getPendingDocuments(),
			listOrganizers(),
			listReportedChannels()
		]);

	return { session, pending, reported, auditLog, pendingDocuments, organizers, reportedChannels };
};
