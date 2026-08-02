import type { PageLoad } from './$types';
import {
	listPublishedConcerns,
	getConcernResults,
	getRelatedEventCounts,
	getPulsoParticipantCount
} from '$lib/services/concernsService';
import type { ConcernScope, ConcernScopeType } from '$lib/types';

const VALID_SCOPE_TYPES: ConcernScopeType[] = [
	'nacional',
	'comunidad_autonoma',
	'provincia',
	'municipio'
];

export const load: PageLoad = async ({ url }) => {
	const rawType = url.searchParams.get('ambito');
	const rawValue = url.searchParams.get('valor') ?? undefined;
	const type = VALID_SCOPE_TYPES.includes(rawType as ConcernScopeType)
		? (rawType as ConcernScopeType)
		: 'nacional';
	// Ámbito no nacional sin valor (URL manipulada a mano) cae a nacional en vez de romper la consulta.
	const scope: ConcernScope =
		type === 'nacional' || !rawValue ? { type: 'nacional' } : { type, value: rawValue };

	const concerns = await listPublishedConcerns(scope);
	const ids = concerns.map((c) => c.id);
	const [results, relatedCounts, participantCount] = await Promise.all([
		getConcernResults(ids),
		getRelatedEventCounts(ids),
		getPulsoParticipantCount()
	]);

	return { concerns, results, relatedCounts, participantCount, scope };
};
