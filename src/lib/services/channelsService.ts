/**
 * Capa de acceso a datos de canales de coordinación (WhatsApp/Telegram/
 * otro), sobre Supabase. La autorización real vive en las políticas RLS y
 * en el trigger `enforce_channel_update_rules`
 * (`supabase/migrations/0021_communication_channels.sql`): las
 * comprobaciones de aquí son conveniencia de UX, nunca la única barrera.
 */
import { supabase } from '$lib/supabase/client';
import type {
	ChannelPlatform,
	ChannelReport,
	ChannelReportReason,
	ChannelType,
	CommunicationChannel
} from '$lib/types';
import { validateChannelUrl } from '$lib/utils/channelUrl';

interface ChannelRow {
	id: string;
	event_id: string;
	platform: string;
	channel_type: string;
	label: string | null;
	url: string;
	is_hidden: boolean;
	created_at: string;
	updated_at: string;
}

function rowToChannel(row: ChannelRow): CommunicationChannel {
	return {
		id: row.id,
		eventId: row.event_id,
		platform: row.platform as ChannelPlatform,
		channelType: row.channel_type as ChannelType,
		label: row.label ?? undefined,
		url: row.url,
		isHidden: row.is_hidden,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/**
 * Lista los canales visibles para la sesión actual (RLS decide: dueño y
 * moderación ven todo, cualquier otra persona solo los no ocultos de una
 * convocatoria pública). Sirve tanto para el panel del organizador como
 * para la ficha pública — el resultado ya viene filtrado por Postgres.
 */
export async function listChannelsForEvent(eventId: string): Promise<CommunicationChannel[]> {
	const { data, error } = await supabase
		.from('event_communication_channels')
		.select('*')
		.eq('event_id', eventId)
		.order('created_at', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToChannel);
}

export interface ChannelInput {
	platform: ChannelPlatform;
	channelType: ChannelType;
	label?: string;
	url: string;
}

export class ChannelValidationError extends Error {}

function assertValidChannel(input: ChannelInput): void {
	const result = validateChannelUrl(input.url, input.platform);
	if (!result.valid) throw new ChannelValidationError(result.error ?? 'Enlace no válido.');
}

export async function createChannel(
	eventId: string,
	input: ChannelInput
): Promise<CommunicationChannel> {
	assertValidChannel(input);
	const { data, error } = await supabase
		.from('event_communication_channels')
		.insert({
			event_id: eventId,
			platform: input.platform,
			channel_type: input.channelType,
			label: input.label?.trim() || null,
			url: input.url.trim()
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToChannel(data);
}

export async function updateChannel(
	channelId: string,
	input: ChannelInput
): Promise<CommunicationChannel> {
	assertValidChannel(input);
	const { data, error } = await supabase
		.from('event_communication_channels')
		.update({
			platform: input.platform,
			channel_type: input.channelType,
			label: input.label?.trim() || null,
			url: input.url.trim()
		})
		.eq('id', channelId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToChannel(data);
}

export async function deleteChannel(channelId: string): Promise<void> {
	const { error } = await supabase
		.from('event_communication_channels')
		.delete()
		.eq('id', channelId);
	if (error) throw error;
}

// ---------------------------------------------------------------------------
// Reportes y moderación de canales
// ---------------------------------------------------------------------------

interface ChannelReportRow {
	id: string;
	channel_id: string;
	reason: string;
	details: string | null;
	status: string;
	created_at: string;
	resolved_at: string | null;
}

function rowToChannelReport(row: ChannelReportRow): ChannelReport {
	return {
		id: row.id,
		channelId: row.channel_id,
		reason: row.reason as ChannelReportReason,
		details: row.details ?? undefined,
		status: row.status as ChannelReport['status'],
		createdAt: row.created_at,
		resolvedAt: row.resolved_at ?? undefined
	};
}

/** Requiere sesión (política `channel_reports_insert_authenticated`: `anon` no puede reportar). */
export async function reportChannel(
	channelId: string,
	reason: ChannelReportReason,
	details?: string
): Promise<ChannelReport> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para reportar un canal.');
	}
	const { data, error } = await supabase
		.from('channel_reports')
		.insert({
			channel_id: channelId,
			reported_by_user_id: sessionData.session.user.id,
			reason,
			details: details ?? null
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToChannelReport(data);
}

export async function listReportedChannels(): Promise<
	{ channel: CommunicationChannel; reports: ChannelReport[] }[]
> {
	const { data, error } = await supabase
		.from('channel_reports')
		.select('*')
		.in('status', ['open', 'in_review']);
	if (error) throw error;
	const openReports = (data ?? []).map(rowToChannelReport);
	const channelIds = [...new Set(openReports.map((r) => r.channelId))];

	const groups: { channel: CommunicationChannel; reports: ChannelReport[] }[] = [];
	for (const channelId of channelIds) {
		const { data: channelRow } = await supabase
			.from('event_communication_channels')
			.select('*')
			.eq('id', channelId)
			.maybeSingle();
		if (channelRow) {
			groups.push({
				channel: rowToChannel(channelRow),
				reports: openReports.filter((r) => r.channelId === channelId)
			});
		}
	}
	return groups;
}

/**
 * Oculta o restaura un único canal, sin tocar el resto de la convocatoria,
 * y deja constancia en `audit_logs` (mismo historial de moderación que
 * aprobar/ocultar/rechazar una convocatoria).
 */
export async function setChannelHidden(
	channelId: string,
	hidden: boolean,
	moderatorId: string,
	note?: string
): Promise<CommunicationChannel> {
	const { data, error } = await supabase
		.from('event_communication_channels')
		.update({ is_hidden: hidden })
		.eq('id', channelId)
		.select('*')
		.single();
	if (error) throw error;

	const { error: logError } = await supabase.from('audit_logs').insert({
		event_id: data.event_id,
		channel_id: channelId,
		action: hidden ? 'hide_channel' : 'unhide_channel',
		moderator_id: moderatorId,
		note: note ?? null
	});
	if (logError) throw logError;

	await supabase
		.from('channel_reports')
		.update({ status: 'resolved', resolved_at: new Date().toISOString() })
		.eq('channel_id', channelId)
		.in('status', ['open', 'in_review']);

	return rowToChannel(data);
}
