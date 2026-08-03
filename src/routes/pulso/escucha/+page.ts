import type { PageLoad } from './$types';
import { listPublishedConcerns, getPulsoParticipantCount } from '$lib/services/concernsService';
import { getLatestListeningRound } from '$lib/services/listeningService';
import type { ConcernCategory } from '$lib/types';

const ALL_CATEGORIES: ConcernCategory[] = [
	'vivienda',
	'sanidad',
	'empleo',
	'educacion',
	'seguridad',
	'coste_vida',
	'transporte',
	'medioambiente'
];

// Categorías con una escucha real construida (priorizar+profundizar o
// encuesta de una tirada), más allá del sistema clásico de "concerns".
const CATEGORIES_WITH_LISTENING_FLOW: ConcernCategory[] = ['vivienda', 'sanidad'];

export const load: PageLoad = async () => {
	const [concerns, participantCount, listeningRounds] = await Promise.all([
		listPublishedConcerns(),
		getPulsoParticipantCount(),
		Promise.all(CATEGORIES_WITH_LISTENING_FLOW.map((c) => getLatestListeningRound(c)))
	]);

	const activeCategories = new Set(concerns.map((c) => c.category));
	CATEGORIES_WITH_LISTENING_FLOW.forEach((category, i) => {
		if (listeningRounds[i]?.status === 'open') activeCategories.add(category);
	});
	// Se muestran como tema activo las categorías con al menos una
	// preocupación publicada real, o con una escucha propia ya abierta;
	// el resto queda como "próximamente" sin aparentar estar disponible.
	const active = ALL_CATEGORIES.filter((c) => activeCategories.has(c));
	const upcoming = ALL_CATEGORIES.filter((c) => !activeCategories.has(c));

	return { active, upcoming, participantCount };
};
