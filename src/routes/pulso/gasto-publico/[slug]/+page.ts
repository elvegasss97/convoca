import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { listPublicSpendingInvestigations } from '$lib/services/publicSpendingService';

export const load: PageLoad = async ({ params }) => {
	const investigations = await listPublicSpendingInvestigations();
	const investigation = investigations.find((item) => item.slug === params.slug);
	if (!investigation) error(404, 'Investigación no encontrada');

	return { investigation, investigations };
};
