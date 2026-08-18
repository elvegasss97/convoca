import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authService } from '$lib/auth/authService';
import { currentStaffAccessStep } from '$lib/auth/staffAuthService';
import {
	listPendingReview,
	listReportedEvents,
	listAllAuditLogs
} from '$lib/services/moderationService';
import { getPendingDocuments, listOrganizers } from '$lib/services/organizersService';
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

	// Comprobación de UX: la barrera real es RLS — is_moderator_or_admin()
	// (supabase/migrations/0052_staff_mfa_required.sql) ya exige aal2 para
	// cualquier lectura de esta página, esto solo evita mostrar errores de
	// permiso crudos y lleva a la pantalla correcta (configurar MFA por
	// primera vez, o verificar si ya hay un factor pero la sesión sigue en
	// aal1).
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
		pendingOpenVoiceContributions
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
		listPendingOpenVoiceContributionsForModeration()
	]);

	/**
	 * Datos exclusivos de la pestaña "Resumen": aparte del `Promise.all`
	 * crítico de arriba (si esas consultas fallan, ninguna otra pestaña
	 * puede funcionar, así que un fallo ahí debe seguir rompiendo la
	 * carga entera) porque un fallo aquí no debe impedir usar el resto del
	 * panel — cada resultado se degrada a `null` (interpretado como "error
	 * al calcular este indicador", nunca como 0) en vez de tirar abajo la
	 * página completa.
	 */
	const [participantCountResult, openVoiceTotalResult, recentAuditTrailResult] =
		await Promise.allSettled([
			getPulsoParticipantCount(),
			countActiveOpenVoiceContributions(),
			listRecentAuditTrail(8)
		]);
	const participantCount =
		participantCountResult.status === 'fulfilled' ? participantCountResult.value : null;
	const openVoiceTotal =
		openVoiceTotalResult.status === 'fulfilled' ? openVoiceTotalResult.value : null;
	const recentAuditTrail =
		recentAuditTrailResult.status === 'fulfilled' ? recentAuditTrailResult.value : null;

	// Total de votos de la ronda de "Tú eliges el próximo bloque" ACTIVA, si
	// hay alguna — total exacto, nunca desglose por opción (mismo criterio
	// de privacidad de 0043: el desglose sí necesita umbral, el total no).
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
		participantCount,
		openVoiceTotal,
		recentAuditTrail,
		activeVoteRound,
		activeVoteTotal
	};
};
