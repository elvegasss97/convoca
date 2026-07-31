import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getEvent } from '$lib/services/eventsService';
import { getOrganizer } from '$lib/services/organizersService';
import { listUpdates } from '$lib/services/updatesService';

export const load: PageLoad = async ({ params }) => {
	const event = await getEvent(params.slug);
	if (!event) error(404, 'No hemos encontrado esta convocatoria.');

	const [organizer, updates] = await Promise.all([
		getOrganizer(event.organizerId),
		listUpdates(event.id)
	]);
	if (!organizer) error(404, 'No hemos encontrado al organizador de esta convocatoria.');

	return { event, organizer, updates };
};
