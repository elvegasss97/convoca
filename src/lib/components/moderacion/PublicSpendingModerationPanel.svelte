<script lang="ts">
	import {
		Archive,
		ArrowUpRight,
		CircleCheck,
		ExternalLink,
		FileSearch,
		LoaderCircle,
		SearchCheck
	} from '@lucide/svelte';
	import type { PublicSpendingSubmission, PublicSpendingSubmissionStatus } from '$lib/types';
	import {
		publicSpendingSubmissionStatusLabels,
		reviewPublicSpendingSubmission
	} from '$lib/services/publicSpendingService';

	interface Props {
		items: PublicSpendingSubmission[];
		moderatorId: string;
	}

	let { items = $bindable(), moderatorId }: Props = $props();
	let editingId = $state<string | null>(null);
	let reviewStatus = $state<Exclude<PublicSpendingSubmissionStatus, 'received'>>('triage');
	let reviewerNote = $state('');
	let resultingCaseSlug = $state('');
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);

	const activeItems = $derived(
		items.filter((item) => item.status !== 'published' && item.status !== 'dismissed')
	);
	const closedItems = $derived(
		items.filter((item) => item.status === 'published' || item.status === 'dismissed')
	);

	function startReview(item: PublicSpendingSubmission) {
		editingId = item.id;
		reviewStatus = item.status === 'received' ? 'triage' : item.status;
		reviewerNote = item.reviewerNote ?? '';
		resultingCaseSlug = item.resultingCaseSlug ?? '';
		errorMessage = null;
	}

	async function save(item: PublicSpendingSubmission) {
		if (saving) return;
		if (reviewStatus === 'published' && !resultingCaseSlug.trim()) {
			errorMessage = 'Indica el slug de la ficha publicada.';
			return;
		}
		saving = true;
		errorMessage = null;
		try {
			const updated = await reviewPublicSpendingSubmission(item.id, {
				status: reviewStatus,
				reviewerId: moderatorId,
				note: reviewerNote,
				resultingCaseSlug
			});
			items = items.map((candidate) => (candidate.id === item.id ? updated : candidate));
			editingId = null;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se ha podido guardar el triaje.';
		} finally {
			saving = false;
		}
	}

	function formatDate(value: string): string {
		return new Intl.DateTimeFormat('es-ES', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function statusClass(status: PublicSpendingSubmissionStatus): string {
		return status === 'received'
			? 'status-received'
			: status === 'triage'
				? 'status-triage'
				: status === 'researching'
					? 'status-researching'
					: status === 'published'
						? 'status-published'
						: 'status-dismissed';
	}
</script>

<section>
	<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 class="font-display text-lg font-semibold text-ink-900">Pistas sobre gasto público</h2>
			<p class="mt-1 max-w-2xl text-xs leading-relaxed text-ink-500">
				Aportaciones privadas para triaje. Investigar una pista no presupone irregularidad; no
				copies identidad ni texto ciudadano innecesario a una ficha pública.
			</p>
		</div>
		<span class="text-warning-800 rounded-full bg-warning-100 px-3 py-1 text-xs font-semibold">
			{activeItems.length} activas
		</span>
	</div>

	{#if activeItems.length === 0}
		<div
			class="mt-4 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800"
		>
			<CircleCheck class="size-5 shrink-0" /> No hay pistas pendientes de triaje o investigación.
		</div>
	{:else}
		<div class="mt-4 space-y-3">
			{#each activeItems as item (item.id)}
				<article class="rounded-2xl border border-ink-100 bg-white p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="status-pill {statusClass(item.status)}">
									{publicSpendingSubmissionStatusLabels[item.status]}
								</span>
								<span class="text-[11px] text-ink-400">{formatDate(item.createdAt)}</span>
							</div>
							<h3 class="mt-2 font-display text-base font-semibold text-ink-900">{item.title}</h3>
							<p class="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-600">
								{item.details}
							</p>
						</div>
						<button
							type="button"
							onclick={() => startReview(item)}
							class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
						>
							<SearchCheck class="size-3.5" /> Tramitar
						</button>
					</div>

					<div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
						{#if item.amountText}<span
								><strong class="text-ink-700">Importe:</strong> {item.amountText}</span
							>{/if}
						{#if item.managingOrganization}<span
								><strong class="text-ink-700">Organismo:</strong> {item.managingOrganization}</span
							>{/if}
						{#if item.territory}<span
								><strong class="text-ink-700">Territorio:</strong> {item.territory}</span
							>{/if}
					</div>

					<div class="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
						{#each item.sourceUrls as source, index (source)}
							<a
								href={source}
								target="_blank"
								rel="noreferrer"
								class="inline-flex max-w-full items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
							>
								<FileSearch class="size-3.5 shrink-0" /> Fuente {index + 1}
								<ExternalLink class="size-3 shrink-0" />
							</a>
						{/each}
					</div>

					{#if editingId === item.id}
						<div class="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
							<div class="grid gap-3 sm:grid-cols-2">
								<div>
									<label for={`spending-status-${item.id}`} class="review-label">Estado</label>
									<select
										id={`spending-status-${item.id}`}
										bind:value={reviewStatus}
										class="review-control"
									>
										<option value="triage">En triaje</option>
										<option value="researching">En investigación</option>
										<option value="published">Publicada como ficha</option>
										<option value="dismissed">Archivada</option>
									</select>
								</div>
								{#if reviewStatus === 'published'}
									<div>
										<label for={`spending-slug-${item.id}`} class="review-label"
											>Slug de la ficha</label
										>
										<input
											id={`spending-slug-${item.id}`}
											bind:value={resultingCaseSlug}
											placeholder="nombre-del-expediente"
											class="review-control"
										/>
									</div>
								{/if}
							</div>
							<div class="mt-3">
								<label for={`spending-note-${item.id}`} class="review-label">Nota interna</label>
								<textarea
									id={`spending-note-${item.id}`}
									bind:value={reviewerNote}
									rows="3"
									maxlength="1200"
									placeholder="Próximo paso, motivo de archivo o comprobaciones pendientes…"
									class="review-control"></textarea>
							</div>
							{#if errorMessage}<p class="text-critical-600 mt-2 text-xs" role="alert">
									{errorMessage}
								</p>{/if}
							<div class="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									disabled={saving}
									onclick={() => save(item)}
									class="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
								>
									{#if saving}<LoaderCircle class="size-3.5 animate-spin" />{:else}<SearchCheck
											class="size-3.5"
										/>{/if}
									Guardar triaje
								</button>
								<button
									type="button"
									onclick={() => (editingId = null)}
									class="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
									>Cancelar</button
								>
							</div>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}

	{#if closedItems.length > 0}
		<details class="mt-6 rounded-2xl border border-ink-100 bg-white p-4">
			<summary class="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-800">
				<Archive class="size-4" /> Historial cerrado ({closedItems.length})
			</summary>
			<div class="mt-3 space-y-2 border-t border-ink-100 pt-3">
				{#each closedItems as item (item.id)}
					<div
						class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2 text-xs"
					>
						<div class="min-w-0">
							<span class="status-pill {statusClass(item.status)}"
								>{publicSpendingSubmissionStatusLabels[item.status]}</span
							>
							<span class="ml-2 font-semibold text-ink-800">{item.title}</span>
						</div>
						{#if item.resultingCaseSlug}
							<a
								href={`/pulso/gasto-publico/${item.resultingCaseSlug}`}
								class="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
							>
								Ver ficha <ArrowUpRight class="size-3.5" />
							</a>
						{/if}
					</div>
				{/each}
			</div>
		</details>
	{/if}
</section>

<style>
	.status-pill {
		display: inline-flex;
		border-radius: 9999px;
		padding: 0.2rem 0.5rem;
		font-size: 0.65rem;
		font-weight: 700;
	}
	.status-received {
		background: var(--color-warning-100);
		color: var(--color-warning-800);
	}
	.status-triage {
		background: var(--color-accent-100);
		color: var(--color-accent-800);
	}
	.status-researching {
		background: #e9eef8;
		color: #365683;
	}
	.status-published {
		background: var(--color-brand-100);
		color: var(--color-brand-800);
	}
	.status-dismissed {
		background: var(--color-ink-100);
		color: var(--color-ink-600);
	}
	.review-label {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.7rem;
		font-weight: 650;
		color: var(--color-ink-600);
	}
	.review-control {
		width: 100%;
		border-color: var(--color-ink-200);
		border-radius: 0.7rem;
		background: white;
		font-size: 0.8rem;
	}
</style>
