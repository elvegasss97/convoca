import type { Report } from '$lib/types';

export const mockReports: Report[] = [
	{
		id: 'rep-1',
		eventId: 'evt-14',
		reason: 'contenido_partidista_encubierto',
		details: 'La descripción original incluía referencias a un partido político concreto.',
		status: 'in_review',
		createdAt: '2026-07-29T09:00:00.000Z'
	},
	{
		id: 'rep-2',
		eventId: 'evt-15',
		reason: 'informacion_falsa',
		details: 'No se aporta información suficiente sobre el carácter pacífico de la convocatoria.',
		status: 'resolved',
		createdAt: '2026-07-24T10:00:00.000Z',
		resolvedAt: '2026-07-25T09:00:00.000Z'
	},
	{
		id: 'rep-3',
		eventId: 'evt-1',
		reason: 'spam',
		details: 'Comentario reportado como posible spam en la página del evento.',
		status: 'dismissed',
		createdAt: '2026-07-22T08:00:00.000Z',
		resolvedAt: '2026-07-22T12:00:00.000Z'
	}
];

export function getReportsForEvent(eventId: string): Report[] {
	return mockReports.filter((r) => r.eventId === eventId);
}

export function getOpenReports(): Report[] {
	return mockReports.filter((r) => r.status === 'open' || r.status === 'in_review');
}
