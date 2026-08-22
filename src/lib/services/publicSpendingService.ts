import { supabase } from '$lib/supabase/client';
import type { Database } from '$lib/supabase/database.types';
import type {
	PublicSpendingBreakdownItem,
	PublicSpendingDetailVariant,
	PublicSpendingExplainerFigure,
	PublicSpendingInvestigation,
	PublicSpendingInvestigationSource,
	PublicSpendingSourceKind,
	PublicSpendingStage,
	PublicSpendingTraceState,
	PublicSpendingTraceStep
} from '$lib/data/publicSpending';
import type { PublicSpendingSubmission, PublicSpendingSubmissionStatus } from '$lib/types';

type PublicSpendingInvestigationRow =
	Database['public']['Tables']['public_spending_investigations']['Row'];
type PublicSpendingBreakdownRow =
	Database['public']['Tables']['public_spending_breakdown_items']['Row'];
type PublicSpendingSourceRow = Database['public']['Tables']['public_spending_sources']['Row'];
type PublicSpendingTraceRow = Database['public']['Tables']['public_spending_trace_steps']['Row'];
type PublicSpendingExplainerFigureRow =
	Database['public']['Tables']['public_spending_explainer_figures']['Row'];

export interface PublicSpendingNavigationItem {
	slug: string;
	shortTitle: string;
	sortOrder: number;
}

const spanishDateFormatter = new Intl.DateTimeFormat('es-ES', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

function formatDatabaseDate(value: string): string {
	return spanishDateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function rowToBreakdownItem(row: PublicSpendingBreakdownRow): PublicSpendingBreakdownItem {
	const hasRect =
		row.rect_x !== null &&
		row.rect_y !== null &&
		row.rect_width !== null &&
		row.rect_height !== null;

	return {
		id: row.item_id,
		label: row.label,
		amount: row.amount,
		detail: row.detail,
		place: row.place ?? undefined,
		shortLabel: row.short_label ?? undefined,
		rate: row.rate ?? undefined,
		unit: row.unit ?? undefined,
		capacity: row.capacity ?? undefined,
		description: row.description ?? undefined,
		fill: row.fill ?? undefined,
		textColor: row.text_color ?? undefined,
		rect: hasRect
			? {
					x: row.rect_x as number,
					y: row.rect_y as number,
					width: row.rect_width as number,
					height: row.rect_height as number
				}
			: undefined,
		compact: row.compact
	};
}

function rowToSource(row: PublicSpendingSourceRow): PublicSpendingInvestigationSource {
	const kind = row.source_kind as PublicSpendingSourceKind;
	return {
		id: row.source_id,
		kind,
		organization: row.organization,
		title: row.title,
		date: row.source_date_label,
		url: row.url,
		status: kind === 'primary' ? 'Fuente primaria' : 'Publicación analizada',
		whatItProves: row.what_it_proves ?? undefined,
		claimSummary: row.claim_summary ?? undefined,
		editorialUse: row.editorial_use ?? undefined
	};
}

function rowToTraceStep(row: PublicSpendingTraceRow): PublicSpendingTraceStep {
	return {
		label: row.label,
		detail: row.detail,
		state: row.state as PublicSpendingTraceState
	};
}

function rowToExplainerFigure(
	row: PublicSpendingExplainerFigureRow
): PublicSpendingExplainerFigure {
	return {
		id: row.figure_id,
		value: row.display_value,
		question: row.question,
		explanation: row.explanation
	};
}

export function assemblePublicSpendingInvestigations(
	investigationRows: PublicSpendingInvestigationRow[],
	breakdownRows: PublicSpendingBreakdownRow[],
	sourceRows: PublicSpendingSourceRow[],
	traceRows: PublicSpendingTraceRow[],
	explainerFigureRows: PublicSpendingExplainerFigureRow[]
): PublicSpendingInvestigation[] {
	return investigationRows
		.map((row) => ({
			slug: row.slug,
			title: row.title,
			shortTitle: row.short_title,
			eyebrow: row.eyebrow,
			stage: row.stage as PublicSpendingStage,
			amount: row.amount,
			amountApproximate: row.amount_approximate,
			amountQualifier: row.amount_qualifier,
			period: row.period,
			publishedOn: row.published_on,
			publishedAt: formatDatabaseDate(row.published_on),
			reviewedOn: row.reviewed_on,
			reviewedAt: formatDatabaseDate(row.reviewed_on),
			category: row.category,
			territory: row.territory,
			manager: row.manager,
			recipient: row.recipient,
			summary: row.summary,
			citizenIntro: row.citizen_intro,
			fundingOrigin: row.funding_origin,
			fundingDestination: row.funding_destination,
			citizenTakeaway: row.citizen_takeaway,
			explainerFigures: explainerFigureRows
				.filter((figure) => figure.investigation_slug === row.slug)
				.sort((a, b) => a.sort_order - b.sort_order)
				.map(rowToExplainerFigure),
			whyItMatters: row.why_it_matters,
			evidenceNote: row.evidence_note,
			featuredMetric: row.featured_metric,
			featuredLabel: row.featured_label,
			breakdownTitle: row.breakdown_title,
			breakdownNote: row.breakdown_note,
			breakdownCoverage: row.breakdown_coverage as 'complete' | 'selected',
			breakdown: breakdownRows
				.filter((item) => item.investigation_slug === row.slug)
				.sort((a, b) => a.sort_order - b.sort_order)
				.map(rowToBreakdownItem),
			known: row.known_facts,
			unknown: row.unknown_facts,
			trace: traceRows
				.filter((step) => step.investigation_slug === row.slug)
				.sort((a, b) => a.sort_order - b.sort_order)
				.map(rowToTraceStep),
			sources: sourceRows
				.filter((source) => source.investigation_slug === row.slug)
				.sort((a, b) => a.sort_order - b.sort_order)
				.map(rowToSource),
			accent: row.accent,
			detailVariant: row.detail_variant as PublicSpendingDetailVariant,
			verificationStatus: row.verification_status ?? undefined,
			detailDescription: row.detail_description ?? undefined,
			disclaimer: row.disclaimer ?? undefined,
			sortOrder: row.sort_order,
			updatedAt: row.updated_at
		}))
		.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Devuelve el catálogo editorial publicado. RLS oculta cualquier borrador y
 * los permisos de tabla impiden que el cliente altere el contenido.
 */
export async function listPublicSpendingInvestigations(): Promise<PublicSpendingInvestigation[]> {
	const [investigations, breakdown, sources, trace, explainerFigures] = await Promise.all([
		supabase.from('public_spending_investigations').select('*').order('sort_order'),
		supabase
			.from('public_spending_breakdown_items')
			.select('*')
			.order('investigation_slug')
			.order('sort_order'),
		supabase
			.from('public_spending_sources')
			.select('*')
			.order('investigation_slug')
			.order('sort_order'),
		supabase
			.from('public_spending_trace_steps')
			.select('*')
			.order('investigation_slug')
			.order('sort_order'),
		supabase
			.from('public_spending_explainer_figures')
			.select('*')
			.order('investigation_slug')
			.order('sort_order')
	]);

	const firstError =
		investigations.error ??
		breakdown.error ??
		sources.error ??
		trace.error ??
		explainerFigures.error;
	if (firstError) throw firstError;

	return assemblePublicSpendingInvestigations(
		investigations.data ?? [],
		breakdown.data ?? [],
		sources.data ?? [],
		trace.data ?? [],
		explainerFigures.data ?? []
	);
}

export async function getPublicSpendingInvestigation(
	slug: string
): Promise<PublicSpendingInvestigation | undefined> {
	const [investigations, breakdown, sources, trace, explainerFigures] = await Promise.all([
		supabase.from('public_spending_investigations').select('*').eq('slug', slug).limit(1),
		supabase
			.from('public_spending_breakdown_items')
			.select('*')
			.eq('investigation_slug', slug)
			.order('sort_order'),
		supabase
			.from('public_spending_sources')
			.select('*')
			.eq('investigation_slug', slug)
			.order('sort_order'),
		supabase
			.from('public_spending_trace_steps')
			.select('*')
			.eq('investigation_slug', slug)
			.order('sort_order'),
		supabase
			.from('public_spending_explainer_figures')
			.select('*')
			.eq('investigation_slug', slug)
			.order('sort_order')
	]);

	const firstError =
		investigations.error ??
		breakdown.error ??
		sources.error ??
		trace.error ??
		explainerFigures.error;
	if (firstError) throw firstError;

	return assemblePublicSpendingInvestigations(
		investigations.data ?? [],
		breakdown.data ?? [],
		sources.data ?? [],
		trace.data ?? [],
		explainerFigures.data ?? []
	)[0];
}

/**
 * Carga únicamente lo necesario para enlazar el caso anterior y el siguiente.
 * Evita descargar el contenido completo de todo el catálogo desde cada ficha.
 */
export async function listPublicSpendingNavigationItems(): Promise<PublicSpendingNavigationItem[]> {
	const { data, error } = await supabase
		.from('public_spending_investigations')
		.select('slug, short_title, sort_order')
		.order('sort_order');

	if (error) throw error;

	return (data ?? []).map((row) => ({
		slug: row.slug,
		shortTitle: row.short_title,
		sortOrder: row.sort_order
	}));
}

interface PublicSpendingSubmissionRow {
	id: string;
	submitter_user_id: string;
	title: string;
	details: string;
	amount_text: string | null;
	managing_organization: string | null;
	territory: string | null;
	source_urls: string[];
	status: string;
	reviewer_note: string | null;
	reviewed_by: string | null;
	reviewed_at: string | null;
	resulting_case_slug: string | null;
	created_at: string;
	updated_at: string;
}

export interface PublicSpendingSubmissionInput {
	title: string;
	details: string;
	amountText?: string;
	managingOrganization?: string;
	territory?: string;
	sourceUrls: string[];
}

export const publicSpendingSubmissionStatusLabels: Record<PublicSpendingSubmissionStatus, string> =
	{
		received: 'Recibida',
		triage: 'En triaje',
		researching: 'En investigación',
		published: 'Publicada',
		dismissed: 'Archivada'
	};

export function isValidPublicSourceUrl(value: string): boolean {
	try {
		const url = new URL(value.trim());
		return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
	} catch {
		return false;
	}
}

function rowToPublicSpendingSubmission(row: PublicSpendingSubmissionRow): PublicSpendingSubmission {
	return {
		id: row.id,
		submitterUserId: row.submitter_user_id,
		title: row.title,
		details: row.details,
		amountText: row.amount_text ?? undefined,
		managingOrganization: row.managing_organization ?? undefined,
		territory: row.territory ?? undefined,
		sourceUrls: row.source_urls,
		status: row.status as PublicSpendingSubmissionStatus,
		reviewerNote: row.reviewer_note ?? undefined,
		reviewedBy: row.reviewed_by ?? undefined,
		reviewedAt: row.reviewed_at ?? undefined,
		resultingCaseSlug: row.resulting_case_slug ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/**
 * Envía una pista privada al equipo editorial. RLS exige que el autor sea la
 * sesión actual y el trigger de base de datos fuerza el estado `received`.
 */
export async function submitPublicSpendingSubmission(
	input: PublicSpendingSubmissionInput
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) throw new Error('Debes iniciar sesión para enviar una pista.');

	const sourceUrls = input.sourceUrls.map((url) => url.trim()).filter(Boolean);
	if (sourceUrls.length < 1 || sourceUrls.length > 5 || !sourceUrls.every(isValidPublicSourceUrl)) {
		throw new Error('Añade entre una y cinco fuentes públicas válidas.');
	}

	const { error } = await supabase.from('public_spending_submissions').insert({
		submitter_user_id: sessionData.session.user.id,
		title: input.title.trim(),
		details: input.details.trim(),
		amount_text: input.amountText?.trim() || null,
		managing_organization: input.managingOrganization?.trim() || null,
		territory: input.territory?.trim() || null,
		source_urls: sourceUrls
	});
	if (error) throw new Error(error.message || 'No se ha podido enviar la pista.');
}

/** Panel interno: RLS solo devuelve filas al equipo de moderación. */
export async function listPublicSpendingSubmissions(
	status?: PublicSpendingSubmissionStatus
): Promise<PublicSpendingSubmission[]> {
	let query = supabase
		.from('public_spending_submissions')
		.select('*')
		.order('created_at', { ascending: true });
	if (status) query = query.eq('status', status);
	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []).map(rowToPublicSpendingSubmission);
}

export interface PublicSpendingReviewInput {
	status: Exclude<PublicSpendingSubmissionStatus, 'received'>;
	reviewerId: string;
	note?: string;
	resultingCaseSlug?: string;
}

/** Moderación: actualiza el triaje sin hacer pública la aportación original. */
export async function reviewPublicSpendingSubmission(
	id: string,
	input: PublicSpendingReviewInput
): Promise<PublicSpendingSubmission> {
	const { data, error } = await supabase
		.from('public_spending_submissions')
		.update({
			status: input.status,
			reviewer_note: input.note?.trim() || null,
			reviewed_by: input.reviewerId,
			reviewed_at: new Date().toISOString(),
			resulting_case_slug:
				input.status === 'published' ? input.resultingCaseSlug?.trim() || null : null
		})
		.eq('id', id)
		.select('*')
		.single();
	if (error) throw error;
	return rowToPublicSpendingSubmission(data);
}
