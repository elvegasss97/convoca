import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	getConcernBySlug,
	getConcernResults,
	listRelatedEvents
} from '$lib/services/concernsService';

export const load: PageLoad = async ({ params }) => {
	const concern = await getConcernBySlug(params.slug);
	if (!concern) error(404, 'No hemos encontrado esta preocupación.');

	const [resultsByConcern, relatedEvents] = await Promise.all([
		getConcernResults([concern.id]),
		listRelatedEvents(concern.id)
	]);

	const results = resultsByConcern.get(concern.id) ?? {
		concernId: concern.id,
		counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
		totalResponses: 0
	};

	return { concern, results, relatedEvents };
};
