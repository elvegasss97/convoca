/**
 * Capa de acceso a datos de "Temas" (Preocupaciones → Soluciones), sobre
 * Supabase. La autorización real vive en las políticas RLS y en las
 * funciones `SECURITY DEFINER` de `supabase/migrations/0027_pulso_temas.sql`
 * (`set_measure_response`, `get_measure_results`) — las comprobaciones de
 * aquí son conveniencia de UX, nunca la única barrera.
 *
 * Nota deliberada: este archivo no contiene ningún contenido político real
 * ni de ejemplo. Es solo la capa de datos.
 */
import { supabase } from '$lib/supabase/client';
import type { Concern } from '$lib/types';
import type {
	MeasurePriority,
	MeasureResults,
	MeasureStance,
	MeasureStanceCounts,
	MyMeasureResponse,
	Topic,
	TopicDataPoint,
	TopicMeasure,
	TopicMeasureAlternative,
	TopicMeasureAlternativeStatus,
	TopicMeasureAxis,
	TopicRisk,
	TopicSource,
	TopicStatus,
	TopicTimelinePhase,
	TopicVersion
} from '$lib/types';
import { randomId } from '$lib/utils/id';
import { rowToConcern } from './concernsService';

// ---------------------------------------------------------------------------
// Mapeo de filas
// ---------------------------------------------------------------------------

interface TopicRow {
	id: string;
	slug: string;
	title: string;
	summary: string;
	category: string | null;
	cover_image_url: string | null;
	status: string;
	document_title: string | null;
	problem_intro: string;
	budget_narrative: string | null;
	evaluation_rules: string | null;
	investment_range: string | null;
	investment_gdp_percent: string | null;
	reference_goal: string | null;
	governance_narrative: string | null;
	public_notice: string | null;
	risks_overview: string[];
	success_indicators: string[];
	version: string;
	published_at: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

function rowToTopic(row: TopicRow): Topic {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		summary: row.summary,
		category: (row.category as Topic['category']) ?? undefined,
		coverImageUrl: row.cover_image_url ?? undefined,
		status: row.status as TopicStatus,
		documentTitle: row.document_title ?? undefined,
		problemIntro: row.problem_intro,
		budgetNarrative: row.budget_narrative ?? undefined,
		evaluationRules: row.evaluation_rules ?? undefined,
		investmentRange: row.investment_range ?? undefined,
		investmentGdpPercent: row.investment_gdp_percent ?? undefined,
		referenceGoal: row.reference_goal ?? undefined,
		governanceNarrative: row.governance_narrative ?? undefined,
		publicNotice: row.public_notice ?? undefined,
		risksOverview: row.risks_overview ?? [],
		successIndicators: row.success_indicators ?? [],
		version: row.version,
		publishedAt: row.published_at ?? undefined,
		createdBy: row.created_by ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface SourceRow {
	id: string;
	topic_id: string;
	label: string;
	url: string | null;
	note: string | null;
	sort_order: number;
	created_at: string;
}

function rowToSource(row: SourceRow): TopicSource {
	return {
		id: row.id,
		topicId: row.topic_id,
		label: row.label,
		url: row.url ?? undefined,
		note: row.note ?? undefined,
		sortOrder: row.sort_order,
		createdAt: row.created_at
	};
}

interface DataPointRow {
	id: string;
	topic_id: string;
	label: string;
	value: string;
	explanation: string | null;
	time_scope: string | null;
	source_id: string | null;
	sort_order: number;
	created_at: string;
}

function rowToDataPoint(row: DataPointRow): TopicDataPoint {
	return {
		id: row.id,
		topicId: row.topic_id,
		label: row.label,
		value: row.value,
		explanation: row.explanation ?? undefined,
		timeScope: row.time_scope ?? undefined,
		sourceId: row.source_id ?? undefined,
		sortOrder: row.sort_order,
		createdAt: row.created_at
	};
}

interface MeasureRow {
	id: string;
	topic_id: string;
	axis_id: string | null;
	title: string;
	summary: string | null;
	problem_addressed: string | null;
	explanation: string;
	how_it_works: string | null;
	responsible_scope: string | null;
	estimated_cost: string | null;
	timeframe: string | null;
	arguments_for: string | null;
	risks: string | null;
	indicators: string[];
	safeguard: string | null;
	sort_order: number;
	is_published: boolean;
	created_at: string;
	updated_at: string;
}

function rowToMeasure(row: MeasureRow): TopicMeasure {
	return {
		id: row.id,
		topicId: row.topic_id,
		axisId: row.axis_id ?? undefined,
		title: row.title,
		summary: row.summary ?? undefined,
		problemAddressed: row.problem_addressed ?? undefined,
		explanation: row.explanation,
		howItWorks: row.how_it_works ?? undefined,
		responsibleScope: row.responsible_scope ?? undefined,
		estimatedCost: row.estimated_cost ?? undefined,
		timeframe: row.timeframe ?? undefined,
		argumentsFor: row.arguments_for ?? undefined,
		risks: row.risks ?? undefined,
		indicators: row.indicators ?? [],
		safeguard: row.safeguard ?? undefined,
		sortOrder: row.sort_order,
		isPublished: row.is_published,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface AxisRow {
	id: string;
	topic_id: string;
	title: string;
	sort_order: number;
	created_at: string;
}

function rowToAxis(row: AxisRow): TopicMeasureAxis {
	return {
		id: row.id,
		topicId: row.topic_id,
		title: row.title,
		sortOrder: row.sort_order,
		createdAt: row.created_at
	};
}

interface TimelinePhaseRow {
	id: string;
	topic_id: string;
	title: string;
	description: string;
	items: string[];
	sort_order: number;
	created_at: string;
	updated_at: string;
}

function rowToTimelinePhase(row: TimelinePhaseRow): TopicTimelinePhase {
	return {
		id: row.id,
		topicId: row.topic_id,
		title: row.title,
		description: row.description,
		items: row.items ?? [],
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface RiskRow {
	id: string;
	topic_id: string;
	title: string;
	description: string | null;
	signals: string | null;
	mitigation: string | null;
	decision_trigger: string | null;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

function rowToRisk(row: RiskRow): TopicRisk {
	return {
		id: row.id,
		topicId: row.topic_id,
		title: row.title,
		description: row.description ?? undefined,
		signals: row.signals ?? undefined,
		mitigation: row.mitigation ?? undefined,
		decisionTrigger: row.decision_trigger ?? undefined,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

interface VersionRow {
	id: string;
	topic_id: string;
	version_label: string;
	note: string | null;
	published_by: string | null;
	published_at: string;
}

function rowToVersion(row: VersionRow): TopicVersion {
	return {
		id: row.id,
		topicId: row.topic_id,
		versionLabel: row.version_label,
		note: row.note ?? undefined,
		publishedBy: row.published_by ?? undefined,
		publishedAt: row.published_at
	};
}

interface AlternativeRow {
	id: string;
	topic_id: string;
	measure_id: string | null;
	round_id: string | null;
	proposer_user_id: string;
	title: string;
	description: string;
	status: string;
	measure_part: string | null;
	reason: string | null;
	expected_effect: string | null;
	acknowledged_risks: string | null;
	source_url: string | null;
	editorial_response: string | null;
	linked_version_label: string | null;
	reviewer_note: string | null;
	reviewed_by: string | null;
	reviewed_at: string | null;
	created_at: string;
	updated_at: string;
}

function rowToAlternative(row: AlternativeRow): TopicMeasureAlternative {
	return {
		id: row.id,
		topicId: row.topic_id,
		measureId: row.measure_id ?? undefined,
		roundId: row.round_id ?? undefined,
		proposerUserId: row.proposer_user_id,
		title: row.title,
		description: row.description,
		status: row.status as TopicMeasureAlternativeStatus,
		measurePart: row.measure_part ?? undefined,
		reason: row.reason ?? undefined,
		expectedEffect: row.expected_effect ?? undefined,
		acknowledgedRisks: row.acknowledged_risks ?? undefined,
		sourceUrl: row.source_url ?? undefined,
		editorialResponse: row.editorial_response ?? undefined,
		linkedVersionLabel: row.linked_version_label ?? undefined,
		reviewerNote: row.reviewer_note ?? undefined,
		reviewedBy: row.reviewed_by ?? undefined,
		reviewedAt: row.reviewed_at ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

const EMPTY_STANCE_COUNTS: MeasureStanceCounts = { favor: 0, en_contra: 0, modificaria: 0 };

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
// Temas — lectura
// ---------------------------------------------------------------------------

export interface ListTopicsOptions {
	/** Sin filtro: RLS decide (público solo ve 'open'/'reviewed', moderación/administración ven todo). */
	status?: TopicStatus;
}

export async function listTopics(options: ListTopicsOptions = {}): Promise<Topic[]> {
	let query = supabase.from('topics').select('*').order('created_at', { ascending: false });
	if (options.status) query = query.eq('status', options.status);
	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []).map(rowToTopic);
}

export async function listPublishedTopics(): Promise<Topic[]> {
	const { data, error } = await supabase
		.from('topics')
		.select('*')
		.in('status', ['open', 'reviewed'])
		.order('published_at', { ascending: false, nullsFirst: false });
	if (error) throw error;
	return (data ?? []).map(rowToTopic);
}

export async function getTopicBySlug(slug: string): Promise<Topic | undefined> {
	const { data, error } = await supabase.from('topics').select('*').eq('slug', slug).maybeSingle();
	if (error || !data) return undefined;
	return rowToTopic(data);
}

export async function getTopicById(id: string): Promise<Topic | undefined> {
	const { data, error } = await supabase.from('topics').select('*').eq('id', id).maybeSingle();
	if (error || !data) return undefined;
	return rowToTopic(data);
}

// ---------------------------------------------------------------------------
// Temas — gestión (moderación/administración, protegido por RLS `*_staff`)
// ---------------------------------------------------------------------------

export interface TopicInput {
	title: string;
	summary: string;
	category?: Topic['category'];
	coverImageUrl?: string;
	status: TopicStatus;
	documentTitle?: string;
	problemIntro: string;
	budgetNarrative?: string;
	evaluationRules?: string;
	investmentRange?: string;
	investmentGdpPercent?: string;
	referenceGoal?: string;
	governanceNarrative?: string;
	publicNotice?: string;
	risksOverview: string[];
	successIndicators: string[];
	version: string;
}

export async function createTopic(input: TopicInput, createdBy: string): Promise<Topic> {
	const slug = `${slugify(input.title).slice(0, 60).replace(/-$/, '')}-${randomSlugSuffix()}`;
	const { data, error } = await supabase
		.from('topics')
		.insert({
			slug,
			title: input.title.trim(),
			summary: input.summary.trim(),
			category: input.category ?? null,
			cover_image_url: input.coverImageUrl?.trim() || null,
			status: input.status,
			document_title: input.documentTitle?.trim() || null,
			problem_intro: input.problemIntro.trim(),
			budget_narrative: input.budgetNarrative?.trim() || null,
			evaluation_rules: input.evaluationRules?.trim() || null,
			investment_range: input.investmentRange?.trim() || null,
			investment_gdp_percent: input.investmentGdpPercent?.trim() || null,
			reference_goal: input.referenceGoal?.trim() || null,
			governance_narrative: input.governanceNarrative?.trim() || null,
			public_notice: input.publicNotice?.trim() || null,
			risks_overview: input.risksOverview.map((r) => r.trim()).filter(Boolean),
			success_indicators: input.successIndicators.map((s) => s.trim()).filter(Boolean),
			version: input.version.trim() || '1',
			published_at:
				input.status === 'open' || input.status === 'reviewed' ? new Date().toISOString() : null,
			created_by: createdBy
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToTopic(data);
}

export async function updateTopic(
	id: string,
	input: TopicInput,
	previousStatus: TopicStatus
): Promise<Topic> {
	const nowPublished = input.status === 'open' || input.status === 'reviewed';
	const wasPublished = previousStatus === 'open' || previousStatus === 'reviewed';
	const { data, error } = await supabase
		.from('topics')
		.update({
			title: input.title.trim(),
			summary: input.summary.trim(),
			category: input.category ?? null,
			cover_image_url: input.coverImageUrl?.trim() || null,
			status: input.status,
			document_title: input.documentTitle?.trim() || null,
			problem_intro: input.problemIntro.trim(),
			budget_narrative: input.budgetNarrative?.trim() || null,
			evaluation_rules: input.evaluationRules?.trim() || null,
			investment_range: input.investmentRange?.trim() || null,
			investment_gdp_percent: input.investmentGdpPercent?.trim() || null,
			reference_goal: input.referenceGoal?.trim() || null,
			governance_narrative: input.governanceNarrative?.trim() || null,
			public_notice: input.publicNotice?.trim() || null,
			risks_overview: input.risksOverview.map((r) => r.trim()).filter(Boolean),
			success_indicators: input.successIndicators.map((s) => s.trim()).filter(Boolean),
			version: input.version.trim() || '1',
			// Fija published_at la primera vez que pasa a un estado público; nunca la borra después.
			...(nowPublished && !wasPublished ? { published_at: new Date().toISOString() } : {})
		})
		.eq('id', id)
		.select('*')
		.single();
	if (error) throw error;
	return rowToTopic(data);
}

// ---------------------------------------------------------------------------
// Fuentes verificables
// ---------------------------------------------------------------------------

export async function listTopicSources(topicId: string): Promise<TopicSource[]> {
	const { data, error } = await supabase
		.from('topic_sources')
		.select('*')
		.eq('topic_id', topicId)
		.order('sort_order', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToSource);
}

export interface TopicSourceInput {
	label: string;
	url?: string;
	note?: string;
	sortOrder?: number;
}

export async function createTopicSource(
	topicId: string,
	input: TopicSourceInput
): Promise<TopicSource> {
	const { data, error } = await supabase
		.from('topic_sources')
		.insert({
			topic_id: topicId,
			label: input.label.trim(),
			url: input.url?.trim() || null,
			note: input.note?.trim() || null,
			sort_order: input.sortOrder ?? 0
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToSource(data);
}

export async function deleteTopicSource(sourceId: string): Promise<void> {
	const { error } = await supabase.from('topic_sources').delete().eq('id', sourceId);
	if (error) throw error;
}

// ---------------------------------------------------------------------------
// Datos destacados
// ---------------------------------------------------------------------------

export async function listTopicDataPoints(topicId: string): Promise<TopicDataPoint[]> {
	const { data, error } = await supabase
		.from('topic_data_points')
		.select('*')
		.eq('topic_id', topicId)
		.order('sort_order', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToDataPoint);
}

export interface TopicDataPointInput {
	label: string;
	value: string;
	explanation?: string;
	timeScope?: string;
	sourceId?: string;
	sortOrder?: number;
}

export async function createTopicDataPoint(
	topicId: string,
	input: TopicDataPointInput
): Promise<TopicDataPoint> {
	const { data, error } = await supabase
		.from('topic_data_points')
		.insert({
			topic_id: topicId,
			label: input.label.trim(),
			value: input.value.trim(),
			explanation: input.explanation?.trim() || null,
			time_scope: input.timeScope?.trim() || null,
			source_id: input.sourceId ?? null,
			sort_order: input.sortOrder ?? 0
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToDataPoint(data);
}

export async function deleteTopicDataPoint(dataPointId: string): Promise<void> {
	const { error } = await supabase.from('topic_data_points').delete().eq('id', dataPointId);
	if (error) throw error;
}

// ---------------------------------------------------------------------------
// Preguntas de Pulso vinculadas ("lo que dice la ciudadanía")
// ---------------------------------------------------------------------------

export async function listTopicConcerns(topicId: string): Promise<Concern[]> {
	const { data: links, error: linkError } = await supabase
		.from('topic_concerns')
		.select('concern_id')
		.eq('topic_id', topicId)
		.order('sort_order', { ascending: true });
	if (linkError) throw linkError;
	const concernIds = (links ?? []).map((l) => l.concern_id);
	if (concernIds.length === 0) return [];

	const { data, error } = await supabase.from('concerns').select('*').in('id', concernIds);
	if (error) throw error;
	const byId = new Map((data ?? []).map((row) => [row.id, rowToConcern(row)]));
	// Conserva el orden de vinculación (sort_order), no el de la consulta `in`.
	return concernIds.map((id) => byId.get(id)).filter((c): c is Concern => Boolean(c));
}

export async function linkTopicConcern(topicId: string, concernId: string): Promise<void> {
	const { error } = await supabase
		.from('topic_concerns')
		.insert({ topic_id: topicId, concern_id: concernId });
	if (error) throw error;
}

export async function unlinkTopicConcern(topicId: string, concernId: string): Promise<void> {
	const { error } = await supabase
		.from('topic_concerns')
		.delete()
		.eq('topic_id', topicId)
		.eq('concern_id', concernId);
	if (error) throw error;
}

// ---------------------------------------------------------------------------
// Ejes — agrupación visual de medidas
// ---------------------------------------------------------------------------

export async function listTopicMeasureAxes(topicId: string): Promise<TopicMeasureAxis[]> {
	const { data, error } = await supabase
		.from('topic_measure_axes')
		.select('*')
		.eq('topic_id', topicId)
		.order('sort_order', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToAxis);
}

export interface TopicMeasureAxisInput {
	title: string;
	sortOrder?: number;
}

export async function createTopicMeasureAxis(
	topicId: string,
	input: TopicMeasureAxisInput
): Promise<TopicMeasureAxis> {
	const { data, error } = await supabase
		.from('topic_measure_axes')
		.insert({
			topic_id: topicId,
			title: input.title.trim(),
			sort_order: input.sortOrder ?? 0
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToAxis(data);
}

export async function updateTopicMeasureAxis(
	axisId: string,
	input: TopicMeasureAxisInput
): Promise<TopicMeasureAxis> {
	const { data, error } = await supabase
		.from('topic_measure_axes')
		.update({
			title: input.title.trim(),
			...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {})
		})
		.eq('id', axisId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToAxis(data);
}

export async function deleteTopicMeasureAxis(axisId: string): Promise<void> {
	const { error } = await supabase.from('topic_measure_axes').delete().eq('id', axisId);
	if (error) throw error;
}

// ---------------------------------------------------------------------------
// Medidas ("Soluciones")
// ---------------------------------------------------------------------------

export async function listTopicMeasures(topicId: string): Promise<TopicMeasure[]> {
	const { data, error } = await supabase
		.from('topic_measures')
		.select('*')
		.eq('topic_id', topicId)
		.order('sort_order', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToMeasure);
}

export interface TopicMeasureInput {
	axisId?: string;
	title: string;
	summary?: string;
	problemAddressed?: string;
	explanation: string;
	howItWorks?: string;
	responsibleScope?: string;
	estimatedCost?: string;
	timeframe?: string;
	argumentsFor?: string;
	risks?: string;
	indicators: string[];
	safeguard?: string;
	isPublished: boolean;
}

export async function createTopicMeasure(
	topicId: string,
	input: TopicMeasureInput,
	sortOrder: number
): Promise<TopicMeasure> {
	const { data, error } = await supabase
		.from('topic_measures')
		.insert({
			topic_id: topicId,
			axis_id: input.axisId || null,
			title: input.title.trim(),
			summary: input.summary?.trim() || null,
			problem_addressed: input.problemAddressed?.trim() || null,
			explanation: input.explanation.trim(),
			how_it_works: input.howItWorks?.trim() || null,
			responsible_scope: input.responsibleScope?.trim() || null,
			estimated_cost: input.estimatedCost?.trim() || null,
			timeframe: input.timeframe?.trim() || null,
			arguments_for: input.argumentsFor?.trim() || null,
			risks: input.risks?.trim() || null,
			indicators: input.indicators.map((i) => i.trim()).filter(Boolean),
			safeguard: input.safeguard?.trim() || null,
			is_published: input.isPublished,
			sort_order: sortOrder
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToMeasure(data);
}

export async function updateTopicMeasure(
	measureId: string,
	input: TopicMeasureInput
): Promise<TopicMeasure> {
	const { data, error } = await supabase
		.from('topic_measures')
		.update({
			axis_id: input.axisId || null,
			title: input.title.trim(),
			summary: input.summary?.trim() || null,
			problem_addressed: input.problemAddressed?.trim() || null,
			explanation: input.explanation.trim(),
			how_it_works: input.howItWorks?.trim() || null,
			responsible_scope: input.responsibleScope?.trim() || null,
			estimated_cost: input.estimatedCost?.trim() || null,
			timeframe: input.timeframe?.trim() || null,
			arguments_for: input.argumentsFor?.trim() || null,
			risks: input.risks?.trim() || null,
			indicators: input.indicators.map((i) => i.trim()).filter(Boolean),
			safeguard: input.safeguard?.trim() || null,
			is_published: input.isPublished
		})
		.eq('id', measureId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToMeasure(data);
}

export async function reorderTopicMeasure(measureId: string, sortOrder: number): Promise<void> {
	const { error } = await supabase
		.from('topic_measures')
		.update({ sort_order: sortOrder })
		.eq('id', measureId);
	if (error) throw error;
}

export async function deleteTopicMeasure(measureId: string): Promise<void> {
	const { error } = await supabase.from('topic_measures').delete().eq('id', measureId);
	if (error) throw error;
}

/** Resultados agregados (recuento por postura) vía `get_measure_results`. Nunca expone valoraciones individuales. */
export async function getMeasureResults(
	measureIds: string[]
): Promise<Map<string, MeasureResults>> {
	if (measureIds.length === 0) return new Map();
	const { data, error } = await supabase.rpc('get_measure_results', { p_measure_ids: measureIds });
	if (error) throw error;

	const byMeasure = new Map<string, MeasureStanceCounts>();
	for (const id of measureIds) byMeasure.set(id, { ...EMPTY_STANCE_COUNTS });
	for (const row of data ?? []) {
		const counts = byMeasure.get(row.measure_id);
		if (counts) counts[row.stance as MeasureStance] = row.response_count;
	}

	const results = new Map<string, MeasureResults>();
	for (const [measureId, counts] of byMeasure) {
		const totalResponses = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
		results.set(measureId, { measureId, counts, totalResponses });
	}
	return results;
}

/**
 * Mi propia valoración de cada medida (para el estado "ya valorada" y
 * precargar al cambiarla). Requiere sesión — se resuelve siempre en el
 * cliente, nunca en el `load` SSR (mismo motivo que
 * `concernsService.getMyConcernResponses`: el servidor no tiene acceso a la
 * sesión de `localStorage`).
 */
export async function getMyMeasureResponses(
	measureIds: string[]
): Promise<Map<string, MyMeasureResponse>> {
	if (measureIds.length === 0) return new Map();
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return new Map();

	const { data, error } = await supabase
		.from('measure_responses')
		.select('measure_id, stance, priority')
		.in('measure_id', measureIds)
		.eq('user_id', sessionData.session.user.id);
	if (error) throw error;
	return new Map(
		(data ?? []).map((r) => [
			r.measure_id,
			{
				measureId: r.measure_id,
				stance: r.stance as MeasureStance,
				priority: (r.priority as MeasurePriority) ?? undefined
			}
		])
	);
}

/** Emite o cambia mi valoración. Único punto de escritura: `set_measure_response` (usa `auth.uid()` interno). */
export async function setMeasureResponse(
	measureId: string,
	stance: MeasureStance,
	priority?: MeasurePriority
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para valorar una medida.');
	}
	const { error } = await supabase.rpc('set_measure_response', {
		p_measure_id: measureId,
		p_stance: stance,
		p_priority: priority ?? null
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu valoración.');
}

// ---------------------------------------------------------------------------
// Alternativas ciudadanas
// ---------------------------------------------------------------------------

export interface MeasureAlternativeInput {
	title: string;
	description: string;
}

/** `measureId` ausente = alternativa general sobre el tema completo ("proponer una modificación general"). */
export async function submitMeasureAlternative(
	topicId: string,
	input: MeasureAlternativeInput,
	measureId?: string
): Promise<TopicMeasureAlternative> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para proponer una alternativa.');
	}
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.insert({
			topic_id: topicId,
			measure_id: measureId ?? null,
			proposer_user_id: sessionData.session.user.id,
			title: input.title.trim(),
			description: input.description.trim()
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToAlternative(data);
}

/** Alternativas de una medida visibles para la sesión actual (RLS: aprobadas + las propias + todas si es staff). */
export async function listMeasureAlternatives(
	measureId: string
): Promise<TopicMeasureAlternative[]> {
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.select('*')
		.eq('measure_id', measureId)
		.order('created_at', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToAlternative);
}

/** Alternativas generales sobre un tema completo (measure_id null), visibles según la misma RLS. */
export async function listTopicAlternatives(topicId: string): Promise<TopicMeasureAlternative[]> {
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.select('*')
		.eq('topic_id', topicId)
		.is('measure_id', null)
		.order('created_at', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToAlternative);
}

// ---------------------------------------------------------------------------
// Propuesta desarrollada (participación por ronda)
// ---------------------------------------------------------------------------

export interface DevelopedProposalInput {
	title: string;
	measurePart?: string;
	/** "Cambio propuesto" — se guarda en el mismo campo `description` que la alternativa simple. */
	description: string;
	reason?: string;
	expectedEffect?: string;
	acknowledgedRisks?: string;
	sourceUrl?: string;
}

/** Crea una propuesta desarrollada. `asDraft: true` la deja privada (borrador); `false` la envía directamente a moderación. */
export async function createDevelopedProposal(
	topicId: string,
	roundId: string,
	measureId: string,
	input: DevelopedProposalInput,
	asDraft: boolean
): Promise<TopicMeasureAlternative> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para proponer un cambio.');
	}
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.insert({
			topic_id: topicId,
			measure_id: measureId,
			round_id: roundId,
			proposer_user_id: sessionData.session.user.id,
			title: input.title.trim(),
			description: input.description.trim(),
			measure_part: input.measurePart?.trim() || null,
			reason: input.reason?.trim() || null,
			expected_effect: input.expectedEffect?.trim() || null,
			acknowledged_risks: input.acknowledgedRisks?.trim() || null,
			source_url: input.sourceUrl?.trim() || null,
			status: asDraft ? 'draft' : 'enviada'
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToAlternative(data);
}

/** Actualiza una propuesta propia mientras siga en borrador (RLS lo impide una vez enviada). `submit: true` la envía a moderación. */
export async function updateDevelopedProposal(
	proposalId: string,
	input: DevelopedProposalInput,
	submit: boolean
): Promise<TopicMeasureAlternative> {
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.update({
			title: input.title.trim(),
			description: input.description.trim(),
			measure_part: input.measurePart?.trim() || null,
			reason: input.reason?.trim() || null,
			expected_effect: input.expectedEffect?.trim() || null,
			acknowledged_risks: input.acknowledgedRisks?.trim() || null,
			source_url: input.sourceUrl?.trim() || null,
			status: submit ? 'enviada' : 'draft'
		})
		.eq('id', proposalId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToAlternative(data);
}

/** Mis propuestas desarrolladas (borradores propios + enviadas) para una medida dentro de una ronda. */
export async function listMyDevelopedProposalsForMeasure(
	roundId: string,
	measureId: string
): Promise<TopicMeasureAlternative[]> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return [];
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.select('*')
		.eq('round_id', roundId)
		.eq('measure_id', measureId)
		.eq('proposer_user_id', sessionData.session.user.id)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToAlternative);
}

const PUBLIC_PROPOSAL_STATUSES = [
	'publicada',
	'incorporada_total',
	'incorporada_parcial',
	'no_incorporada'
];

/** Propuestas desarrolladas ya publicadas (con o sin decisión editorial) para una medida. Visible sin sesión. */
export async function listPublicDevelopedProposals(
	measureId: string
): Promise<TopicMeasureAlternative[]> {
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.select('*')
		.eq('measure_id', measureId)
		.not('round_id', 'is', null)
		.in('status', PUBLIC_PROPOSAL_STATUSES)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToAlternative);
}

/** Cola de moderación: propuestas desarrolladas de una ronda pendientes de revisión (no en borrador ni archivadas). */
export async function listPendingDevelopedProposals(
	roundId: string
): Promise<TopicMeasureAlternative[]> {
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.select('*')
		.eq('round_id', roundId)
		.in('status', ['enviada', 'pendiente_revision', 'necesita_cambios', 'en_estudio'])
		.order('created_at', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToAlternative);
}

export interface ProposalModerationInput {
	status: TopicMeasureAlternativeStatus;
	reviewerNote?: string;
	editorialResponse?: string;
	linkedVersionLabel?: string;
}

/** Acción de moderación sobre una propuesta desarrollada: cambia estado, registra nota interna y, si procede, la respuesta editorial pública. */
export async function moderateDevelopedProposal(
	proposalId: string,
	reviewerId: string,
	input: ProposalModerationInput
): Promise<TopicMeasureAlternative> {
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.update({
			status: input.status,
			reviewer_note: input.reviewerNote?.trim() || null,
			editorial_response: input.editorialResponse?.trim() || null,
			linked_version_label: input.linkedVersionLabel?.trim() || null,
			reviewed_by: reviewerId,
			reviewed_at: new Date().toISOString()
		})
		.eq('id', proposalId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToAlternative(data);
}

export interface PendingAlternativeGroup {
	alternative: TopicMeasureAlternative;
	measureTitle: string;
	topicId: string;
	topicTitle: string;
}

/** Cola de revisión para el panel de administración: todas las alternativas pendientes, con contexto de medida/tema. */
export async function listPendingMeasureAlternatives(): Promise<PendingAlternativeGroup[]> {
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.select('*')
		.eq('status', 'pending')
		.order('created_at', { ascending: true });
	if (error) throw error;
	const alternatives = (data ?? []).map(rowToAlternative);
	if (alternatives.length === 0) return [];

	const measureIds = [
		...new Set(alternatives.map((a) => a.measureId).filter((id): id is string => Boolean(id)))
	];
	const { data: measureRows, error: measureError } =
		measureIds.length > 0
			? await supabase.from('topic_measures').select('id, title').in('id', measureIds)
			: { data: [], error: null };
	if (measureError) throw measureError;

	const topicIds = [...new Set(alternatives.map((a) => a.topicId))];
	const { data: topicRows, error: topicError } = await supabase
		.from('topics')
		.select('id, title')
		.in('id', topicIds);
	if (topicError) throw topicError;

	const measureById = new Map((measureRows ?? []).map((m) => [m.id, m]));
	const topicTitleById = new Map((topicRows ?? []).map((t) => [t.id, t.title]));

	return alternatives.map((alternative) => ({
		alternative,
		measureTitle: alternative.measureId
			? (measureById.get(alternative.measureId)?.title ?? 'Medida eliminada')
			: 'Modificación general del tema',
		topicId: alternative.topicId,
		topicTitle: topicTitleById.get(alternative.topicId) ?? 'Tema eliminado'
	}));
}

export async function reviewMeasureAlternative(
	alternativeId: string,
	decision: 'approved' | 'rejected',
	reviewerId: string,
	note?: string
): Promise<TopicMeasureAlternative> {
	const { data, error } = await supabase
		.from('topic_measure_alternatives')
		.update({
			status: decision,
			reviewer_note: note ?? null,
			reviewed_by: reviewerId,
			reviewed_at: new Date().toISOString()
		})
		.eq('id', alternativeId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToAlternative(data);
}

// ---------------------------------------------------------------------------
// Calendario (fases del plan)
// ---------------------------------------------------------------------------

export async function listTopicTimelinePhases(topicId: string): Promise<TopicTimelinePhase[]> {
	const { data, error } = await supabase
		.from('topic_timeline_phases')
		.select('*')
		.eq('topic_id', topicId)
		.order('sort_order', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToTimelinePhase);
}

export interface TopicTimelinePhaseInput {
	title: string;
	description: string;
	items?: string[];
	sortOrder?: number;
}

export async function createTopicTimelinePhase(
	topicId: string,
	input: TopicTimelinePhaseInput
): Promise<TopicTimelinePhase> {
	const { data, error } = await supabase
		.from('topic_timeline_phases')
		.insert({
			topic_id: topicId,
			title: input.title.trim(),
			description: input.description.trim(),
			items: (input.items ?? []).map((i) => i.trim()).filter(Boolean),
			sort_order: input.sortOrder ?? 0
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToTimelinePhase(data);
}

export async function updateTopicTimelinePhase(
	phaseId: string,
	input: TopicTimelinePhaseInput
): Promise<TopicTimelinePhase> {
	const { data, error } = await supabase
		.from('topic_timeline_phases')
		.update({
			title: input.title.trim(),
			description: input.description.trim(),
			items: (input.items ?? []).map((i) => i.trim()).filter(Boolean),
			...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {})
		})
		.eq('id', phaseId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToTimelinePhase(data);
}

export async function deleteTopicTimelinePhase(phaseId: string): Promise<void> {
	const { error } = await supabase.from('topic_timeline_phases').delete().eq('id', phaseId);
	if (error) throw error;
}

// ---------------------------------------------------------------------------
// Historial de versiones
// ---------------------------------------------------------------------------

export async function listTopicVersions(topicId: string): Promise<TopicVersion[]> {
	const { data, error } = await supabase
		.from('topic_versions')
		.select('*')
		.eq('topic_id', topicId)
		.order('published_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToVersion);
}

/** Registra una fila en el historial. No cambia por sí sola `topics.version`: eso se guarda aparte con `updateTopic`. */
export async function publishTopicVersion(
	topicId: string,
	versionLabel: string,
	publishedBy: string,
	note?: string
): Promise<TopicVersion> {
	const { data, error } = await supabase
		.from('topic_versions')
		.insert({
			topic_id: topicId,
			version_label: versionLabel.trim(),
			note: note?.trim() || null,
			published_by: publishedBy
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToVersion(data);
}

// ---------------------------------------------------------------------------
// Fuentes vinculadas a una medida concreta
// ---------------------------------------------------------------------------

export async function listMeasureSourceIds(measureId: string): Promise<string[]> {
	const { data, error } = await supabase
		.from('topic_measure_sources')
		.select('source_id')
		.eq('measure_id', measureId);
	if (error) throw error;
	return (data ?? []).map((r) => r.source_id);
}

/** Fuentes de varias medidas a la vez, para pintar la página pública sin N peticiones. */
export async function listMeasureSourceIdsForMeasures(
	measureIds: string[]
): Promise<Map<string, string[]>> {
	if (measureIds.length === 0) return new Map();
	const { data, error } = await supabase
		.from('topic_measure_sources')
		.select('measure_id, source_id')
		.in('measure_id', measureIds);
	if (error) throw error;
	const byMeasure = new Map<string, string[]>();
	for (const row of data ?? []) {
		const list = byMeasure.get(row.measure_id) ?? [];
		list.push(row.source_id);
		byMeasure.set(row.measure_id, list);
	}
	return byMeasure;
}

export async function linkMeasureSource(measureId: string, sourceId: string): Promise<void> {
	const { error } = await supabase
		.from('topic_measure_sources')
		.insert({ measure_id: measureId, source_id: sourceId });
	if (error) throw error;
}

export async function unlinkMeasureSource(measureId: string, sourceId: string): Promise<void> {
	const { error } = await supabase
		.from('topic_measure_sources')
		.delete()
		.eq('measure_id', measureId)
		.eq('source_id', sourceId);
	if (error) throw error;
}

// ---------------------------------------------------------------------------
// Riesgos generales del tema ("qué podría salir mal")
// ---------------------------------------------------------------------------

export async function listTopicRisks(topicId: string): Promise<TopicRisk[]> {
	const { data, error } = await supabase
		.from('topic_risks')
		.select('*')
		.eq('topic_id', topicId)
		.order('sort_order', { ascending: true });
	if (error) throw error;
	return (data ?? []).map(rowToRisk);
}

export interface TopicRiskInput {
	title: string;
	description?: string;
	signals?: string;
	mitigation?: string;
	decisionTrigger?: string;
	sortOrder?: number;
}

export async function createTopicRisk(topicId: string, input: TopicRiskInput): Promise<TopicRisk> {
	const { data, error } = await supabase
		.from('topic_risks')
		.insert({
			topic_id: topicId,
			title: input.title.trim(),
			description: input.description?.trim() || null,
			signals: input.signals?.trim() || null,
			mitigation: input.mitigation?.trim() || null,
			decision_trigger: input.decisionTrigger?.trim() || null,
			sort_order: input.sortOrder ?? 0
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToRisk(data);
}

export async function updateTopicRisk(riskId: string, input: TopicRiskInput): Promise<TopicRisk> {
	const { data, error } = await supabase
		.from('topic_risks')
		.update({
			title: input.title.trim(),
			description: input.description?.trim() || null,
			signals: input.signals?.trim() || null,
			mitigation: input.mitigation?.trim() || null,
			decision_trigger: input.decisionTrigger?.trim() || null,
			...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {})
		})
		.eq('id', riskId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToRisk(data);
}

export async function deleteTopicRisk(riskId: string): Promise<void> {
	const { error } = await supabase.from('topic_risks').delete().eq('id', riskId);
	if (error) throw error;
}
