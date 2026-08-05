/**
 * Capa de acceso a datos de la "escucha abierta" de una sola tirada (p. ej.
 * Escucha abierta sobre sanidad): una respuesta por usuario y ronda,
 * distinta del modelo de priorizar + profundizar de `listeningService.ts`.
 *
 * La autorización real vive en las políticas RLS y en las funciones
 * `SECURITY DEFINER` de `supabase/migrations/0037_escucha_abierta_sanidad.sql`
 * (`set_concern_listening_survey_response`, `get_concern_listening_survey_summary`,
 * `get_concern_listening_survey_total`, `get_concern_listening_survey_territory_breakdown`)
 * — las comprobaciones de aquí son conveniencia de UX, nunca la única barrera.
 *
 * Nota deliberada: este archivo no contiene ningún contenido político real
 * ni de ejemplo. Es solo la capa de datos.
 */
import { supabase } from '$lib/supabase/client';
import type {
	ListeningSurveyAreaType,
	ListeningSurveyCountRow,
	ListeningSurveyResponse,
	ListeningSurveyTerritoryRow
} from '$lib/types';

interface SurveyResponseRow {
	id: string;
	round_id: string;
	user_id: string;
	problems: string[];
	other_problem_text: string | null;
	main_cause: string | null;
	prioritized_measure_ids: string[];
	commitment_most_urgent_id: string | null;
	commitment_most_difficult_id: string | null;
	missing_improvement: string | null;
	community: string | null;
	area_type: string | null;
	created_at: string;
	updated_at: string;
}

function rowToSurveyResponse(row: SurveyResponseRow): ListeningSurveyResponse {
	return {
		id: row.id,
		roundId: row.round_id,
		userId: row.user_id,
		problems: row.problems ?? [],
		otherProblemText: row.other_problem_text ?? undefined,
		mainCause: row.main_cause ?? undefined,
		prioritizedMeasureIds: row.prioritized_measure_ids ?? [],
		commitmentMostUrgentId: row.commitment_most_urgent_id ?? undefined,
		commitmentMostDifficultId: row.commitment_most_difficult_id ?? undefined,
		missingImprovement: row.missing_improvement ?? undefined,
		community: row.community ?? undefined,
		areaType: (row.area_type as ListeningSurveyAreaType) ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/** Mi propia respuesta a la ronda (o ninguna). Requiere sesión — se resuelve siempre en el cliente. */
export async function getMyListeningSurveyResponse(
	roundId: string
): Promise<ListeningSurveyResponse | undefined> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return undefined;

	const { data, error } = await supabase
		.from('concern_listening_survey_responses')
		.select('*')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id)
		.maybeSingle();
	if (error || !data) return undefined;
	return rowToSurveyResponse(data);
}

export interface ListeningSurveyInput {
	problems: string[];
	otherProblemText?: string;
	mainCause?: string;
	prioritizedMeasureIds: string[];
	commitmentMostUrgentId?: string;
	commitmentMostDifficultId?: string;
	missingImprovement?: string;
	community?: string;
	areaType?: ListeningSurveyAreaType;
}

/** Guarda o actualiza mi respuesta. Único punto de escritura: `set_concern_listening_survey_response` (usa `auth.uid()` interno). */
export async function setListeningSurveyResponse(
	roundId: string,
	input: ListeningSurveyInput
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_concern_listening_survey_response', {
		p_round_id: roundId,
		p_problems: input.problems,
		p_other_problem_text: input.otherProblemText ?? undefined,
		p_main_cause: input.mainCause ?? undefined,
		p_prioritized_measure_ids: input.prioritizedMeasureIds,
		p_commitment_most_urgent_id: input.commitmentMostUrgentId ?? undefined,
		p_commitment_most_difficult_id: input.commitmentMostDifficultId ?? undefined,
		p_missing_improvement: input.missingImprovement ?? undefined,
		p_community: input.community ?? undefined,
		p_area_type: input.areaType ?? undefined
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu respuesta.');
}

// ---------------------------------------------------------------------------
// Resultados agregados (nunca exponen respuestas individuales)
// ---------------------------------------------------------------------------

export async function getListeningSurveyTotal(roundId: string): Promise<number> {
	const { data, error } = await supabase.rpc('get_concern_listening_survey_total', {
		p_round_id: roundId
	});
	if (error) throw error;
	return data ?? 0;
}

export async function getListeningSurveySummary(
	roundId: string
): Promise<ListeningSurveyCountRow[]> {
	const { data, error } = await supabase.rpc('get_concern_listening_survey_summary', {
		p_round_id: roundId
	});
	if (error) throw error;
	return (data ?? []).map((row) => ({
		dimension: row.dimension as ListeningSurveyCountRow['dimension'],
		code: row.code,
		responseCount: row.response_count
	}));
}

export async function getListeningSurveyTerritoryBreakdown(
	roundId: string,
	minThreshold = 30
): Promise<ListeningSurveyTerritoryRow[]> {
	const { data, error } = await supabase.rpc('get_concern_listening_survey_territory_breakdown', {
		p_round_id: roundId,
		p_min_threshold: minThreshold
	});
	if (error) throw error;
	return (data ?? []).map((row) => ({
		community: row.community,
		responseCount: row.response_count
	}));
}
