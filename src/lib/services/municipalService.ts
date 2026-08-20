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
		.in('status', ['verified', 'in_action', 'resolved'])
		.order('published_at', { ascending: false });
	if (error) throw error;
	if (!data?.length) return [];

	// 0058 permite coordenadas nulas exclusivamente mientras el hallazgo es interno.
	// La capa pública nunca debe entregar al mapa un punto incompleto aunque una fila
	// inconsistente consiguiera atravesar RLS o un trigger futuro cambiase.
	const publicRows = data.filter(
		(row): row is (typeof data)[number] & { lat: number; lng: number } =>
			row.lat !== null && row.lng !== null
	);
	if (publicRows.length === 0) return [];

	const ids = publicRows.map((row) => row.id);
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

	return publicRows.map((row) => ({
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
		{ p_petition_ids: ids }
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

export async function getMyMunicipalPetitionSupports(
	petitionIds: string[]
): Promise<Set<string>> {
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

export const MUNICIPAL_SUPPORT_CONSENT_VERSION = '2026-08-20';

export interface CreateMunicipalPetitionInput {
	title: string;
	requestText: string;
	targetName: string;
	municipalityIneCode: string;
	issueId?: string;
}

async function edgeFunctionErrorMessage(error: unknown): Promise<string | null> {
	if (!error || typeof error !== 'object' || !('context' in error)) return null;
	const context = (error as { context?: unknown }).context;
	if (!(context instanceof Response)) return null;
	try {
		const payload = (await context.clone().json()) as { error?: unknown };
		return typeof payload?.error === 'string' ? payload.error : null;
	} catch {
		return null;
	}
}

export async function createMunicipalPetition(
	input: CreateMunicipalPetitionInput
): Promise<string> {
	const { data, error } = await supabase.functions.invoke('create-municipal-petition', {
		body: {
			title: input.title,
			requestText: input.requestText,
			targetName: input.targetName,
			municipalityIneCode: input.municipalityIneCode,
			issueId: input.issueId ?? null
		}
	});
	if (error) {
		const safeMessage = await edgeFunctionErrorMessage(error);
		throw new Error(safeMessage ?? 'No se ha podido abrir la recogida.');
	}
	const id = (data as { id?: unknown } | null)?.id;
	if (typeof id !== 'string' || !id) {
		throw new Error('La recogida no devolvió un identificador válido.');
	}
	return id;
}

export async function setMunicipalPetitionSupport(
	petitionId: string,
	supported: boolean,
	explicitConsent = false
): Promise<boolean> {
	const result = supported
		? await supabase.rpc('set_municipal_petition_support', {
				p_petition_id: petitionId,
				p_supported: true,
				p_explicit_consent: explicitConsent,
				p_consent_version: MUNICIPAL_SUPPORT_CONSENT_VERSION
			})
		: await supabase.rpc('set_municipal_petition_support', {
				p_petition_id: petitionId,
				p_supported: false,
				p_explicit_consent: false
			});
	if (result.error) throw result.error;
	return result.data;
}

export type MunicipalPetitionReportReason =
	| 'spam'
	| 'abuse'
	| 'personal_data'
	| 'misleading'
	| 'illegal'
	| 'other';

export async function reportMunicipalPetition(
	petitionId: string,
	reason: MunicipalPetitionReportReason,
	details?: string
): Promise<string> {
	const cleanDetails = details?.trim();
	const result = cleanDetails
		? await supabase.rpc('report_municipal_petition', {
				p_petition_id: petitionId,
				p_reason: reason,
				p_details: cleanDetails
			})
		: await supabase.rpc('report_municipal_petition', {
				p_petition_id: petitionId,
				p_reason: reason
			});
	if (result.error) throw result.error;
	return result.data;
}

export interface MunicipalPetitionReportForModeration {
	id: string;
	petitionId: string;
	reason: MunicipalPetitionReportReason;
	details?: string;
	status: 'open' | 'reviewed' | 'dismissed' | 'actioned';
	createdAt: string;
	updatedAt: string;
	reviewedAt?: string;
}

export interface ReportedMunicipalPetitionGroup {
	petition: MunicipalPetition;
	reports: MunicipalPetitionReportForModeration[];
}

export async function listReportedMunicipalPetitions(): Promise<
	ReportedMunicipalPetitionGroup[]
> {
	const { data: reportRows, error: reportError } = await supabase
		.from('municipal_petition_reports')
		.select('id, petition_id, reason, details, status, created_at, updated_at, reviewed_at')
		.eq('status', 'open')
		.order('created_at', { ascending: true });
	if (reportError) throw reportError;
	if (!reportRows?.length) return [];

	const petitionIds = [...new Set(reportRows.map((row) => row.petition_id))];
	const { data: petitionRows, error: petitionError } = await supabase
		.from('municipal_petitions')
		.select(
			'id, slug, issue_id, title, request_text, target_name, municipality_ine_code, municipality_name, province_code, lat, lng, status, origin, published_at, created_at, updated_at'
		)
		.in('id', petitionIds);
	if (petitionError) throw petitionError;

	const countById = new Map<string, number>();
	const { data: countRows, error: countError } = await supabase.rpc(
		'get_municipal_petition_counts',
		{ p_petition_ids: petitionIds }
	);
	if (countError) throw countError;
	for (const row of countRows ?? []) {
		countById.set(row.petition_id, Number(row.support_count));
	}

	const petitionById = new Map<string, MunicipalPetition>();
	for (const row of petitionRows ?? []) {
		petitionById.set(row.id, {
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
		});
	}

	return petitionIds.flatMap((petitionId) => {
		const petition = petitionById.get(petitionId);
		if (!petition) return [];
		const reports: MunicipalPetitionReportForModeration[] = reportRows
			.filter((row) => row.petition_id === petitionId)
			.map((row) => ({
				id: row.id,
				petitionId: row.petition_id,
				reason: row.reason as MunicipalPetitionReportReason,
				details: row.details ?? undefined,
				status: row.status as MunicipalPetitionReportForModeration['status'],
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				reviewedAt: row.reviewed_at ?? undefined
			}));
		return [{ petition, reports }];
	});
}

export async function reviewMunicipalPetitionReport(
	reportId: string,
	action: 'dismiss' | 'hide_petition'
): Promise<boolean> {
	const { data, error } = await supabase.rpc('review_municipal_petition_report', {
		p_report_id: reportId,
		p_action: action
	});
	if (error) throw error;
	return data;
}
