import type { AuditLog, Event, ModerationAction, Report, ReportReason } from '$lib/types';
import { mockReports } from '$lib/mock/reports';
import { mockAuditLogs } from '$lib/mock/auditLogs';
import { loadPersisted, savePersisted } from '$lib/utils/persistedArray';
import { listPendingModeration, setEventStatus, getEvent } from './eventsService';

const REPORTS_KEY = 'reports';
const AUDIT_LOGS_KEY = 'audit-logs';
const reports: Report[] = loadPersisted(REPORTS_KEY, mockReports);
const auditLogs: AuditLog[] = loadPersisted(AUDIT_LOGS_KEY, mockAuditLogs);

function persistReports(): void {
	savePersisted(REPORTS_KEY, reports);
}

function persistAuditLogs(): void {
	savePersisted(AUDIT_LOGS_KEY, auditLogs);
}

function delay<T>(value: T): Promise<T> {
	return Promise.resolve(value);
}

export async function listPendingReview(): Promise<Event[]> {
	return listPendingModeration();
}

export interface ReportedEventGroup {
	event: Event;
	reports: Report[];
}

export async function listReportedEvents(): Promise<ReportedEventGroup[]> {
	const openReports = reports.filter((r) => r.status === 'open' || r.status === 'in_review');
	const eventIds = [...new Set(openReports.map((r) => r.eventId))];

	const groups: ReportedEventGroup[] = [];
	for (const eventId of eventIds) {
		const event = await getEvent(eventId);
		if (event) groups.push({ event, reports: openReports.filter((r) => r.eventId === eventId) });
	}
	return delay(groups);
}

export async function listAuditLogForEvent(eventId: string): Promise<AuditLog[]> {
	const results = auditLogs
		.filter((l) => l.eventId === eventId)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	return delay(results);
}

export async function listAllAuditLogs(): Promise<AuditLog[]> {
	const results = [...auditLogs].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
	return delay(results);
}

/** Estado destino de la convocatoria para cada acción de moderación. */
const actionToStatus: Partial<Record<ModerationAction, Event['status']>> = {
	approve: 'published',
	request_changes: 'draft',
	hide: 'hidden',
	reject: 'rejected',
	reinstate: 'published'
};

export async function applyModerationAction(
	eventId: string,
	action: ModerationAction,
	moderatorId: string,
	note?: string
): Promise<Event> {
	const nextStatus = actionToStatus[action];
	const event = nextStatus
		? await setEventStatus(eventId, nextStatus, note)
		: await getEvent(eventId);
	if (!event) throw new Error(`Convocatoria no encontrada: ${eventId}`);

	const log: AuditLog = {
		id: `log-${Math.random().toString(36).slice(2, 9)}`,
		eventId,
		action,
		moderatorId,
		note,
		createdAt: new Date().toISOString()
	};
	auditLogs.unshift(log);
	persistAuditLogs();

	// Marcamos como resueltos los reportes abiertos de esta convocatoria.
	let reportsChanged = false;
	for (const report of reports) {
		if (report.eventId === eventId && (report.status === 'open' || report.status === 'in_review')) {
			report.status = 'resolved';
			report.resolvedAt = log.createdAt;
			reportsChanged = true;
		}
	}
	if (reportsChanged) persistReports();

	return event;
}

export async function listReportsForEvent(eventId: string): Promise<Report[]> {
	return delay(reports.filter((r) => r.eventId === eventId));
}

export async function createReport(
	eventId: string,
	reason: ReportReason,
	details?: string
): Promise<Report> {
	const report: Report = {
		id: `rep-${Math.random().toString(36).slice(2, 9)}`,
		eventId,
		reason,
		details,
		status: 'open',
		createdAt: new Date().toISOString()
	};
	reports.unshift(report);
	persistReports();
	return delay(report);
}
