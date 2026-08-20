import { supabase } from '$lib/supabase/client';
import type {
	MunicipalEvidenceLevel,
	MunicipalIssueCategory,
	MunicipalIssueOrigin,
	MunicipalIssueSourceKind
} from '$lib/types';

export interface RadarIssueSourceForModeration {
	id: string;
	title: string;
	url: string;
	publisher?: string;
	kind: MunicipalIssueSourceKind;
	publishedAt?: string;
}

export interface RadarIssueSuggestionForModeration {
	id: string;
	position: number;
	text: string;
	authorKind: 'agent' | 'staff';
}

export interface DetectedMunicipalIssueForModeration {
	id: string;
	slug: string;
	title: string;
	summary: string;
	category: MunicipalIssueCategory;
	municipalityName: string;
	municipalityIneCode?: string;
	provinceCode: string;
	point?: { lat: number; lng: number };
	competenceLabel?: string;
	evidenceLevel: MunicipalEvidenceLevel;
	origin: MunicipalIssueOrigin;
	detectedAt: string;
	sources: RadarIssueSourceForModeration[];
	suggestions: RadarIssueSuggestionForModeration[];
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

export async function listDetectedMunicipalIssuesForModeration(): Promise<
	DetectedMunicipalIssueForModeration[]
> {
	const { data: issueRows, error: issueError } = await supabase
		.from('municipal_issues')
		.select(
			'id, slug, title, summary, category, municipality_ine_code, municipality_name, province_code, lat, lng, competence_label, evidence_level, origin, detected_at'
		)
		.eq('status', 'detected')
		.order('detected_at', { ascending: false });
	if (issueError) throw issueError;
	if (!issueRows?.length) return [];

	const issueIds = issueRows.map((row) => row.id);
	const [
		{ data: sourceRows, error: sourceError },
		{ data: suggestionRows, error: suggestionError }
	] = await Promise.all([
		supabase
			.from('municipal_issue_sources')
			.select('id, issue_id, title, url, publisher, kind, published_at')
			.in('issue_id', issueIds),
		supabase
			.from('municipal_issue_suggestions')
			.select('id, issue_id, position, suggestion_text, author_kind')
			.in('issue_id', issueIds)
			.order('position', { ascending: true })
	]);
	if (sourceError) throw sourceError;
	if (suggestionError) throw suggestionError;

	const sourcesByIssue = new Map<string, RadarIssueSourceForModeration[]>();
	for (const row of sourceRows ?? []) {
		const list = sourcesByIssue.get(row.issue_id) ?? [];
		list.push({
			id: row.id,
			title: row.title,
			url: row.url,
			publisher: row.publisher ?? undefined,
			kind: row.kind as MunicipalIssueSourceKind,
			publishedAt: row.published_at ?? undefined
		});
		sourcesByIssue.set(row.issue_id, list);
	}

	const suggestionsByIssue = new Map<string, RadarIssueSuggestionForModeration[]>();
	for (const row of suggestionRows ?? []) {
		const list = suggestionsByIssue.get(row.issue_id) ?? [];
		list.push({
			id: row.id,
			position: row.position,
			text: row.suggestion_text,
			authorKind: row.author_kind as 'agent' | 'staff'
		});
		suggestionsByIssue.set(row.issue_id, list);
	}

	return issueRows.map((row) => ({
		id: row.id,
		slug: row.slug,
		title: row.title,
		summary: row.summary,
		category: row.category as MunicipalIssueCategory,
		municipalityName: row.municipality_name,
		municipalityIneCode: row.municipality_ine_code ?? undefined,
		provinceCode: row.province_code,
		point:
			typeof row.lat === 'number' && typeof row.lng === 'number'
				? { lat: row.lat, lng: row.lng }
				: undefined,
		competenceLabel: row.competence_label ?? undefined,
		evidenceLevel: row.evidence_level as MunicipalEvidenceLevel,
		origin: row.origin as MunicipalIssueOrigin,
		detectedAt: row.detected_at,
		sources: sourcesByIssue.get(row.id) ?? [],
		suggestions: suggestionsByIssue.get(row.id) ?? []
	}));
}

export async function reviewDetectedMunicipalIssue(
	issueId: string,
	action: 'publish' | 'dismiss'
): Promise<void> {
	const { error } = await supabase.functions.invoke('review-municipal-issue', {
		body: { issueId, action }
	});
	if (!error) return;
	const safeMessage = await edgeFunctionErrorMessage(error);
	throw new Error(
		safeMessage ??
			(action === 'publish'
				? 'No se ha podido publicar el hallazgo.'
				: 'No se ha podido descartar el hallazgo.')
	);
}
