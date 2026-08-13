import type { PageLoad } from './$types';
import { listPublicEvents, getPublicStats } from '$lib/services/eventsService';
import { listOrganizers } from '$lib/services/organizersService';

export const load: PageLoad = async () => {
	const [events, organizers] = await Promise.all([listPublicEvents(), listOrganizers()]);
	// getPublicStats reutiliza los `events` ya obtenidos arriba: evita repetir
	// el SELECT + RPC de asistencia que hacía por su cuenta (ver rendimiento/03).
	const stats = await getPublicStats(events);

	return { events, organizers, stats };
};
