import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	getPublicSpendingInvestigation,
	listPublicSpendingNavigationItems
} from '$lib/services/publicSpendingService';

export const load: PageLoad = async ({ params }) => {
	const [investigation, navigationItems] = await Promise.all([
		getPublicSpendingInvestigation(params.slug),
		listPublicSpendingNavigationItems()
	]);
	if (!investigation) error(404, 'Investigación no encontrada');

	return { investigation, navigationItems };
};
