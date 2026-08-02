import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	listPublishedConcerns,
	getConcernResults,
	getRelatedEventCounts,
	getPulsoParticipantCount
} from '$lib/services/concernsService';
import { listPublishedTopics } from '$lib/services/topicsService';
import type { ConcernCategory, ConcernScope, ConcernScopeType } from '$lib/types';

const VALID_CATEGORIES: ConcernCategory[] = [
	'vivienda',
	'sanidad',
	'empleo',
	'educacion',
	'seguridad',
	'coste_vida',
	'transporte',
	'medioambiente'
];

const VALID_SCOPE_TYPES: ConcernScopeType[] = [
	'nacional',
	'comunidad_autonoma',
	'provincia',
	'municipio'
];

export const load: PageLoad = async ({ params, url }) => {
	const category = params.categoria as ConcernCategory;
	if (!VALID_CATEGORIES.includes(category)) {
		error(404, 'Tema no encontrado.');
	}

	const rawType = url.searchParams.get('ambito');
	const rawValue = url.searchParams.get('valor') ?? undefined;
	const type = VALID_SCOPE_TYPES.includes(rawType as ConcernScopeType)
		? (rawType as ConcernScopeType)
		: 'nacional';
	const scope: ConcernScope =
		type === 'nacional' || !rawValue ? { type: 'nacional' } : { type, value: rawValue };

	const allConcerns = await listPublishedConcerns(scope);
	const concerns = allConcerns.filter((c) => c.category === category);
	const ids = concerns.map((c) => c.id);
	const [results, relatedCounts, participantCount, allTopics] = await Promise.all([
		getConcernResults(ids),
		getRelatedEventCounts(ids),
		getPulsoParticipantCount(),
		listPublishedTopics()
	]);
	// Propuesta de Convoca relacionada con este tema, si existe (enlace
	// contextual, sin duplicar su contenido ni su participación aquí).
	const relatedTopic = allTopics.find((t) => t.category === category);

	return { category, concerns, results, relatedCounts, participantCount, scope, relatedTopic };
};
