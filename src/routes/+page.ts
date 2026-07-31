import type { PageLoad } from './$types';
import { listPublicEvents, getPublicStats } from '$lib/services/eventsService';
import { listOrganizers } from '$lib/services/organizersService';

export const load: PageLoad = async () => {
	const [events, organizers, stats] = await Promise.all([
		listPublicEvents(),
		listOrganizers(),
		getPublicStats()
	]);

	return { events, organizers, stats };
};
