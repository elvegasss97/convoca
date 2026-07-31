import type { AuditLog, Event, ModerationAction, Report, ReportReason } from '$lib/types';
import { supabase } from '$lib/supabase/client';
import { listPendingModeration, setEventStatus, getEvent } from './eventsService';

interface ReportRow {
	id: string;
	event_id: string;
	reason: string;
	details: string | null;
	status: string;
	created_at: string;
	resolved_at: string | null;
}

function rowToReport(row: ReportRow): Report {
	return {
		id: row.id,
		eventId: row.event_id,
		reason: row.reason as ReportReason,
		details: row.details ?? undefined,
		status: row.status as Report['status'],
		createdAt: row.created_at,
		resolvedAt: row.resolved_at ?? undefined
	};
}

interface AuditLogRow {
	id: string;
	event_id: string;
	action: string;
	moderator_id: string;
	note: string | null;
	created_at: string;
}

function rowToAuditLog(row: AuditLogRow): AuditLog {
	return {
		id: row.id,
		eventId: row.event_id,
		action: row.action as ModerationAction,
		moderatorId: row.moderator_id,
		note: row.note ?? undefined,
		createdAt: row.created_at
	};
}

export async function listPendingReview(): Promise<Event[]> {
	return listPendingModeration();
}

export interface ReportedEventGroup {
	event: Event;
	reports: Report[];
}

/** Solo moderación/administración ven reportes (RLS): `reports_select_staff`. */
export async function listReportedEvents(): Promise<ReportedEventGroup[]> {
	const { data, error } = await supabase
		.from('reports')
		.select('*')
		.in('status', ['open', 'in_review']);
	if (error) throw error;
	const openReports = (data ?? []).map(rowToReport);
	const eventIds = [...new Set(openReports.map((r) => r.eventId))];

	const groups: ReportedEventGroup[] = [];
	for (const eventId of eventIds) {
		const event = await getEvent(eventId);
		if (event) groups.push({ event, reports: openReports.filter((r) => r.eventId === eventId) });
	}
	return groups;
}

export async function listAuditLogForEvent(eventId: string): Promise<AuditLog[]> {
	const { data, error } = await supabase
		.from('audit_logs')
		.select('*')
		.eq('event_id', eventId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToAuditLog);
}

export async function listAllAuditLogs(): Promise<AuditLog[]> {
	const { data, error } = await supabase
		.from('audit_logs')
		.select('*')
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToAuditLog);
}

/** Estado destino de la convocatoria para cada acción de moderación. */
export const actionToStatus: Partial<Record<ModerationAction, Event['status']>> = {
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

	const { error: logError } = await supabase.from('audit_logs').insert({
		event_id: eventId,
		action,
		moderator_id: moderatorId,
		note: note ?? null
	});
	if (logError) throw logError;

	await supabase
		.from('reports')
		.update({ status: 'resolved', resolved_at: new Date().toISOString() })
		.eq('event_id', eventId)
		.in('status', ['open', 'in_review']);

	return event;
}

export async function listReportsForEvent(eventId: string): Promise<Report[]> {
	const { data, error } = await supabase.from('reports').select('*').eq('event_id', eventId);
	if (error) throw error;
	return (data ?? []).map(rowToReport);
}

/**
 * Reportar requiere estar autenticado (política `reports_insert_authenticated`
 * en `supabase/migrations/0005_reports_and_audit_logs.sql`: `anon` no tiene
 * política de INSERT). Quién reportó no se expone en ninguna vista pública
 * ni siquiera a moderación desde la interfaz actual.
 */
export async function createReport(
	eventId: string,
	reason: ReportReason,
	details?: string
): Promise<Report> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para reportar una convocatoria.');
	}

	const { data, error } = await supabase
		.from('reports')
		.insert({
			event_id: eventId,
			reported_by_user_id: sessionData.session.user.id,
			reason,
			details: details ?? null
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToReport(data);
}
