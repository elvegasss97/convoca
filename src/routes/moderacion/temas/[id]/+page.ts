import { redirect, error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authService } from '$lib/auth/authService';
import { currentStaffAccessStep } from '$lib/auth/staffAuthService';
import {
	getTopicById,
	listTopicSources,
	listTopicDataPoints,
	listTopicConcerns,
	listTopicMeasures,
	listTopicMeasureAxes,
	listTopicTimelinePhases,
	listTopicVersions,
	listTopicRisks,
	listMeasureSourceIdsForMeasures,
	listPendingMeasureAlternatives,
	listPendingDevelopedProposals
} from '$lib/services/topicsService';
import { listConcerns } from '$lib/services/concernsService';
import { listRounds } from '$lib/services/participationService';

/** Forzado a CSR: ver el mismo comentario en `src/routes/moderacion/+page.ts`. */
export const ssr = false;

export const load: PageLoad = async ({ params, url }) => {
	const session = await authService.getSession();
	if (!session || (session.user.role !== 'moderator' && session.user.role !== 'admin')) {
		redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	// Ver el mismo comentario en src/routes/moderacion/+page.ts.
	const accessStep = await currentStaffAccessStep();
	if (accessStep === 'change-password') redirect(303, '/acceso-interno/cambiar-contrasena');
	if (accessStep === 'enroll') redirect(303, '/acceso-interno/configurar-mfa');
	if (accessStep === 'verify') redirect(303, '/acceso-interno/verificar');

	const allConcerns = await listConcerns();
	const isNew = params.id === 'nuevo';

	if (isNew) {
		return {
			session,
			topic: null,
			sources: [],
			dataPoints: [],
			linkedConcerns: [],
			axes: [],
			measures: [],
			measureSourceIds: new Map<string, string[]>(),
			timelinePhases: [],
			versions: [],
			risks: [],
			pendingAlternatives: [],
			rounds: [],
			pendingProposals: [],
			allConcerns
		};
	}

	const topic = await getTopicById(params.id);
	if (!topic) error(404, 'Tema no encontrado.');

	const [
		sources,
		dataPoints,
		linkedConcerns,
		axes,
		measures,
		timelinePhases,
		versions,
		risks,
		allPendingAlternatives,
		rounds
	] = await Promise.all([
		listTopicSources(topic.id),
		listTopicDataPoints(topic.id),
		listTopicConcerns(topic.id),
		listTopicMeasureAxes(topic.id),
		listTopicMeasures(topic.id),
		listTopicTimelinePhases(topic.id),
		listTopicVersions(topic.id),
		listTopicRisks(topic.id),
		listPendingMeasureAlternatives(),
		listRounds(topic.id)
	]);

	const measureSourceIds = await listMeasureSourceIdsForMeasures(measures.map((m) => m.id));
	const latestRound = rounds[0];
	const pendingProposals = latestRound ? await listPendingDevelopedProposals(latestRound.id) : [];

	return {
		session,
		topic,
		sources,
		dataPoints,
		linkedConcerns,
		axes,
		measures,
		measureSourceIds,
		timelinePhases,
		versions,
		risks,
		pendingAlternatives: allPendingAlternatives.filter((a) => a.topicId === topic.id),
		rounds,
		pendingProposals,
		allConcerns
	};
};
