/**
 * Capa de acceso a datos de "Pulso ciudadano", sobre Supabase.
 *
 * La autorización real vive en las políticas RLS y en las funciones
 * `SECURITY DEFINER` de `supabase/migrations/0026_pulso_ciudadano.sql`
 * (`set_concern_response`, `get_concern_results`,
 * `get_pulso_participant_count`) — las comprobaciones de aquí son
 * conveniencia de UX, nunca la única barrera. En particular,
 * `set_concern_response` usa `auth.uid()` internamente: esta capa nunca
 * envía ni puede enviar el id de usuario del voto.
 */
import { supabase } from '$lib/supabase/client';
import type { Event } from '$lib/types';
import type {
	Concern,
	ConcernCategory,
	ConcernLevel,
	ConcernLevelCounts,
	ConcernProposal,
	ConcernProposalStatus,
	ConcernResults,
	ConcernScope,
	ConcernScopeType,
	ConcernStatus
} from '$lib/types';
import { randomId } from '$lib/utils/id';
import { communityNameVariants } from '$lib/utils/territoryScope';
import { rowToEvent } from './eventsService';

// ---------------------------------------------------------------------------
// Mapeo de filas
// ---------------------------------------------------------------------------

interface ConcernRow {
	id: string;
	slug: string;
	category: string;
	question: string;
	description: string;
	publisher_label: string;
	scope_type: string;
	scope_value: string | null;
	status: string;
	starts_at: string;
	closes_at: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export function rowToConcern(row: ConcernRow): Concern {
	return {
		id: row.id,
		slug: row.slug,
		category: row.category as ConcernCategory,
		question: row.question,
		description: row.description,
		publisherLabel: row.publisher_label,
		scope: { type: row.scope_type as ConcernScopeType, value: row.scope_value ?? undefined },
		status: row.status as ConcernStatus,
		startsAt: row.starts_at,
		closesAt: row.closes_at ?? undefined,
		createdBy: row.created_by ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface ConcernProposalRow {
	id: string;
	proposer_user_id: string;
	title: string;
	proposed_question: string;
	category: string;
	description: string;
	scope_type: string;
	scope_value: string | null;
	reason: string;
	status: string;
	reviewer_note: string | null;
	reviewed_by: string | null;
	reviewed_at: string | null;
	resulting_concern_id: string | null;
	created_at: string;
	updated_at: string;
}

function rowToProposal(row: ConcernProposalRow): ConcernProposal {
	return {
		id: row.id,
		proposerUserId: row.proposer_user_id,
		title: row.title,
		proposedQuestion: row.proposed_question,
		category: row.category as ConcernCategory,
		description: row.description,
		scope: { type: row.scope_type as ConcernScopeType, value: row.scope_value ?? undefined },
		reason: row.reason,
		status: row.status as ConcernProposalStatus,
		reviewerNote: row.reviewer_note ?? undefined,
		reviewedBy: row.reviewed_by ?? undefined,
		reviewedAt: row.reviewed_at ?? undefined,
		resultingConcernId: row.resulting_concern_id ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

const EMPTY_COUNTS: ConcernLevelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

function slugify(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

function randomSlugSuffix(): string {
	const cleaned = randomId().replace(/[^a-z0-9]/gi, '');
	return (cleaned.slice(-8) || Math.random().toString(36).slice(2, 10)).toLowerCase();
}

// ---------------------------------------------------------------------------
// Lectura pública
// ---------------------------------------------------------------------------

export interface ListConcernsOptions {
	/** Sin filtro = todos los ámbitos (usado también por moderación). */
	scope?: ConcernScope;
	/** Por defecto solo 'published' — moderación pasa `undefined` para ver todo. */
	status?: ConcernStatus;
}

/**
 * Lista preocupaciones. RLS decide qué `status` puede ver cada sesión
 * (público solo 'published', moderación/administración todo) — el filtro de
 * `status` de aquí es solo para acotar la consulta, nunca la única barrera.
 */
export async function listConcerns(options: ListConcernsOptions = {}): Promise<Concern[]> {
	let query = supabase.from('concerns').select('*').order('created_at', { ascending: false });
	if (options.status) query = query.eq('status', options.status);
	if (options.scope && options.scope.type !== 'nacional' && options.scope.value) {
		query = query.eq('scope_type', options.scope.type);
		// Filtrar por igualdad estricta dejaría invisibles filas que aún
		// tengan el nombre antiguo de una comunidad ya renombrada (ver
		// communityNameVariants(): hoy solo aplica a Baleares, "Islas
		// Baleares" -> "Illes Balears") mientras la normalización de datos de
		// la migración 0047 no haya llegado a ese entorno.
		if (options.scope.type === 'comunidad_autonoma') {
			query = query.in('scope_value', communityNameVariants(options.scope.value));
		} else {
			query = query.eq('scope_value', options.scope.value);
		}
	} else if (options.scope?.type === 'nacional') {
		query = query.eq('scope_type', 'nacional');
	}
	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []).map(rowToConcern);
}

/** Solo preocupaciones publicadas, para /pulso. */
export async function listPublishedConcerns(scope?: ConcernScope): Promise<Concern[]> {
	return listConcerns({ status: 'published', scope });
}

export async function getConcernBySlug(slug: string): Promise<Concern | undefined> {
	const { data, error } = await supabase
		.from('concerns')
		.select('*')
		.eq('slug', slug)
		.maybeSingle();
	if (error || !data) return undefined;
	return rowToConcern(data);
}

export async function getConcernById(id: string): Promise<Concern | undefined> {
	const { data, error } = await supabase.from('concerns').select('*').eq('id', id).maybeSingle();
	if (error || !data) return undefined;
	return rowToConcern(data);
}

/**
 * Resultados agregados (recuento por nivel 1-5) vía `get_concern_results`.
 * Nunca expone respuestas individuales. Los porcentajes se calculan en el
 * componente de presentación a partir de `counts`/`totalResponses`, siempre
 * contemplando `totalResponses === 0` para no dividir entre cero.
 */
export async function getConcernResults(
	concernIds: string[]
): Promise<Map<string, ConcernResults>> {
	if (concernIds.length === 0) return new Map();
	const { data, error } = await supabase.rpc('get_concern_results', { p_concern_ids: concernIds });
	if (error) throw error;

	const byConcern = new Map<string, ConcernLevelCounts>();
	for (const id of concernIds) byConcern.set(id, { ...EMPTY_COUNTS });
	for (const row of data ?? []) {
		const counts = byConcern.get(row.concern_id);
		if (counts) counts[row.level as ConcernLevel] = row.response_count;
	}

	const results = new Map<string, ConcernResults>();
	for (const [concernId, counts] of byConcern) {
		const totalResponses = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
		const weightedSum = (Object.entries(counts) as [string, number][]).reduce(
			(sum, [level, count]) => sum + Number(level) * count,
			0
		);
		results.set(concernId, {
			concernId,
			counts,
			totalResponses,
			averageLevel: totalResponses > 0 ? weightedSum / totalResponses : undefined
		});
	}
	return results;
}

/** Número real de personas distintas que han respondido a alguna preocupación. Nunca una cifra inventada. */
export async function getPulsoParticipantCount(): Promise<number> {
	const { data, error } = await supabase.rpc('get_pulso_participant_count');
	if (error) throw error;
	return data ?? 0;
}

/**
 * Mi propia respuesta a cada preocupación (para el estado "ya respondida" y
 * precargar el nivel al cambiarla). Requiere sesión — RLS
 * `concern_responses_select_own_or_staff` solo deja ver la propia fila.
 * Se resuelve en el cliente tras montar (nunca en `load` del servidor):
 * con SSR activo, el servidor no tiene acceso a la sesión de `localStorage`
 * (ver `$lib/supabase/client.ts`), así que forzar esto en el `load` SSR
 * mostraría siempre "sin responder" en la carga inicial.
 */
export async function getMyConcernResponses(
	concernIds: string[]
): Promise<Map<string, ConcernLevel>> {
	if (concernIds.length === 0) return new Map();
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return new Map();

	const { data, error } = await supabase
		.from('concern_responses')
		.select('concern_id, level')
		.in('concern_id', concernIds)
		.eq('user_id', sessionData.session.user.id);
	if (error) throw error;
	return new Map((data ?? []).map((r) => [r.concern_id, r.level as ConcernLevel]));
}

/**
 * Emite o cambia mi voto. Único punto de escritura: la función SQL
 * `set_concern_response` (usa `auth.uid()` internamente, valida el nivel y
 * que la preocupación esté publicada y abierta). Un mismo usuario nunca
 * puede aparecer dos veces: la fila se actualiza (upsert), no se duplica.
 */
export async function setConcernResponse(concernId: string, level: ConcernLevel): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para responder.');
	}
	const { error } = await supabase.rpc('set_concern_response', {
		p_concern_id: concernId,
		p_level: level
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu respuesta.');
}

/** Nº de convocatorias relacionadas por preocupación, para no lanzar una consulta por tarjeta en el listado. */
export async function getRelatedEventCounts(concernIds: string[]): Promise<Map<string, number>> {
	if (concernIds.length === 0) return new Map();
	const { data, error } = await supabase
		.from('concern_events')
		.select('concern_id')
		.in('concern_id', concernIds);
	if (error) throw error;
	const counts = new Map<string, number>();
	for (const row of data ?? []) {
		counts.set(row.concern_id, (counts.get(row.concern_id) ?? 0) + 1);
	}
	return counts;
}

/** Convocatorias relacionadas con una preocupación, vía la tabla de relación `concern_events`. */
export async function listRelatedEvents(concernId: string): Promise<Event[]> {
	const { data: links, error: linkError } = await supabase
		.from('concern_events')
		.select('event_id')
		.eq('concern_id', concernId);
	if (linkError) throw linkError;
	const eventIds = (links ?? []).map((l) => l.event_id);
	if (eventIds.length === 0) return [];

	const { data, error } = await supabase.from('events').select('*').in('id', eventIds);
	if (error) throw error;
	return (data ?? []).map((row) => rowToEvent(row));
}

// ---------------------------------------------------------------------------
// Propuestas ciudadanas
// ---------------------------------------------------------------------------

export interface ConcernProposalInput {
	title: string;
	proposedQuestion: string;
	category: ConcernCategory;
	description: string;
	scope: ConcernScope;
	reason: string;
}

/**
 * Envía una propuesta a revisión. Nunca se publica directamente (política
 * `concern_proposals_insert_own`: solo permite insertar; el estado siempre
 * queda en 'pending', forzado también por el trigger
 * `concern_proposals_enforce_insert` por si acaso).
 */
export async function submitConcernProposal(input: ConcernProposalInput): Promise<ConcernProposal> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para proponer una preocupación.');
	}
	const { data, error } = await supabase
		.from('concern_proposals')
		.insert({
			proposer_user_id: sessionData.session.user.id,
			title: input.title.trim(),
			proposed_question: input.proposedQuestion.trim(),
			category: input.category,
			description: input.description.trim(),
			scope_type: input.scope.type,
			scope_value: input.scope.type === 'nacional' ? null : (input.scope.value ?? null),
			reason: input.reason.trim()
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToProposal(data);
}

/** Panel de gestión: lista de propuestas (RLS: solo moderación/administración ven las de otras cuentas). */
export async function listConcernProposals(
	status?: ConcernProposalStatus
): Promise<ConcernProposal[]> {
	let query = supabase
		.from('concern_proposals')
		.select('*')
		.order('created_at', { ascending: true });
	if (status) query = query.eq('status', status);
	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []).map(rowToProposal);
}

export async function reviewConcernProposal(
	proposalId: string,
	decision: 'approved' | 'rejected',
	reviewerId: string,
	note?: string,
	resultingConcernId?: string
): Promise<ConcernProposal> {
	const { data, error } = await supabase
		.from('concern_proposals')
		.update({
			status: decision,
			reviewer_note: note ?? null,
			reviewed_by: reviewerId,
			reviewed_at: new Date().toISOString(),
			resulting_concern_id: resultingConcernId ?? null
		})
		.eq('id', proposalId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToProposal(data);
}

// ---------------------------------------------------------------------------
// Gestión (moderación/administración) — protegido por RLS `*_staff`
// ---------------------------------------------------------------------------

export interface ConcernInput {
	category: ConcernCategory;
	question: string;
	description: string;
	scope: ConcernScope;
	status: ConcernStatus;
	startsAt: string;
	closesAt?: string;
}

export async function createConcern(input: ConcernInput, createdBy: string): Promise<Concern> {
	const slug = `${slugify(input.question).slice(0, 60).replace(/-$/, '')}-${randomSlugSuffix()}`;
	const { data, error } = await supabase
		.from('concerns')
		.insert({
			slug,
			category: input.category,
			question: input.question.trim(),
			description: input.description.trim(),
			scope_type: input.scope.type,
			scope_value: input.scope.type === 'nacional' ? null : (input.scope.value ?? null),
			status: input.status,
			starts_at: input.startsAt,
			closes_at: input.closesAt ?? null,
			created_by: createdBy
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToConcern(data);
}

export async function updateConcern(id: string, input: ConcernInput): Promise<Concern> {
	const { data, error } = await supabase
		.from('concerns')
		.update({
			category: input.category,
			question: input.question.trim(),
			description: input.description.trim(),
			scope_type: input.scope.type,
			scope_value: input.scope.type === 'nacional' ? null : (input.scope.value ?? null),
			status: input.status,
			starts_at: input.startsAt,
			closes_at: input.closesAt ?? null
		})
		.eq('id', id)
		.select('*')
		.single();
	if (error) throw error;
	return rowToConcern(data);
}

export async function setConcernStatus(id: string, status: ConcernStatus): Promise<Concern> {
	const { data, error } = await supabase
		.from('concerns')
		.update({ status })
		.eq('id', id)
		.select('*')
		.single();
	if (error) throw error;
	return rowToConcern(data);
}

export async function linkConcernToEvent(concernId: string, eventId: string): Promise<void> {
	const { error } = await supabase
		.from('concern_events')
		.insert({ concern_id: concernId, event_id: eventId });
	if (error) throw error;
}

export async function unlinkConcernFromEvent(concernId: string, eventId: string): Promise<void> {
	const { error } = await supabase
		.from('concern_events')
		.delete()
		.eq('concern_id', concernId)
		.eq('event_id', eventId);
	if (error) throw error;
}

/** Número de respuestas por preocupación, para el panel de gestión (nunca expone quién respondió). */
export async function getConcernResponseCounts(concernIds: string[]): Promise<Map<string, number>> {
	const results = await getConcernResults(concernIds);
	return new Map([...results].map(([id, r]) => [id, r.totalResponses]));
}
