<script lang="ts">
	import {
		Activity,
		Inbox,
		Plus,
		Pencil,
		Eye,
		EyeOff,
		Archive,
		Check,
		X as XIcon,
		Users
	} from '@lucide/svelte';
	import type { Concern, ConcernProposal, Event } from '$lib/types';
	import {
		concernCategoryLabels,
		concernStatusLabels,
		concernProposalStatusLabels
	} from '$lib/labels';
	import { formatEventDate } from '$lib/utils/date';
	import {
		setConcernStatus,
		reviewConcernProposal,
		listRelatedEvents,
		getConcernResponseCounts
	} from '$lib/services/concernsService';
	import ConcernEditorDialog from './ConcernEditorDialog.svelte';
	import NoteDialog from '$lib/components/NoteDialog.svelte';

	interface Props {
		concerns: Concern[];
		proposals: ConcernProposal[];
		events: Event[];
		moderatorId: string;
	}

	let { concerns = $bindable(), proposals = $bindable(), events, moderatorId }: Props = $props();

	let subTab = $state<'preocupaciones' | 'propuestas'>('preocupaciones');

	let responseCounts = $state<Map<string, number>>(new Map());
	$effect(() => {
		const ids = concerns.map((c) => c.id);
		if (ids.length === 0) return;
		getConcernResponseCounts(ids).then((counts) => (responseCounts = counts));
	});

	let editorOpen = $state(false);
	let editingConcern = $state<Concern | null>(null);
	let relatedEvents = $state<Event[]>([]);

	async function openCreate() {
		editingConcern = null;
		relatedEvents = [];
		editorOpen = true;
	}

	async function openEdit(concern: Concern) {
		editingConcern = concern;
		relatedEvents = await listRelatedEvents(concern.id);
		editorOpen = true;
	}

	function onConcernSaved(saved: Concern) {
		const idx = concerns.findIndex((c) => c.id === saved.id);
		if (idx >= 0) concerns[idx] = saved;
		else concerns = [saved, ...concerns];
	}

	async function onRelatedEventsChanged(concernId: string) {
		relatedEvents = await listRelatedEvents(concernId);
	}

	async function toggleStatus(concern: Concern, next: Concern['status']) {
		const saved = await setConcernStatus(concern.id, next);
		onConcernSaved(saved);
	}

	let rejectTarget = $state<ConcernProposal | null>(null);
	let rejectOpen = $state(false);

	async function approveProposal(proposal: ConcernProposal) {
		// Abre el editor precargado con los datos de la propuesta: moderación
		// revisa/ajusta antes de publicar, nunca se crea la concern automáticamente.
		editingConcern = null;
		relatedEvents = [];
		editorOpen = true;
		pendingApproval = proposal;
	}

	let pendingApproval = $state<ConcernProposal | null>(null);

	async function onApprovalConcernSaved(saved: Concern) {
		if (pendingApproval) {
			await reviewConcernProposal(pendingApproval.id, 'approved', moderatorId, undefined, saved.id);
			proposals = proposals.map((p) =>
				p.id === pendingApproval!.id
					? { ...p, status: 'approved', resultingConcernId: saved.id }
					: p
			);
			pendingApproval = null;
		}
		onConcernSaved(saved);
	}

	function openReject(proposal: ConcernProposal) {
		rejectTarget = proposal;
		rejectOpen = true;
	}

	async function confirmReject(note: string) {
		if (!rejectTarget) return;
		await reviewConcernProposal(rejectTarget.id, 'rejected', moderatorId, note || undefined);
		proposals = proposals.map((p) =>
			p.id === rejectTarget!.id ? { ...p, status: 'rejected', reviewerNote: note || undefined } : p
		);
	}

	const pendingProposals = $derived(proposals.filter((p) => p.status === 'pending'));
	const reviewedProposals = $derived(proposals.filter((p) => p.status !== 'pending'));

	const statusTone: Record<Concern['status'], string> = {
		draft: 'bg-ink-100 text-ink-600',
		published: 'bg-brand-100 text-brand-800',
		archived: 'bg-warning-100 text-warning-700'
	};
</script>

<div class="flex items-center gap-2 border-b border-ink-100 pb-px">
	<button
		type="button"
		onclick={() => (subTab = 'preocupaciones')}
		class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition {subTab ===
		'preocupaciones'
			? 'border-brand-700 text-brand-800'
			: 'border-transparent text-ink-500 hover:text-ink-800'}"
	>
		<Activity class="size-4" /> Preocupaciones
	</button>
	<button
		type="button"
		onclick={() => (subTab = 'propuestas')}
		class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition {subTab ===
		'propuestas'
			? 'border-brand-700 text-brand-800'
			: 'border-transparent text-ink-500 hover:text-ink-800'}"
	>
		<Inbox class="size-4" />
		Propuestas
		{#if pendingProposals.length > 0}
			<span class="rounded-full bg-warning-100 px-1.5 text-xs font-bold text-warning-700">
				{pendingProposals.length}
			</span>
		{/if}
	</button>
</div>

{#if subTab === 'preocupaciones'}
	<div class="mt-4">
		<button
			type="button"
			onclick={openCreate}
			class="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
		>
			<Plus class="size-4" /> Nueva preocupación
		</button>

		<ul class="mt-4 flex flex-col gap-2">
			{#each concerns as concern (concern.id)}
				<li class="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 p-3.5">
					<span class="rounded-full px-2.5 py-1 text-xs font-semibold {statusTone[concern.status]}">
						{concernStatusLabels[concern.status]}
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-ink-900">{concern.question}</p>
						<p class="text-xs text-ink-500">
							{concernCategoryLabels[concern.category]} · {formatEventDate(concern.startsAt)}
						</p>
					</div>
					<span class="flex items-center gap-1 text-xs text-ink-500">
						<Users class="size-3.5" />
						{responseCounts.get(concern.id) ?? 0}
					</span>
					<div class="flex shrink-0 items-center gap-1">
						<button
							type="button"
							onclick={() => openEdit(concern)}
							class="rounded-full p-1.5 text-ink-500 hover:bg-ink-100"
							aria-label={`Editar ${concern.question}`}
						>
							<Pencil class="size-4" />
						</button>
						{#if concern.status === 'published'}
							<button
								type="button"
								onclick={() => toggleStatus(concern, 'archived')}
								class="rounded-full p-1.5 text-ink-500 hover:bg-ink-100"
								aria-label={`Despublicar ${concern.question}`}
							>
								<EyeOff class="size-4" />
							</button>
						{:else if concern.status === 'draft'}
							<button
								type="button"
								onclick={() => toggleStatus(concern, 'published')}
								class="rounded-full p-1.5 text-brand-700 hover:bg-brand-50"
								aria-label={`Publicar ${concern.question}`}
							>
								<Eye class="size-4" />
							</button>
						{:else}
							<button
								type="button"
								onclick={() => toggleStatus(concern, 'published')}
								class="rounded-full p-1.5 text-brand-700 hover:bg-brand-50"
								aria-label={`Restaurar ${concern.question}`}
							>
								<Archive class="size-4" />
							</button>
						{/if}
					</div>
				</li>
			{:else}
				<li
					class="rounded-2xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-500"
				>
					Todavía no hay preocupaciones creadas.
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<div class="mt-4 flex flex-col gap-5">
		<div>
			<h3 class="text-xs font-semibold tracking-wide text-ink-500 uppercase">
				Pendientes de revisión
			</h3>
			<ul class="mt-2 flex flex-col gap-2">
				{#each pendingProposals as proposal (proposal.id)}
					<li class="border-warning-200 rounded-2xl border bg-warning-50 p-3.5">
						<p class="text-sm font-semibold text-ink-900">{proposal.title}</p>
						<p class="mt-0.5 text-sm text-ink-700">{proposal.proposedQuestion}</p>
						<p class="mt-1 text-xs text-ink-500">
							{concernCategoryLabels[proposal.category]} · Motivo: {proposal.reason}
						</p>
						<div class="mt-2.5 flex gap-2">
							<button
								type="button"
								onclick={() => approveProposal(proposal)}
								class="flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
							>
								<Check class="size-3.5" /> Aprobar y crear preocupación
							</button>
							<button
								type="button"
								onclick={() => openReject(proposal)}
								class="text-critical-600 flex items-center gap-1.5 rounded-full border border-critical-300 px-3.5 py-1.5 text-xs font-semibold hover:bg-critical-50"
							>
								<XIcon class="size-3.5" /> Rechazar
							</button>
						</div>
					</li>
				{:else}
					<li
						class="rounded-2xl border border-dashed border-ink-200 py-8 text-center text-sm text-ink-500"
					>
						No hay propuestas pendientes.
					</li>
				{/each}
			</ul>
		</div>

		{#if reviewedProposals.length > 0}
			<div>
				<h3 class="text-xs font-semibold tracking-wide text-ink-500 uppercase">Revisadas</h3>
				<ul class="mt-2 flex flex-col gap-1.5">
					{#each reviewedProposals as proposal (proposal.id)}
						<li class="flex items-center gap-2 rounded-xl border border-ink-100 p-3 text-sm">
							<span
								class="rounded-full px-2 py-0.5 text-xs font-semibold {proposal.status ===
								'approved'
									? 'bg-brand-100 text-brand-800'
									: 'bg-critical-100 text-critical-700'}"
							>
								{concernProposalStatusLabels[proposal.status]}
							</span>
							<span class="truncate text-ink-700">{proposal.title}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}

<ConcernEditorDialog
	bind:open={editorOpen}
	concern={editingConcern}
	{moderatorId}
	allEvents={events}
	{relatedEvents}
	onSaved={pendingApproval ? onApprovalConcernSaved : onConcernSaved}
	{onRelatedEventsChanged}
	onClose={() => (pendingApproval = null)}
/>

<NoteDialog
	bind:open={rejectOpen}
	title="Rechazar propuesta"
	description="Explica brevemente el motivo — se guarda como nota interna."
	confirmLabel="Rechazar"
	tone="critical"
	onConfirm={confirmReject}
	onClose={() => (rejectTarget = null)}
/>
