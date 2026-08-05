/**
 * Capa de acceso a datos de la participación ciudadana sobre un tema
 * (rondas, respuestas por medida, valoración general, prioridades,
 * contexto voluntario y propuestas desarrolladas).
 *
 * La autorización real vive en las políticas RLS y en las funciones
 * `SECURITY DEFINER` de `supabase/migrations/0031_pulso_participacion_vivienda.sql`
 * (`set_measure_participation_response`, `set_general_participation_response`,
 * `set_response_priorities`, `set_participant_context`) — las comprobaciones
 * de aquí son conveniencia de UX, nunca la única barrera.
 *
 * Nota deliberada: este archivo no contiene ningún contenido político real
 * ni de ejemplo. Es solo la capa de datos.
 */
import { supabase } from '$lib/supabase/client';
import type {
	GeneralParticipationResponse,
	GeneralParticipationResults,
	GeneralPosition,
	HousingSituation,
	InvestmentOpinion,
	MeasureParticipationResponse,
	MeasureParticipationResults,
	MeasurePosition,
	MeasureUrgency,
	PacePreference,
	ParticipantContext,
	ParticipationRound,
	ParticipationRoundStatus,
	ParticipationSummary,
	PriorityResult,
	ResponsePriority
} from '$lib/types';

// ---------------------------------------------------------------------------
// Mapeo de filas
// ---------------------------------------------------------------------------

interface RoundRow {
	id: string;
	topic_id: string;
	version_label: string;
	status: string;
	opens_at: string | null;
	closes_at: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

function rowToRound(row: RoundRow): ParticipationRound {
	return {
		id: row.id,
		topicId: row.topic_id,
		versionLabel: row.version_label,
		status: row.status as ParticipationRoundStatus,
		opensAt: row.opens_at ?? undefined,
		closesAt: row.closes_at ?? undefined,
		createdBy: row.created_by ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface MeasureResponseRow {
	id: string;
	round_id: string;
	measure_id: string;
	user_id: string;
	position_value: string;
	reason_code: string | null;
	reason_other: string | null;
	comment: string | null;
	urgency: string | null;
	quick_change: string | null;
	created_at: string;
	updated_at: string;
}

function rowToMeasureResponse(row: MeasureResponseRow): MeasureParticipationResponse {
	return {
		id: row.id,
		roundId: row.round_id,
		measureId: row.measure_id,
		userId: row.user_id,
		position: row.position_value as MeasurePosition,
		reasonCode: row.reason_code ?? undefined,
		reasonOther: row.reason_other ?? undefined,
		comment: row.comment ?? undefined,
		urgency: (row.urgency as MeasureUrgency) ?? undefined,
		quickChange: row.quick_change ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface GeneralResponseRow {
	id: string;
	round_id: string;
	user_id: string;
	general_position: string;
	investment_opinion: string | null;
	pace_preference: string | null;
	unaddressed_problem: string | null;
	measures_considered_count: number;
	created_at: string;
	updated_at: string;
}

function rowToGeneralResponse(row: GeneralResponseRow): GeneralParticipationResponse {
	return {
		id: row.id,
		roundId: row.round_id,
		userId: row.user_id,
		generalPosition: row.general_position as GeneralPosition,
		investmentOpinion: (row.investment_opinion as InvestmentOpinion) ?? undefined,
		pacePreference: (row.pace_preference as PacePreference) ?? undefined,
		unaddressedProblem: row.unaddressed_problem ?? undefined,
		measuresConsideredCount: row.measures_considered_count,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface PriorityRow {
	id: string;
	round_id: string;
	user_id: string;
	measure_id: string;
	rank: number;
	created_at: string;
}

function rowToPriority(row: PriorityRow): ResponsePriority {
	return {
		id: row.id,
		roundId: row.round_id,
		userId: row.user_id,
		measureId: row.measure_id,
		rank: row.rank as 1 | 2 | 3,
		createdAt: row.created_at
	};
}

interface ContextRow {
	id: string;
	round_id: string;
	user_id: string;
	community: string | null;
	housing_situation: string | null;
	created_at: string;
	updated_at: string;
}

function rowToContext(row: ContextRow): ParticipantContext {
	return {
		id: row.id,
		roundId: row.round_id,
		userId: row.user_id,
		community: row.community ?? undefined,
		housingSituation: (row.housing_situation as HousingSituation) ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

// ---------------------------------------------------------------------------
// Rondas de participación
// ---------------------------------------------------------------------------

/** La ronda más reciente de un tema (visible según RLS: pública si no está en `draft`, o cualquiera para staff). */
export async function getLatestRound(topicId: string): Promise<ParticipationRound | undefined> {
	const { data, error } = await supabase
		.from('participation_rounds')
		.select('*')
		.eq('topic_id', topicId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error || !data) return undefined;
	return rowToRound(data);
}

export async function listRounds(topicId: string): Promise<ParticipationRound[]> {
	const { data, error } = await supabase
		.from('participation_rounds')
		.select('*')
		.eq('topic_id', topicId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToRound);
}

export interface ParticipationRoundInput {
	versionLabel: string;
	opensAt?: string;
	closesAt?: string;
}

export async function createParticipationRound(
	topicId: string,
	input: ParticipationRoundInput,
	createdBy: string
): Promise<ParticipationRound> {
	const { data, error } = await supabase
		.from('participation_rounds')
		.insert({
			topic_id: topicId,
			version_label: input.versionLabel.trim(),
			opens_at: input.opensAt ?? null,
			closes_at: input.closesAt ?? null,
			created_by: createdBy
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToRound(data);
}

export async function setRoundStatus(
	roundId: string,
	status: ParticipationRoundStatus
): Promise<ParticipationRound> {
	const { data, error } = await supabase
		.from('participation_rounds')
		.update({
			status,
			...(status === 'open' ? { opens_at: new Date().toISOString() } : {}),
			...(status === 'closed' ? { closes_at: new Date().toISOString() } : {})
		})
		.eq('id', roundId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToRound(data);
}

// ---------------------------------------------------------------------------
// Participación por medida
// ---------------------------------------------------------------------------

export interface MeasureParticipationInput {
	position: MeasurePosition;
	reasonCode?: string;
	reasonOther?: string;
	comment?: string;
	urgency?: MeasureUrgency;
	quickChange?: string;
}

/** Emite o cambia mi respuesta a una medida. Único punto de escritura: `set_measure_participation_response` (usa `auth.uid()` interno). */
export async function setMeasureParticipationResponse(
	roundId: string,
	measureId: string,
	input: MeasureParticipationInput
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_measure_participation_response', {
		p_round_id: roundId,
		p_measure_id: measureId,
		p_position: input.position,
		p_reason_code: input.reasonCode ?? undefined,
		p_reason_other: input.reasonOther ?? undefined,
		p_comment: input.comment ?? undefined,
		p_urgency: input.urgency ?? undefined,
		p_quick_change: input.quickChange ?? undefined
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu respuesta.');
}

/** Mis respuestas a las medidas de una ronda (para progreso y precarga). Requiere sesión — se resuelve siempre en el cliente. */
export async function listMyMeasureParticipationResponses(
	roundId: string
): Promise<Map<string, MeasureParticipationResponse>> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return new Map();

	const { data, error } = await supabase
		.from('measure_participation_responses')
		.select('*')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id);
	if (error) throw error;
	return new Map((data ?? []).map((row) => [row.measure_id, rowToMeasureResponse(row)]));
}

// ---------------------------------------------------------------------------
// Valoración general
// ---------------------------------------------------------------------------

export interface GeneralParticipationInput {
	generalPosition: GeneralPosition;
	/** Pregunta específica de Vivienda. Ausente en propuestas más simples como Sanidad. */
	investmentOpinion?: InvestmentOpinion;
	/** Pregunta específica de Vivienda. Ausente en propuestas más simples como Sanidad. */
	pacePreference?: PacePreference;
	unaddressedProblem?: string;
}

export async function setGeneralParticipationResponse(
	roundId: string,
	input: GeneralParticipationInput
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_general_participation_response', {
		p_round_id: roundId,
		p_general_position: input.generalPosition,
		p_investment_opinion: input.investmentOpinion ?? undefined,
		p_pace_preference: input.pacePreference ?? undefined,
		p_unaddressed_problem: input.unaddressedProblem ?? undefined
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu valoración general.');
}

export async function getMyGeneralParticipationResponse(
	roundId: string
): Promise<GeneralParticipationResponse | undefined> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return undefined;

	const { data, error } = await supabase
		.from('general_participation_responses')
		.select('*')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id)
		.maybeSingle();
	if (error || !data) return undefined;
	return rowToGeneralResponse(data);
}

// ---------------------------------------------------------------------------
// Prioridades ordenadas
// ---------------------------------------------------------------------------

/** `measureIds` en orden de prioridad (máximo 3, sin duplicados). Vacío = borra la selección. */
export async function setResponsePriorities(roundId: string, measureIds: string[]): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_response_priorities', {
		p_round_id: roundId,
		p_measure_ids: measureIds
	});
	if (error)
		throw new Error(error.message || 'No se ha podido guardar tu selección de prioridades.');
}

export async function getMyResponsePriorities(roundId: string): Promise<ResponsePriority[]> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return [];

	const { data, error } = await supabase
		.from('response_priorities')
		.select('*')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id)
		.order('rank', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToPriority);
}

// ---------------------------------------------------------------------------
// Contexto voluntario
// ---------------------------------------------------------------------------

export interface ParticipantContextInput {
	community?: string;
	housingSituation?: HousingSituation;
}

export async function setParticipantContext(
	roundId: string,
	input: ParticipantContextInput
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para participar.');
	}
	const { error } = await supabase.rpc('set_participant_context', {
		p_round_id: roundId,
		p_community: input.community ?? undefined,
		p_housing_situation: input.housingSituation ?? undefined
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu contexto.');
}

export async function getMyParticipantContext(
	roundId: string
): Promise<ParticipantContext | undefined> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return undefined;

	const { data, error } = await supabase
		.from('participant_contexts')
		.select('*')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id)
		.maybeSingle();
	if (error || !data) return undefined;
	return rowToContext(data);
}

// ---------------------------------------------------------------------------
// Resultados agregados (nunca exponen respuestas individuales)
// ---------------------------------------------------------------------------

const EMPTY_POSITION_COUNTS = { favor: 0, con_cambios: 0, en_contra: 0, mas_info: 0 };

export async function getMeasureParticipationResults(
	roundId: string,
	measureIds: string[]
): Promise<Map<string, MeasureParticipationResults>> {
	const results = new Map<string, MeasureParticipationResults>();
	for (const id of measureIds) {
		results.set(id, {
			measureId: id,
			positionCounts: { ...EMPTY_POSITION_COUNTS },
			urgencyCounts: {},
			reasonCounts: {},
			totalResponses: 0
		});
	}
	if (measureIds.length === 0) return results;

	const [positionRes, urgencyRes, reasonRes] = await Promise.all([
		supabase.rpc('get_measure_position_counts', { p_round_id: roundId, p_measure_ids: measureIds }),
		supabase.rpc('get_measure_urgency_counts', { p_round_id: roundId, p_measure_ids: measureIds }),
		supabase.rpc('get_measure_reason_counts', { p_round_id: roundId, p_measure_ids: measureIds })
	]);
	if (positionRes.error) throw positionRes.error;
	if (urgencyRes.error) throw urgencyRes.error;
	if (reasonRes.error) throw reasonRes.error;

	for (const row of positionRes.data ?? []) {
		const r = results.get(row.measure_id);
		if (r) {
			r.positionCounts[row.position_value as MeasurePosition] = row.response_count;
			r.totalResponses += row.response_count;
		}
	}
	for (const row of urgencyRes.data ?? []) {
		const r = results.get(row.measure_id);
		if (r) r.urgencyCounts[row.urgency as MeasureUrgency] = row.response_count;
	}
	for (const row of reasonRes.data ?? []) {
		const r = results.get(row.measure_id);
		if (r) r.reasonCounts[row.reason_code] = row.response_count;
	}
	return results;
}

export async function getGeneralParticipationResults(
	roundId: string
): Promise<GeneralParticipationResults> {
	const { data, error } = await supabase.rpc('get_general_participation_results', {
		p_round_id: roundId
	});
	if (error) throw error;
	const results: GeneralParticipationResults = {
		generalPosition: {},
		investmentOpinion: {},
		pacePreference: {}
	};
	for (const row of data ?? []) {
		if (row.dimension === 'general_position') {
			results.generalPosition[row.value as GeneralPosition] = row.response_count;
		} else if (row.dimension === 'investment_opinion') {
			results.investmentOpinion[row.value as InvestmentOpinion] = row.response_count;
		} else if (row.dimension === 'pace_preference') {
			results.pacePreference[row.value as PacePreference] = row.response_count;
		}
	}
	return results;
}

export async function getPriorityResults(roundId: string): Promise<PriorityResult[]> {
	const { data, error } = await supabase.rpc('get_priority_results', { p_round_id: roundId });
	if (error) throw error;
	return (data ?? [])
		.map((row) => ({ measureId: row.measure_id, timesTop3: row.times_top3, avgRank: row.avg_rank }))
		.sort((a, b) => b.timesTop3 - a.timesTop3);
}

export async function getParticipationSummary(roundId: string): Promise<ParticipationSummary> {
	const { data, error } = await supabase.rpc('get_participation_summary', { p_round_id: roundId });
	if (error) throw error;
	const row = data?.[0];
	return {
		uniqueParticipants: row?.unique_participants ?? 0,
		totalMeasureResponses: row?.total_measure_responses ?? 0,
		totalGeneralResponses: row?.total_general_responses ?? 0,
		proposalsReceived: row?.proposals_received ?? 0,
		proposalsPublished: row?.proposals_published ?? 0,
		lastUpdatedAt: row?.last_updated_at ?? undefined
	};
}
