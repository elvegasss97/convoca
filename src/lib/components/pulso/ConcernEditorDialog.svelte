<script lang="ts">
	import { X, AlertCircle, Link as LinkIcon, Trash2 } from '@lucide/svelte';
	import type {
		Concern,
		ConcernCategory,
		ConcernScopeType,
		ConcernStatus,
		Event
	} from '$lib/types';
	import { concernCategoryLabels, concernStatusLabels } from '$lib/labels';
	import {
		createConcern,
		updateConcern,
		linkConcernToEvent,
		unlinkConcernFromEvent,
		type ConcernInput
	} from '$lib/services/concernsService';
	import TerritoryPicker from './TerritoryPicker.svelte';

	interface Props {
		open: boolean;
		/** null = creando una preocupación nueva. */
		concern: Concern | null;
		moderatorId: string;
		allEvents: Event[];
		relatedEvents: Event[];
		onSaved: (concern: Concern) => void;
		onRelatedEventsChanged: (concernId: string) => void;
		onClose: () => void;
	}

	let {
		open = $bindable(),
		concern,
		moderatorId,
		allEvents,
		relatedEvents,
		onSaved,
		onRelatedEventsChanged,
		onClose
	}: Props = $props();

	function toLocalInput(iso: string | undefined): string {
		if (!iso) return '';
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	let category = $state<ConcernCategory>(concern?.category ?? 'vivienda');
	let question = $state(concern?.question ?? '');
	let description = $state(concern?.description ?? '');
	let scopeType = $state<ConcernScopeType>(concern?.scope.type ?? 'nacional');
	let scopeValue = $state<string | undefined>(concern?.scope.value);
	let status = $state<ConcernStatus>(concern?.status ?? 'draft');
	let startsAt = $state(toLocalInput(concern?.startsAt) || toLocalInput(new Date().toISOString()));
	let closesAt = $state(toLocalInput(concern?.closesAt));

	let submitting = $state(false);
	let submitError = $state<string | null>(null);
	let showErrors = $state(false);

	let selectedEventToLink = $state('');
	let linkingEvent = $state(false);

	const formValid = $derived(question.trim().length >= 10 && startsAt.length > 0);

	const linkableEvents = $derived(
		allEvents.filter((e) => !relatedEvents.some((r) => r.id === e.id))
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		showErrors = true;
		if (!formValid || submitting) return;
		submitting = true;
		submitError = null;
		try {
			const input: ConcernInput = {
				category,
				question: question.trim(),
				description: description.trim(),
				scope: { type: scopeType, value: scopeType === 'nacional' ? undefined : scopeValue },
				status,
				startsAt: new Date(startsAt).toISOString(),
				closesAt: closesAt ? new Date(closesAt).toISOString() : undefined
			};
			const saved = concern
				? await updateConcern(concern.id, input)
				: await createConcern(input, moderatorId);
			onSaved(saved);
			close();
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'No se ha podido guardar la preocupación.';
		} finally {
			submitting = false;
		}
	}

	async function addRelatedEvent() {
		if (!concern || !selectedEventToLink) return;
		linkingEvent = true;
		try {
			await linkConcernToEvent(concern.id, selectedEventToLink);
			onRelatedEventsChanged(concern.id);
			selectedEventToLink = '';
		} finally {
			linkingEvent = false;
		}
	}

	async function removeRelatedEvent(eventId: string) {
		if (!concern) return;
		await unlinkConcernFromEvent(concern.id, eventId);
		onRelatedEventsChanged(concern.id);
	}

	function close() {
		open = false;
		onClose();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm sm:items-center"
	>
		<button class="absolute inset-0" aria-label="Cerrar" onclick={close}></button>
		<div
			class="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card-hover sm:rounded-3xl"
		>
			<div class="flex items-center justify-between">
				<h2 class="font-display text-lg font-semibold text-ink-900">
					{concern ? 'Editar preocupación' : 'Nueva preocupación'}
				</h2>
				<button
					onclick={close}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar"
				>
					<X class="size-5" />
				</button>
			</div>

			<form class="mt-4 space-y-4" onsubmit={submit} novalidate>
				{#if submitError}
					<div
						class="flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
						role="alert"
					>
						<AlertCircle class="mt-0.5 size-4 shrink-0" />
						{submitError}
					</div>
				{/if}

				<div>
					<label for="concern-question" class="mb-1 block text-sm font-medium text-ink-700"
						>Pregunta</label
					>
					<textarea
						id="concern-question"
						bind:value={question}
						rows="2"
						maxlength="200"
						placeholder="¿Cuánto te preocupa...?"
						aria-invalid={showErrors && question.trim().length < 10}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors &&
						question.trim().length < 10
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"></textarea>
					{#if showErrors && question.trim().length < 10}
						<p class="text-critical-600 mt-1 text-xs">Escribe al menos 10 caracteres.</p>
					{/if}
				</div>

				<div>
					<label for="concern-description" class="mb-1 block text-sm font-medium text-ink-700">
						Descripción
					</label>
					<textarea
						id="concern-description"
						bind:value={description}
						rows="2"
						maxlength="500"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="concern-category" class="mb-1 block text-sm font-medium text-ink-700"
							>Categoría</label
						>
						<select
							id="concern-category"
							bind:value={category}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							{#each Object.entries(concernCategoryLabels) as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="concern-status" class="mb-1 block text-sm font-medium text-ink-700"
							>Estado</label
						>
						<select
							id="concern-status"
							bind:value={status}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							{#each Object.entries(concernStatusLabels) as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<p class="mb-1 block text-sm font-medium text-ink-700">Ámbito territorial</p>
					<TerritoryPicker bind:scopeType bind:scopeValue idPrefix="concern-scope" />
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div>
						<label for="concern-starts" class="mb-1 block text-sm font-medium text-ink-700">
							Fecha de inicio
						</label>
						<input
							id="concern-starts"
							type="datetime-local"
							bind:value={startsAt}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						/>
					</div>
					<div>
						<label for="concern-closes" class="mb-1 block text-sm font-medium text-ink-700">
							Fecha de cierre <span class="font-normal text-ink-400">(opcional)</span>
						</label>
						<input
							id="concern-closes"
							type="datetime-local"
							bind:value={closesAt}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						/>
					</div>
				</div>

				{#if concern}
					<div class="rounded-2xl border border-ink-100 p-3.5">
						<p class="flex items-center gap-1.5 text-sm font-medium text-ink-700">
							<LinkIcon class="size-4" /> Convocatorias relacionadas
						</p>
						{#if relatedEvents.length > 0}
							<ul class="mt-2 flex flex-col gap-1.5">
								{#each relatedEvents as event (event.id)}
									<li class="flex items-center justify-between gap-2 text-sm text-ink-700">
										<span class="truncate">{event.title}</span>
										<button
											type="button"
											onclick={() => removeRelatedEvent(event.id)}
											class="hover:text-critical-600 shrink-0 rounded-full p-1 text-ink-400 hover:bg-critical-50"
											aria-label={`Quitar ${event.title} de convocatorias relacionadas`}
										>
											<Trash2 class="size-3.5" />
										</button>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="mt-1.5 text-xs text-ink-400">Sin convocatorias relacionadas todavía.</p>
						{/if}
						{#if linkableEvents.length > 0}
							<div class="mt-2.5 flex gap-2">
								<select
									bind:value={selectedEventToLink}
									class="flex-1 rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
								>
									<option value="">Selecciona una convocatoria…</option>
									{#each linkableEvents as event (event.id)}
										<option value={event.id}>{event.title}</option>
									{/each}
								</select>
								<button
									type="button"
									disabled={!selectedEventToLink || linkingEvent}
									onclick={addRelatedEvent}
									class="shrink-0 rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
								>
									Vincular
								</button>
							</div>
						{/if}
					</div>
				{/if}

				<button
					type="submit"
					disabled={submitting}
					class="w-full rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
				>
					{submitting ? 'Guardando…' : concern ? 'Guardar cambios' : 'Crear preocupación'}
				</button>
			</form>
		</div>
	</div>
{/if}
