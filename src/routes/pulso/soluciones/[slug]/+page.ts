import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	getTopicBySlug,
	listTopicSources,
	listTopicDataPoints,
	listTopicConcerns,
	listTopicMeasures,
	listTopicMeasureAxes,
	listTopicTimelinePhases,
	listTopicVersions,
	listTopicRisks,
	listTopicCommitments,
	listMeasureSourceIdsForMeasures
} from '$lib/services/topicsService';
import { getConcernResults } from '$lib/services/concernsService';
import {
	getLatestRound,
	getMeasureParticipationResults,
	getGeneralParticipationResults,
	getPriorityResults,
	getParticipationSummary
} from '$lib/services/participationService';

export const load: PageLoad = async ({ params }) => {
	const topic = await getTopicBySlug(params.slug);
	if (!topic) error(404, 'No hemos encontrado este tema.');

	const [
		sources,
		dataPoints,
		concerns,
		measures,
		axes,
		timelinePhases,
		versions,
		risks,
		commitments,
		round
	] = await Promise.all([
		listTopicSources(topic.id),
		listTopicDataPoints(topic.id),
		listTopicConcerns(topic.id),
		listTopicMeasures(topic.id),
		listTopicMeasureAxes(topic.id),
		listTopicTimelinePhases(topic.id),
		listTopicVersions(topic.id),
		listTopicRisks(topic.id),
		listTopicCommitments(topic.id),
		getLatestRound(topic.id)
	]);

	const measureIds = measures.map((m) => m.id);
	const [
		concernResults,
		measureSourceIds,
		measureParticipationResults,
		generalResults,
		priorityResults,
		summary
	] = await Promise.all([
		getConcernResults(concerns.map((c) => c.id)),
		listMeasureSourceIdsForMeasures(measureIds),
		round ? getMeasureParticipationResults(round.id, measureIds) : Promise.resolve(new Map()),
		round ? getGeneralParticipationResults(round.id) : Promise.resolve(undefined),
		round ? getPriorityResults(round.id) : Promise.resolve([]),
		round ? getParticipationSummary(round.id) : Promise.resolve(undefined)
	]);

	return {
		topic,
		sources,
		dataPoints,
		concerns,
		measures,
		axes,
		timelinePhases,
		versions,
		risks,
		commitments,
		round,
		concernResults,
		measureSourceIds,
		measureParticipationResults,
		generalResults,
		priorityResults,
		summary
	};
};
