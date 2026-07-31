import type { EventUpdate } from '$lib/types';

export const mockEventUpdates: EventUpdate[] = [
	{
		id: 'upd-1',
		eventId: 'evt-1',
		authorOrganizerId: 'org-1',
		title: 'Confirmado el punto de encuentro',
		body: 'Confirmamos que la concentración será en la Plaza de Lavapiés, junto a la fuente. Llevad agua, se esperan altas temperaturas.',
		isCritical: false,
		createdAt: '2026-07-28T10:00:00.000Z'
	},
	{
		id: 'upd-2',
		eventId: 'evt-4',
		authorOrganizerId: 'org-4',
		title: 'Cambio de hora',
		body: 'Adelantamos el inicio 30 minutos a petición de la familia afectada. Nueva hora: 10:00.',
		isCritical: true,
		createdAt: '2026-07-29T12:00:00.000Z'
	},
	{
		id: 'upd-3',
		eventId: 'evt-13',
		authorOrganizerId: 'org-4',
		title: 'Convocatoria cancelada',
		body: 'Hemos alcanzado un compromiso de reunión con el ayuntamiento para la próxima semana. Cancelamos la concentración prevista y os mantendremos informados del resultado.',
		isCritical: true,
		createdAt: '2026-07-27T11:00:00.000Z'
	},
	{
		id: 'upd-4',
		eventId: 'evt-7',
		authorOrganizerId: 'org-7',
		title: 'Punto de recogida de chalecos reflectantes',
		body: 'Habrá un punto de préstamo de chalecos reflectantes junto al punto de encuentro para quien lo necesite.',
		isCritical: false,
		createdAt: '2026-07-25T09:30:00.000Z'
	},
	{
		id: 'upd-5',
		eventId: 'evt-2',
		authorOrganizerId: 'org-2',
		title: 'Recordatorio de recorrido',
		body: 'El recorrido finalizará en la Ciudad de las Artes y las Ciencias, donde habrá una breve lectura de manifiesto.',
		isCritical: false,
		createdAt: '2026-07-27T08:00:00.000Z'
	}
];

export function getUpdatesForEvent(eventId: string): EventUpdate[] {
	return mockEventUpdates
		.filter((u) => u.eventId === eventId)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
