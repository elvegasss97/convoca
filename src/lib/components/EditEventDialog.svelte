<script lang="ts">
	import { X, Pencil } from '@lucide/svelte';
	import type { Event } from '$lib/types';
	import { updateEventAsOwner } from '$lib/services/eventsService';
	import {
		listChannelsForEvent,
		createChannel,
		updateChannel,
		deleteChannel
	} from '$lib/services/channelsService';
	import ChannelsEditor, { type ChannelDraft } from '$lib/components/ChannelsEditor.svelte';

	interface Props {
		open: boolean;
		event: Event;
		userId: string;
		onSaved: (event: Event) => void;
		onClose: () => void;
	}

	let { open = $bindable(), event, userId, onSaved, onClose }: Props = $props();

	let title = $state(event.title);
	let description = $state(event.description);
	let objective = $state(event.objective);
	let submitting = $state(false);
	let submitError = $state<string | null>(null);
	let channels = $state<ChannelDraft[]>([]);

	$effect(() => {
		if (open) {
			title = event.title;
			description = event.description;
			objective = event.objective;
			listChannelsForEvent(event.id)
				.then((existing) => {
					channels = existing.map((c) => ({
						localId: crypto.randomUUID(),
						existingId: c.id,
						platform: c.platform,
						channelType: c.channelType,
						label: c.label ?? '',
						url: c.url
					}));
				})
				.catch(() => {
					channels = [];
				});
		}
	});

	function close() {
		open = false;
		onClose();
	}

	/**
	 * Diferencia el estado local contra lo que había al abrir el diálogo:
	 * altas (sin `existingId`), ediciones (`existingId` presente y sigue en
	 * la lista) y bajas (`existingId` que ya no está en la lista local).
	 */
	async function syncChannels() {
		const currentIds = new Set(channels.filter((c) => c.existingId).map((c) => c.existingId));
		const original = await listChannelsForEvent(event.id);

		for (const original_ of original) {
			if (!currentIds.has(original_.id)) {
				await deleteChannel(original_.id);
			}
		}

		for (const draft of channels) {
			if (!draft.url.trim()) continue;
			const payload = {
				platform: draft.platform,
				channelType: draft.channelType,
				label: draft.label,
				url: draft.url
			};
			if (draft.existingId) {
				await updateChannel(draft.existingId, payload);
			} else {
				await createChannel(event.id, payload);
			}
		}
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		submitError = null;
		try {
			const updated = await updateEventAsOwner(userId, event.id, {
				title: title.trim(),
				description: description.trim(),
				objective: objective.trim(),
				status: event.status === 'published' ? 'modified' : event.status,
				statusNote:
					event.status === 'published'
						? 'El organizador ha editado el contenido de la convocatoria.'
						: event.statusNote
			});
			await syncChannels();
			onSaved(updated);
			close();
		} catch (err) {
			console.error('No se pudo guardar la convocatoria', err);
			submitError = 'No se han podido guardar los cambios. Inténtalo de nuevo.';
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm sm:items-center"
	>
		<button class="absolute inset-0" aria-label="Cerrar" onclick={close}></button>
		<div
			class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card-hover sm:rounded-3xl"
		>
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
					<Pencil class="size-5 text-brand-700" /> Editar convocatoria
				</h2>
				<button
					onclick={close}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar"
				>
					<X class="size-5" />
				</button>
			</div>
			<form class="mt-4 space-y-3" onsubmit={submit}>
				<div>
					<label for="edit-title" class="mb-1 block text-sm font-medium text-ink-700">Título</label>
					<input
						id="edit-title"
						bind:value={title}
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
				<div>
					<label for="edit-description" class="mb-1 block text-sm font-medium text-ink-700"
						>Descripción</label
					>
					<textarea
						id="edit-description"
						bind:value={description}
						rows="4"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
				</div>
				<div>
					<label for="edit-objective" class="mb-1 block text-sm font-medium text-ink-700"
						>Objetivo</label
					>
					<input
						id="edit-objective"
						bind:value={objective}
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
				{#if event.status === 'published'}
					<p class="text-xs text-ink-400">
						Como esta convocatoria ya está publicada, guardar cambios la marcará como "Modificada" y
						se mostrará un aviso a las personas interesadas.
					</p>
				{/if}

				<div class="border-t border-ink-100 pt-3">
					<ChannelsEditor bind:channels />
				</div>

				{#if submitError}
					<p class="text-critical-600 text-sm">{submitError}</p>
				{/if}
				<button
					type="submit"
					disabled={submitting || !title.trim()}
					class="w-full rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
				>
					{submitting ? 'Guardando…' : 'Guardar cambios'}
				</button>
			</form>
		</div>
	</div>
{/if}
