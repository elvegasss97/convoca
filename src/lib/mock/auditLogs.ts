import type { AuditLog } from '$lib/types';

export const mockAuditLogs: AuditLog[] = [
	{
		id: 'log-1',
		eventId: 'evt-15',
		action: 'reject',
		moderatorId: 'mod-1',
		note: 'La declaración de carácter pacífico aportada era insuficiente.',
		createdAt: '2026-07-25T09:00:00.000Z'
	},
	{
		id: 'log-2',
		eventId: 'evt-14',
		action: 'hide',
		moderatorId: 'mod-2',
		note: 'Ocultada de forma cautelar mientras se revisa un reporte por contenido partidista.',
		createdAt: '2026-07-29T09:15:00.000Z'
	},
	{
		id: 'log-3',
		eventId: 'evt-1',
		action: 'approve',
		moderatorId: 'mod-1',
		note: 'Documentación de la asociación verificada correctamente.',
		createdAt: '2026-07-20T09:00:00.000Z'
	},
	{
		id: 'log-4',
		eventId: 'evt-3',
		action: 'approve',
		moderatorId: 'mod-2',
		note: 'Comunicación previa y documentación revisadas.',
		createdAt: '2026-07-05T09:00:00.000Z'
	}
];

export function getAuditLogsForEvent(eventId: string): AuditLog[] {
	return mockAuditLogs
		.filter((l) => l.eventId === eventId)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
