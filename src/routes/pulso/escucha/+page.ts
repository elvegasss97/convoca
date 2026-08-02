import type { PageLoad } from './$types';
import { listPublishedConcerns, getPulsoParticipantCount } from '$lib/services/concernsService';
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

export const load: PageLoad = async () => {
	const [concerns, participantCount] = await Promise.all([
		listPublishedConcerns(),
		getPulsoParticipantCount()
	]);

	const activeCategories = new Set(concerns.map((c) => c.category));
	// Solo se muestran como tema activo las categorías con al menos una
	// preocupación publicada real; el resto queda como "próximamente" sin
	// aparentar estar disponible.
	const active = ALL_CATEGORIES.filter((c) => activeCategories.has(c));
	const upcoming = ALL_CATEGORIES.filter((c) => !activeCategories.has(c));

	return { active, upcoming, participantCount };
};
