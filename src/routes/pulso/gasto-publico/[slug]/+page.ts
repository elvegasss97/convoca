import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { publicSpendingInvestigationBySlug } from '$lib/data/publicSpendingInvestigations';

export const load: PageLoad = ({ params }) => {
	const investigation = publicSpendingInvestigationBySlug.get(params.slug);
	if (!investigation) error(404, 'Investigación no encontrada');

	return { investigation };
};
