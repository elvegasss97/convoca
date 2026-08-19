import { supabase } from '$lib/supabase/client';
import type {
	MunicipalIssue,
	MunicipalIssueSource,
	MunicipalIssueSuggestion,
	MunicipalIssueCategory,
	MunicipalIssueOrigin,
	MunicipalIssueSourceKind,
	MunicipalIssueStatus,
	MunicipalEvidenceLevel,
	MunicipalPetition,
	MunicipalPetitionOrigin,
	MunicipalPetitionStatus
} from '$lib/types';

interface RadarSummary {
	issueCount: number;
	petitionCount: number;
	supportCount: number;
	municipalityCount: number;
}

function rowToSource(row: {
	id: string;
	issue_id: string;
	title: string;
	url: string;
	publisher: string | null;
	kind: string;
	published_at: string | null;
	created_at: string;
}): MunicipalIssueSource {
	return {
		id: row.id,
		issueId: row.issue_id,
		title: row.title,
		url: row.url,
		publisher: row.publisher ?? undefined,
		kind: row.kind as MunicipalIssueSourceKind,
		publishedAt: row.published_at ?? undefined,
		createdAt: row.created_at
	};
}

function rowToSuggestion(row: {
	id: string;
	issue_id: string;
	position: number;
	suggestion_text: string;
	author_kind: string;
	created_at: string;
}): MunicipalIssueSuggestion {
	return {
		id: row.id,
		issueId: row.issue_id,
		position: row.position,
		text: row.suggestion_text,
		authorKind: row.author_kind as 'agent' | 'staff',
		createdAt: row.created_at
	};
}

export async function listMunicipalIssues(): Promise<MunicipalIssue[]> {
	const { data, error } = await supabase
		.from('municipal_issues')
		.select(
			'id, slug, title, summary, category, municipality_ine_code, municipality_name, province_code, lat, lng, status, competence_label, evidence_level, origin, detected_at, published_at, resolved_at, created_at, updated_at'
		)
		.order('published_at', { ascending: false });
	if (error) throw error;
	if (!data?.length) return [];

	const ids = data.map((row) => row.id);
	const [
		{ data: sourceRows, error: sourcesError },
		{ data: suggestionRows, error: suggestionsError }
	] = await Promise.all([
		supabase.from('municipal_issue_sources').select('*').in('issue_id', ids),
		supabase
			.from('municipal_issue_suggestions')
			.select('*')
			.in('issue_id', ids)
			.order('position', { ascending: true })
	]);
	if (sourcesError) throw sourcesError;
	if (suggestionsError) throw suggestionsError;

	const sourcesByIssue = new Map<string, MunicipalIssueSource[]>();
	for (const row of sourceRows ?? []) {
		const list = sourcesByIssue.get(row.issue_id) ?? [];
		list.push(rowToSource(row));
		sourcesByIssue.set(row.issue_id, list);
	}

	const suggestionsByIssue = new Map<string, MunicipalIssueSuggestion[]>();
	for (const row of suggestionRows ?? []) {
		const list = suggestionsByIssue.get(row.issue_id) ?? [];
		list.push(rowToSuggestion(row));
		suggestionsByIssue.set(row.issue_id, list);
	}

	return data.map((row) => ({
		id: row.id,
		slug: row.slug,
		title: row.title,
		summary: row.summary,
		category: row.category as MunicipalIssueCategory,
		municipalityName: row.municipality_name,
		municipalityIneCode: row.municipality_ine_code ?? undefined,
		provinceCode: row.province_code,
		point: { lat: row.lat, lng: row.lng },
		status: row.status as MunicipalIssueStatus,
		competenceLabel: row.competence_label ?? undefined,
		evidenceLevel: row.evidence_level as MunicipalEvidenceLevel,
		origin: row.origin as MunicipalIssueOrigin,
		detectedAt: row.detected_at,
		publishedAt: row.published_at ?? undefined,
		resolvedAt: row.resolved_at ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		sources: sourcesByIssue.get(row.id) ?? [],
		suggestions: suggestionsByIssue.get(row.id) ?? []
	}));
}

export async function listMunicipalPetitions(): Promise<MunicipalPetition[]> {
	const { data, error } = await supabase
		.from('municipal_petitions')
		.select(
			'id, slug, issue_id, title, request_text, target_name, municipality_ine_code, municipality_name, province_code, lat, lng, status, origin, published_at, created_at, updated_at'
		)
		.order('published_at', { ascending: false });
	if (error) throw error;
	if (!data?.length) return [];

	const ids = data.map((row) => row.id);
	const { data: countRows, error: countError } = await supabase.rpc(
		'get_municipal_petition_counts',
		{
			p_petition_ids: ids
		}
	);
	if (countError) throw countError;

	const countById = new Map(
		(countRows ?? []).map((row) => [row.petition_id, Number(row.support_count)])
	);

	return data.map((row) => ({
		id: row.id,
		slug: row.slug,
		issueId: row.issue_id ?? undefined,
		title: row.title,
		requestText: row.request_text,
		targetName: row.target_name,
		municipalityName: row.municipality_name,
		municipalityIneCode: row.municipality_ine_code,
		provinceCode: row.province_code,
		point: { lat: row.lat, lng: row.lng },
		status: row.status as MunicipalPetitionStatus,
		origin: row.origin as MunicipalPetitionOrigin,
		publishedAt: row.published_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		supportCount: countById.get(row.id) ?? 0,
		isSupportedByMe: false
	}));
}

/**
 * Estado privado de mis propios apoyos. Se llama solo en navegador tras
 * hidratar: el SSR de CONVOCA no conserva tokens de sesión (ver client.ts).
 */
export async function getMyMunicipalPetitionSupports(petitionIds: string[]): Promise<Set<string>> {
	if (petitionIds.length === 0) return new Set();
	const { data: sessionData } = await supabase.auth.getSession();
	const session = sessionData.session;
	if (!session) return new Set();

	const { data, error } = await supabase
		.from('municipal_petition_supports')
		.select('petition_id')
		.in('petition_id', petitionIds)
		.eq('user_id', session.user.id);
	if (error) throw error;
	return new Set((data ?? []).map((row) => row.petition_id));
}

export async function getMunicipalRadarSummary(): Promise<RadarSummary> {
	const { data, error } = await supabase.rpc('get_municipal_radar_summary');
	if (error) throw error;
	const row = data?.[0];
	return {
		issueCount: Number(row?.issue_count ?? 0),
		petitionCount: Number(row?.petition_count ?? 0),
		supportCount: Number(row?.support_count ?? 0),
		municipalityCount: Number(row?.municipality_count ?? 0)
	};
}

export interface CreateMunicipalPetitionInput {
	title: string;
	requestText: string;
	targetName: string;
	municipalityIneCode: string;
	point: { lat: number; lng: number };
	issueId?: string;
}

export async function createMunicipalPetition(
	input: CreateMunicipalPetitionInput
): Promise<string> {
	const { data, error } = await supabase.rpc('create_municipal_petition', {
		p_title: input.title,
		p_request_text: input.requestText,
		p_target_name: input.targetName,
		p_municipality_ine_code: input.municipalityIneCode,
		p_lat: input.point.lat,
		p_lng: input.point.lng,
		p_issue_id: input.issueId ?? null
	});
	if (error) throw error;
	return data;
}

export async function setMunicipalPetitionSupport(
	petitionId: string,
	supported: boolean
): Promise<boolean> {
	const { data, error } = await supabase.rpc('set_municipal_petition_support', {
		p_petition_id: petitionId,
		p_supported: supported
	});
	if (error) throw error;
	return data;
}
