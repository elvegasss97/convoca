/**
 * Capa de acceso a datos de "Escucha abierta": priorizar entre 1 y 3
 * preocupaciones concretas de un tema y profundizar solo en las elegidas.
 *
 * La autorización real vive en las políticas RLS y en las funciones
 * `SECURITY DEFINER` de `supabase/migrations/0032_escucha_vivienda.sql`
 * (`set_concern_listening_priorities`, `set_concern_listening_detail`,
 * `set_concern_listening_context`, `set_concern_listening_completed`) —
 * las comprobaciones de aquí son conveniencia de UX, nunca la única
 * barrera.
 *
 * Nota deliberada: este archivo no contiene ningún contenido político real
 * ni de ejemplo. Es solo la capa de datos.
 */
import { supabase } from '$lib/supabase/client';
import type {
	ConcernCategory,
	ListeningAreaType,
	ListeningCompletion,
	ListeningContext,
	ListeningEvolution,
	ListeningPersonalRelation,
	ListeningResponse,
	ListeningRound,
	ListeningRoundStatus,
	ListeningSeverity
} from '$lib/types';
import type { HousingSituation } from '$lib/types';

// ---------------------------------------------------------------------------
// Mapeo de filas
// ---------------------------------------------------------------------------

interface RoundRow {
	id: string;
	category: string;
	version_label: string;
	status: string;
	opens_at: string | null;
	closes_at: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

function rowToRound(row: RoundRow): ListeningRound {
	return {
		id: row.id,
		category: row.category as ConcernCategory,
		versionLabel: row.version_label,
		status: row.status as ListeningRoundStatus,
		opensAt: row.opens_at ?? undefined,
		closesAt: row.closes_at ?? undefined,
		createdBy: row.created_by ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface ResponseRow {
	id: string;
	round_id: string;
	user_id: string;
	option_code: string;
	rank: number | null;
	severity: string | null;
	evolution: string | null;
	personal_relation: string | null;
	cause_code: string | null;
	cause_other: string | null;
	comment: string | null;
	created_at: string;
	updated_at: string;
}

function rowToResponse(row: ResponseRow): ListeningResponse {
	return {
		id: row.id,
		roundId: row.round_id,
		userId: row.user_id,
		optionCode: row.option_code,
		rank: (row.rank as 1 | 2 | 3 | null) ?? undefined,
		severity: (row.severity as ListeningSeverity) ?? undefined,
		evolution: (row.evolution as ListeningEvolution) ?? undefined,
		personalRelation: (row.personal_relation as ListeningPersonalRelation) ?? undefined,
		causeCode: row.cause_code ?? undefined,
		causeOther: row.cause_other ?? undefined,
		comment: row.comment ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface ContextRow {
	id: string;
	round_id: string;
	user_id: string;
	community: string | null;
	area_type: string | null;
	housing_situation: string | null;
	created_at: string;
	updated_at: string;
}

function rowToContext(row: ContextRow): ListeningContext {
	return {
		id: row.id,
		roundId: row.round_id,
		userId: row.user_id,
		community: row.community ?? undefined,
		areaType: (row.area_type as ListeningAreaType) ?? undefined,
		housingSituation: (row.housing_situation as HousingSituation) ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

// ---------------------------------------------------------------------------
// Rondas
// ---------------------------------------------------------------------------

/** La ronda más reciente de una categoría (visible según RLS: pública si no está en `draft`, o cualquiera para staff). */
export async function getLatestListeningRound(
	category: ConcernCategory
): Promise<ListeningRound | undefined> {
	const { data, error } = await supabase
		.from('concern_listening_rounds')
		.select('*')
		.eq('category', category)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error || !data) return undefined;
	return rowToRound(data);
}

// ---------------------------------------------------------------------------
// Prioridades y profundización
// ---------------------------------------------------------------------------

/** Mis respuestas (seleccionadas o no) de una ronda. Requiere sesión — se resuelve siempre en el cliente. */
export async function listMyListeningResponses(roundId: string): Promise<ListeningResponse[]> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return [];

	const { data, error } = await supabase
		.from('concern_listening_responses')
		.select('*')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id);
	if (error) throw error;
	return (data ?? []).map(rowToResponse);
}

/** `optionCodes` en orden de prioridad (máximo 3, sin duplicados). Vacío = deselecciona todas (conserva su profundización). */
export async function setListeningPriorities(
	roundId: string,
	optionCodes: string[]
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_concern_listening_priorities', {
		p_round_id: roundId,
		p_option_codes: optionCodes
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu selección.');
}

export interface ListeningDetailInput {
	severity?: ListeningSeverity;
	evolution?: ListeningEvolution;
	personalRelation?: ListeningPersonalRelation;
	causeCode?: string;
	causeOther?: string;
	comment?: string;
}

export async function setListeningDetail(
	roundId: string,
	optionCode: string,
	input: ListeningDetailInput
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_concern_listening_detail', {
		p_round_id: roundId,
		p_option_code: optionCode,
		p_severity: input.severity ?? null,
		p_evolution: input.evolution ?? null,
		p_personal_relation: input.personalRelation ?? null,
		p_cause_code: input.causeCode ?? null,
		p_cause_other: input.causeOther ?? null,
		p_comment: input.comment ?? null
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu respuesta.');
}

// ---------------------------------------------------------------------------
// Contexto voluntario
// ---------------------------------------------------------------------------

export interface ListeningContextInput {
	community?: string;
	areaType?: ListeningAreaType;
	housingSituation?: HousingSituation;
}

export async function setListeningContext(
	roundId: string,
	input: ListeningContextInput
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_concern_listening_context', {
		p_round_id: roundId,
		p_community: input.community ?? null,
		p_area_type: input.areaType ?? null,
		p_housing_situation: input.housingSituation ?? null
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu contexto.');
}

export async function getMyListeningContext(
	roundId: string
): Promise<ListeningContext | undefined> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return undefined;

	const { data, error } = await supabase
		.from('concern_listening_contexts')
		.select('*')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id)
		.maybeSingle();
	if (error || !data) return undefined;
	return rowToContext(data);
}

// ---------------------------------------------------------------------------
// Finalización
// ---------------------------------------------------------------------------

export async function setListeningCompleted(roundId: string): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_concern_listening_completed', {
		p_round_id: roundId
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu confirmación.');
}

export async function getMyListeningCompletion(
	roundId: string
): Promise<ListeningCompletion | undefined> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return undefined;

	const { data, error } = await supabase
		.from('concern_listening_completions')
		.select('*')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id)
		.maybeSingle();
	if (error || !data) return undefined;
	return {
		roundId: data.round_id,
		userId: data.user_id,
		completedAt: data.completed_at,
		updatedAt: data.updated_at
	};
}
