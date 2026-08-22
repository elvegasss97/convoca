import { supabase } from '$lib/supabase/client';
import type { PublicSpendingSubmission, PublicSpendingSubmissionStatus } from '$lib/types';

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
