/**
 * Capa de acceso a datos de "Voz abierta" (aportaciones de texto libre
 * dentro de Escucha ciudadana). La autorización real vive en las políticas
 * RLS y en los triggers de `supabase/migrations/0047_voz_abierta.sql` — las
 * comprobaciones de aquí son conveniencia de UX, nunca la única barrera.
 *
 * Nota deliberada: nunca se registra `content` en ningún log/consola desde
 * este archivo (ni siquiera en el mensaje de error), para no filtrar texto
 * privado a herramientas de observabilidad.
 */
import { supabase } from '$lib/supabase/client';
import type {
	OpenVoiceContribution,
	OpenVoiceModerationItem,
	OpenVoiceModerationStatus,
	OpenVoiceScope,
	OpenVoiceScopeType,
	OpenVoiceStatus
} from '$lib/types';

interface OpenVoiceContributionRow {
	id: string;
	content: string;
	scope_type: string;
	scope_value: string | null;
	scope_municipality_ine_code: string | null;
	status: string;
	created_at: string;
	updated_at: string;
	withdrawn_at: string | null;
}

// Nunca se selecciona `moderation_status`: es un detalle interno que la
// interfaz de quien participa no necesita ni debe mostrar.
const SELECT_COLUMNS =
	'id, content, scope_type, scope_value, scope_municipality_ine_code, status, created_at, updated_at, withdrawn_at';

function rowToContribution(row: OpenVoiceContributionRow): OpenVoiceContribution {
	return {
		id: row.id,
		content: row.content,
		scope: {
			type: row.scope_type as OpenVoiceScopeType,
			value: row.scope_value ?? undefined,
			municipalityCode: row.scope_municipality_ine_code ?? undefined
		},
		status: row.status as OpenVoiceStatus,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		withdrawnAt: row.withdrawn_at ?? undefined
	};
}

/**
 * Los errores de límite de envíos y de sesión llegan ya en un mensaje
 * pensado para la persona usuaria (`raise exception` en el trigger/servicio
 * correspondiente); cualquier otro error de Postgres (violación de un
 * `check`, de RLS, etc.) se sustituye por un mensaje genérico para no
 * filtrar detalles internos.
 */
function toUserMessage(error: { message?: string } | null, fallback: string): string {
	if (error?.message?.includes('Has alcanzado el límite')) return error.message;
	return fallback;
}

export interface OpenVoiceContributionInput {
	content: string;
	scope: OpenVoiceScope;
	/** Versión vigente del aviso de privacidad en el momento del envío (ver src/lib/legal/versions.ts). */
	privacyNoticeVersion?: string;
}

/** Envía una nueva aportación. Varias aportaciones por cuenta están permitidas a propósito ("Enviar otra"). */
export async function submitOpenVoiceContribution(
	input: OpenVoiceContributionInput
): Promise<OpenVoiceContribution> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para enviar tu aportación.');
	}
	const needsScopeValue = input.scope.type !== 'nacional' && input.scope.type !== 'multiple';
	const { data, error } = await supabase
		.from('open_voice_contributions')
		.insert({
			user_id: sessionData.session.user.id,
			content: input.content,
			scope_type: input.scope.type,
			scope_value: needsScopeValue ? (input.scope.value ?? null) : null,
			scope_municipality_ine_code:
				input.scope.type === 'municipio' ? (input.scope.municipalityCode ?? null) : null,
			privacy_notice_version: input.privacyNoticeVersion ?? null
		})
		.select(SELECT_COLUMNS)
		.single();
	if (error)
		throw new Error(
			toUserMessage(error, 'No se ha podido guardar tu aportación. Inténtalo de nuevo.')
		);
	return rowToContribution(data);
}

/** Mis propias aportaciones, más recientes primero. RLS ya limita a la propia cuenta (+ moderación). */
export async function listMyOpenVoiceContributions(): Promise<OpenVoiceContribution[]> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return [];
	const { data, error } = await supabase
		.from('open_voice_contributions')
		.select(SELECT_COLUMNS)
		.is('withdrawn_at', null)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToContribution);
}

/**
 * Retira (soft-delete) una aportación propia. Nunca borra físicamente la
 * fila: el trigger `enforce_open_voice_contribution_update` solo permite a
 * la propia cuenta fijar `withdrawn_at`, una vez, sin poder deshacerlo.
 */
export async function withdrawOpenVoiceContribution(id: string): Promise<void> {
	const { error } = await supabase
		.from('open_voice_contributions')
		.update({ withdrawn_at: new Date().toISOString() })
		.eq('id', id);
	if (error) throw new Error(toUserMessage(error, 'No se ha podido retirar tu aportación.'));
}

// ---------------------------------------------------------------------------
// Moderación (Centro de Operaciones, Fase 1) — solo accesible en la práctica
// para moderación/administración: RLS (`open_voice_contributions_select_
// own_or_staff`/`_update_own_or_staff`, 0047) es quien realmente lo exige,
// esto es solo la capa de acceso a datos que el panel usa para hablar con
// esa RLS. Deliberadamente sin `userId`/identidad de quien envió: ver
// `OpenVoiceModerationItem` en `$lib/types`.
// ---------------------------------------------------------------------------

interface OpenVoiceModerationRow {
	id: string;
	content: string;
	scope_type: string;
	scope_value: string | null;
	scope_municipality_ine_code: string | null;
	status: string;
	moderation_status: string;
	created_at: string;
	updated_at: string;
}

const MODERATION_SELECT_COLUMNS =
	'id, content, scope_type, scope_value, scope_municipality_ine_code, status, moderation_status, created_at, updated_at';

function rowToModerationItem(row: OpenVoiceModerationRow): OpenVoiceModerationItem {
	return {
		id: row.id,
		content: row.content,
		scope: {
			type: row.scope_type as OpenVoiceScopeType,
			value: row.scope_value ?? undefined,
			municipalityCode: row.scope_municipality_ine_code ?? undefined
		},
		status: row.status as OpenVoiceStatus,
		moderationStatus: row.moderation_status as OpenVoiceModerationStatus,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/**
 * Cola de moderación: aportaciones activas (no retiradas) pendientes de
 * revisión, más antiguas primero (orden natural de una cola). Retiradas
 * excluidas a propósito: moderar algo que la propia persona ya retiró no
 * tiene sentido — RLS ya deja de listarlas en "Mis aportaciones", y aquí
 * tampoco aportan nada a la cola.
 */
export async function listPendingOpenVoiceContributionsForModeration(): Promise<
	OpenVoiceModerationItem[]
> {
	const { data, error } = await supabase
		.from('open_voice_contributions')
		.select(MODERATION_SELECT_COLUMNS)
		.eq('moderation_status', 'pending')
		.is('withdrawn_at', null)
		.order('created_at', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToModerationItem);
}

/**
 * Cambia EXCLUSIVAMENTE `moderation_status` — el único campo que esta
 * fase expone para moderar. El resto de columnas (contenido, ámbito,
 * autor, `status` del recorrido futuro, retirada) permanece fuera de este
 * servicio a propósito: `enforce_open_voice_contribution_update` (0047)
 * las bloquea igualmente aunque se intentaran mandar, pero no mandarlas
 * siquiera es la garantía de que este código nunca lo intente. La
 * auditoría de este cambio la genera automáticamente el trigger
 * `open_voice_contributions_log_moderation_update` (0050) — este
 * servicio no escribe en `audit_trail` directamente.
 */
export async function setOpenVoiceModerationStatus(
	id: string,
	moderationStatus: OpenVoiceModerationStatus
): Promise<void> {
	const { error } = await supabase
		.from('open_voice_contributions')
		.update({ moderation_status: moderationStatus })
		.eq('id', id);
	if (error)
		throw new Error(toUserMessage(error, 'No se ha podido actualizar el estado de moderación.'));
}
