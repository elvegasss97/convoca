<script lang="ts">
	import { onMount } from 'svelte';
	import {
		BookOpenCheck,
		CircleDot,
		Coins,
		ExternalLink,
		FileSearch,
		Landmark,
		Scale
	} from '@lucide/svelte';
	import {
		listPublishedTopicProposalInputs,
		type ProposalActorType,
		type ProposalAuditStatus,
		type TopicProposalInput
	} from '$lib/services/proposalSourcesService';

	interface Props {
		topicId: string;
	}

	let { topicId }: Props = $props();
	let proposals = $state<TopicProposalInput[]>([]);
	let loaded = $state(false);

	const ACTOR_LABELS: Record<ProposalActorType, string> = {
		government: 'Administración',
		political_party: 'Partido político',
		think_tank: 'Think tank',
		union: 'Sindicato',
		business_association: 'Organización empresarial',
		university: 'Universidad',
		civil_society: 'Sociedad civil',
		citizen: 'Ciudadanía',
		company: 'Empresa',
		other: 'Otro actor'
	};

	const STATUS_LABELS: Record<ProposalAuditStatus, string> = {
		registered: 'Registrada',
		decomposing: 'En descomposición',
		evidence_review: 'Revisando evidencia',
		cost_review: 'Revisando coste',
		legal_review: 'Revisando encaje jurídico',
		compared: 'Contrastada',
		audited: 'Auditada',
		discarded: 'Descartada'
	};

	onMount(async () => {
		try {
			proposals = await listPublishedTopicProposalInputs(topicId);
		} catch (error) {
			console.error('No se han podido cargar las fuentes propositivas', error);
		} finally {
			loaded = true;
		}
	});

	function reviewLabel(note?: string): string {
		return note ? 'Con revisión' : 'Pendiente';
	}
</script>

{#if loaded && proposals.length > 0}
	<section class="mt-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-4 sm:p-5">
		<div class="flex items-start gap-2.5">
			<BookOpenCheck class="mt-0.5 size-5 shrink-0 text-brand-700" />
			<div>
				<p class="text-xs font-bold tracking-wide text-brand-700 uppercase">Fuentes propositivas</p>
				<h2 class="mt-0.5 font-display text-base font-semibold text-ink-900">
					Quién más propone soluciones sobre este problema
				</h2>
			</div>
		</div>
		<p class="mt-2 text-sm leading-relaxed text-ink-700">
			CONVOCA registra aquí propuestas formuladas fuera de la plataforma para poder descomponerlas,
			comprobar su evidencia, estimar su coste, revisar competencias y compararlas con alternativas.
			<strong> Que aparezcan aquí no significa que CONVOCA las apoye.</strong>
		</p>

		<div class="mt-4 flex flex-col gap-3">
			{#each proposals as proposal (proposal.id)}
				<article class="rounded-xl border border-ink-100 bg-white p-3.5 sm:p-4">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-1.5">
								{#if proposal.actor.websiteUrl}
									<a
										href={proposal.actor.websiteUrl}
										target="_blank"
										rel="noopener noreferrer nofollow"
										class="font-semibold text-ink-900 hover:text-brand-700 hover:underline"
									>
										{proposal.actor.name}
									</a>
								{:else}
									<span class="font-semibold text-ink-900">{proposal.actor.name}</span>
								{/if}
								<span
									class="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600"
								>
									{ACTOR_LABELS[proposal.actor.actorType]}
								</span>
							</div>
							{#if proposal.actor.declaredOrientation}
								<p class="mt-1 text-xs text-ink-500">
									Autodefinición:
									{#if proposal.actor.orientationSourceUrl}
										<a
											href={proposal.actor.orientationSourceUrl}
											target="_blank"
											rel="noopener noreferrer nofollow"
											class="font-medium text-ink-700 hover:text-brand-700 hover:underline"
										>
											{proposal.actor.declaredOrientation}
										</a>
									{:else}
										<span class="font-medium text-ink-700"
											>{proposal.actor.declaredOrientation}</span
										>
									{/if}
								</p>
							{/if}
						</div>
						<span
							class="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700"
						>
							<CircleDot class="size-3" />
							{STATUS_LABELS[proposal.auditStatus]}
						</span>
					</div>

					<a
						href={proposal.sourceUrl}
						target="_blank"
						rel="noopener noreferrer nofollow"
						class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
					>
						{proposal.title}
						<ExternalLink class="size-3.5" />
					</a>
					{#if proposal.summary}
						<p class="mt-1.5 text-sm leading-relaxed text-ink-700">{proposal.summary}</p>
					{/if}

					<dl class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
						<div class="rounded-lg bg-ink-50 p-2">
							<dt class="flex items-center gap-1 font-semibold text-ink-700">
								<FileSearch class="size-3.5" /> Evidencia
							</dt>
							<dd class="mt-0.5 text-ink-500">{reviewLabel(proposal.evidenceNote)}</dd>
						</div>
						<div class="rounded-lg bg-ink-50 p-2">
							<dt class="flex items-center gap-1 font-semibold text-ink-700">
								<Coins class="size-3.5" /> Coste
							</dt>
							<dd class="mt-0.5 text-ink-500">{reviewLabel(proposal.costReviewNote)}</dd>
						</div>
						<div class="rounded-lg bg-ink-50 p-2">
							<dt class="flex items-center gap-1 font-semibold text-ink-700">
								<Landmark class="size-3.5" /> Competencias
							</dt>
							<dd class="mt-0.5 text-ink-500">{reviewLabel(proposal.legalReviewNote)}</dd>
						</div>
						<div class="rounded-lg bg-ink-50 p-2">
							<dt class="flex items-center gap-1 font-semibold text-ink-700">
								<Scale class="size-3.5" /> Contraste
							</dt>
							<dd class="mt-0.5 text-ink-500">{reviewLabel(proposal.externalContrastNote)}</dd>
						</div>
					</dl>

					{#if proposal.editorialNote}
						<p class="mt-3 border-t border-ink-100 pt-2.5 text-xs leading-relaxed text-ink-500">
							{proposal.editorialNote}
						</p>
					{/if}
				</article>
			{/each}
		</div>

		<p class="mt-3 text-[11px] leading-relaxed text-ink-400">
			La orientación se muestra únicamente cuando procede de la descripción pública del propio
			actor. CONVOCA aplica el mismo proceso de contraste con independencia de quién formule la
			propuesta.
		</p>
	</section>
{/if}
