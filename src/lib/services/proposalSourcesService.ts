import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase/client';

export type ProposalActorType =
	| 'government'
	| 'political_party'
	| 'think_tank'
	| 'union'
	| 'business_association'
	| 'university'
	| 'civil_society'
	| 'citizen'
	| 'company'
	| 'other';

export type ProposalAuditStatus =
	| 'registered'
	| 'decomposing'
	| 'evidence_review'
	| 'cost_review'
	| 'legal_review'
	| 'compared'
	| 'audited'
	| 'discarded';

export interface ProposalActor {
	id: string;
	slug: string;
	name: string;
	actorType: ProposalActorType;
	websiteUrl?: string;
	selfDescription?: string;
	declaredOrientation?: string;
	orientationSourceUrl?: string;
}

export interface TopicProposalInput {
	id: string;
	topicId: string;
	measureId?: string;
	title: string;
	sourceUrl: string;
	summary?: string;
	auditStatus: ProposalAuditStatus;
	evidenceNote?: string;
	externalContrastNote?: string;
	costReviewNote?: string;
	legalReviewNote?: string;
	editorialNote?: string;
	sortOrder: number;
	actor: ProposalActor;
}

interface ProposalActorRow {
	id: string;
	slug: string;
	name: string;
	actor_type: string;
	website_url: string | null;
	self_description: string | null;
	declared_orientation: string | null;
	orientation_source_url: string | null;
}

interface TopicProposalInputRow {
	id: string;
	topic_id: string;
	measure_id: string | null;
	actor_id: string;
	title: string;
	source_url: string;
	summary: string | null;
	audit_status: string;
	evidence_note: string | null;
	external_contrast_note: string | null;
	cost_review_note: string | null;
	legal_review_note: string | null;
	editorial_note: string | null;
	sort_order: number;
}

// Estas tablas nacen en la migración 0066. El cliente global sigue tipado con
// database.types.ts; este cast queda acotado a este servicio para no convertir
// el resto de la aplicación en un cliente sin tipos mientras se regenera el
// snapshot completo de tipos desde el esquema consolidado de producción.
const proposalSourcesDb = supabase as unknown as SupabaseClient;

export async function listPublishedTopicProposalInputs(
	topicId: string
): Promise<TopicProposalInput[]> {
	const { data: inputData, error: inputError } = await proposalSourcesDb
		.from('topic_proposal_inputs')
		.select(
			'id, topic_id, measure_id, actor_id, title, source_url, summary, audit_status, evidence_note, external_contrast_note, cost_review_note, legal_review_note, editorial_note, sort_order'
		)
		.eq('topic_id', topicId)
		.eq('is_published', true)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (inputError) throw inputError;
	const inputs = (inputData ?? []) as TopicProposalInputRow[];
	if (inputs.length === 0) return [];

	const actorIds = [...new Set(inputs.map((input) => input.actor_id))];
	const { data: actorData, error: actorError } = await proposalSourcesDb
		.from('proposal_actors')
		.select(
			'id, slug, name, actor_type, website_url, self_description, declared_orientation, orientation_source_url'
		)
		.in('id', actorIds)
		.eq('is_published', true);

	if (actorError) throw actorError;
	const actors = new Map(
		((actorData ?? []) as ProposalActorRow[]).map((row) => [
			row.id,
			{
				id: row.id,
				slug: row.slug,
				name: row.name,
				actorType: row.actor_type as ProposalActorType,
				websiteUrl: row.website_url ?? undefined,
				selfDescription: row.self_description ?? undefined,
				declaredOrientation: row.declared_orientation ?? undefined,
				orientationSourceUrl: row.orientation_source_url ?? undefined
			} satisfies ProposalActor
		])
	);

	return inputs.flatMap((row) => {
		const actor = actors.get(row.actor_id);
		if (!actor) return [];
		return [
			{
				id: row.id,
				topicId: row.topic_id,
				measureId: row.measure_id ?? undefined,
				title: row.title,
				sourceUrl: row.source_url,
				summary: row.summary ?? undefined,
				auditStatus: row.audit_status as ProposalAuditStatus,
				evidenceNote: row.evidence_note ?? undefined,
				externalContrastNote: row.external_contrast_note ?? undefined,
				costReviewNote: row.cost_review_note ?? undefined,
				legalReviewNote: row.legal_review_note ?? undefined,
				editorialNote: row.editorial_note ?? undefined,
				sortOrder: row.sort_order,
				actor
			} satisfies TopicProposalInput
		];
	});
}
