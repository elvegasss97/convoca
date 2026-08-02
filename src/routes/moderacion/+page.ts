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
import { listPublicEvents } from '$lib/services/eventsService';
import { listConcerns, listConcernProposals } from '$lib/services/concernsService';
import { listTopics, listPendingMeasureAlternatives } from '$lib/services/topicsService';

/**
 * Forzado a CSR: `authService.getSession()` lee la sesión de Supabase desde
 * `localStorage` (ver `$lib/supabase/client.ts`), inaccesible en el
 * servidor (no hay `hooks.server.ts` con cookies de sesión). Con SSR activo
 * a nivel global (`src/routes/+layout.ts`), esta comprobación siempre
 * fallaría en el servidor y redirigiría a `/login` incluso a una persona
 * moderadora con sesión real, en cualquier recarga directa de esta ruta.
 * No hay contenido público que indexar aquí (`noindex` en el `<Seo>` de
 * abajo), así que desactivar SSR no cuesta nada de SEO.
 */
export const ssr = false;

export const load: PageLoad = async ({ url }) => {
	const session = await authService.getSession();

	// Ruta separada del panel del organizador a propósito: ni comparte rutas
	// ni permisos. Un organizador normal no puede entrar aquí.
	if (!session || (session.user.role !== 'moderator' && session.user.role !== 'admin')) {
		redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	const [
		pending,
		reported,
		auditLog,
		pendingDocuments,
		organizers,
		reportedChannels,
		concerns,
		concernProposals,
		publicEvents,
		topics,
		pendingAlternatives
	] = await Promise.all([
		listPendingReview(),
		listReportedEvents(),
		listAllAuditLogs(),
		getPendingDocuments(),
		listOrganizers(),
		listReportedChannels(),
		listConcerns(),
		listConcernProposals(),
		listPublicEvents(),
		listTopics(),
		listPendingMeasureAlternatives()
	]);

	return {
		session,
		pending,
		reported,
		auditLog,
		pendingDocuments,
		organizers,
		reportedChannels,
		concerns,
		concernProposals,
		publicEvents,
		topics,
		pendingAlternatives
	};
};
