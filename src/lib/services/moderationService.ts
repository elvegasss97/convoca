import type { AuditLog, Event, ModerationAction, Report, ReportReason } from '$lib/types';
import { supabase } from '$lib/supabase/client';
import { listPendingModeration, setEventStatus, getEvent } from './eventsService';

/**
 * `reports_moderation` (vista) tipa todas sus columnas como `| null` — es
 * una limitación conocida del generador de tipos de Supabase para vistas,
 * no un reflejo real: las columnas subyacentes de `reports` son NOT NULL
 * salvo `details`/`resolved_at` (ver 0005_reports_and_audit_logs.sql).
 * `id`/`event_id`/`reason`/`status`/`created_at` nunca son null en la
 * práctica; `?? ''`/`?? row.created_at` aquí es solo para satisfacer el
 * tipo generado, no lógica de negocio real.
 */
interface ReportRow {
	id: string | null;
	event_id: string | null;
	reason: string | null;
	details: string | null;
	status: string | null;
	created_at: string | null;
	resolved_at: string | null;
}

function rowToReport(row: ReportRow): Report {
	return {
		id: row.id ?? '',
		eventId: row.event_id ?? '',
		reason: (row.reason ?? '') as ReportReason,
		details: row.details ?? undefined,
		status: (row.status ?? 'open') as Report['status'],
		createdAt: row.created_at ?? new Date().toISOString(),
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

/**
 * Solo moderación/administración ven reportes (RLS: `reports_select_own_or_staff`).
 * Se lee `reports_moderation`, no `reports`: la vista no expone
 * `reported_by_user_id` (seguridad/32 §E, seguridad/33_rollback_0043.sql).
 */
export async function listReportedEvents(): Promise<ReportedEventGroup[]> {
	const { data, error } = await supabase
		.from('reports_moderation')
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
	const { data, error } = await supabase
		.from('reports_moderation')
		.select('*')
		.eq('event_id', eventId);
	if (error) throw error;
	return (data ?? []).map(rowToReport);
}

/**
 * Reportar requiere estar autenticado (política `reports_insert_authenticated`
 * en `supabase/migrations/0005_reports_and_audit_logs.sql`: `anon` no tiene
 * política de INSERT). Quién reportó no se expone en ninguna vista pública
 * ni siquiera a moderación desde la interfaz actual — y, desde 0043, tampoco
 * es estructuralmente legible vía la API para nadie salvo `service_role`.
 *
 * El insert va contra la tabla base (no la vista, que es de solo lectura).
 * `.select()` pide explícitamente las columnas seguras: desde 0043,
 * `authenticated` solo tiene GRANT de columna sobre esas 7, así que un
 * `select('*')` aquí fallaría con "permission denied" incluso para el
 * propio autor del reporte.
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
		.select('id, event_id, reason, details, status, created_at, resolved_at')
		.single();
	if (error) throw error;
	return rowToReport(data);
}
