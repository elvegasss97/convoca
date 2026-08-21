import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authService } from '$lib/auth/authService';
import { currentStaffAccessStep } from '$lib/auth/staffAuthService';
import { isStaffRole } from '$lib/auth/staffAccess';
import {
	listPendingReview,
	listReportedEvents,
	listAllAuditLogs
} from '$lib/services/moderationService';
import { getPendingDocuments, listOrganizers } from '$lib/services/organizersService';
import { getRegisteredUserCount } from '$lib/services/staffMetricsService';
import { listReportedChannels } from '$lib/services/channelsService';
import { listPublicEvents } from '$lib/services/eventsService';
import {
	listConcerns,
	listConcernProposals,
	getPulsoParticipantCount
} from '$lib/services/concernsService';
import { listTopics, listPendingMeasureAlternatives } from '$lib/services/topicsService';
import { listNextBlockVoteRounds, getNextBlockVoteTotal } from '$lib/services/nextBlockVoteService';
import {
	listPendingOpenVoiceContributionsForModeration,
	countActiveOpenVoiceContributions
} from '$lib/services/openVoiceService';
import { listRecentAuditTrail } from '$lib/services/auditTrailService';
import { listReportedMunicipalPetitions } from '$lib/services/municipalService';

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

export const load: PageLoad = async () => {
	const session = await authService.getSession();

	if (!session || !isStaffRole(session.user.role)) {
		redirect(303, '/acceso-interno');
	}

	const accessStep = await currentStaffAccessStep();
	if (accessStep === 'change-password') redirect(303, '/acceso-interno/cambiar-contrasena');
	if (accessStep === 'enroll') redirect(303, '/acceso-interno/configurar-mfa');
	if (accessStep === 'verify') redirect(303, '/acceso-interno/verificar');

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
		pendingAlternatives,
		nextBlockVoteRounds,
		pendingOpenVoiceContributions,
		reportedMunicipalPetitions
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
		listPendingMeasureAlternatives(),
		listNextBlockVoteRounds(),
		listPendingOpenVoiceContributionsForModeration(),
		listReportedMunicipalPetitions()
	]);

	const [
		registeredUserCountResult,
		participantCountResult,
		openVoiceTotalResult,
		recentAuditTrailResult
	] = await Promise.allSettled([
		getRegisteredUserCount(),
		getPulsoParticipantCount(),
		countActiveOpenVoiceContributions(),
		listRecentAuditTrail(8)
	]);
	const registeredUserCount =
		registeredUserCountResult.status === 'fulfilled' ? registeredUserCountResult.value : null;
	const participantCount =
		participantCountResult.status === 'fulfilled' ? participantCountResult.value : null;
	const openVoiceTotal =
		openVoiceTotalResult.status === 'fulfilled' ? openVoiceTotalResult.value : null;
	const recentAuditTrail =
		recentAuditTrailResult.status === 'fulfilled' ? recentAuditTrailResult.value : null;

	const activeVoteRound = nextBlockVoteRounds.find((r) => r.status === 'open');
	let activeVoteTotal: number | null = null;
	if (activeVoteRound) {
		try {
			activeVoteTotal = await getNextBlockVoteTotal(activeVoteRound.id);
		} catch {
			activeVoteTotal = null;
		}
	}

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
		pendingAlternatives,
		nextBlockVoteRounds,
		pendingOpenVoiceContributions,
		reportedMunicipalPetitions,
		registeredUserCount,
		participantCount,
		openVoiceTotal,
		recentAuditTrail,
		activeVoteRound,
		activeVoteTotal
	};
};
