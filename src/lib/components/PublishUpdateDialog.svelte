<script lang="ts">
	import { X, MessageSquareText } from '@lucide/svelte';
	import type { EventUpdate } from '$lib/types';
	import { publishUpdate } from '$lib/services/updatesService';

	interface Props {
		open: boolean;
		eventId: string;
		organizerId: string;
		onPublished: (update: EventUpdate) => void;
		onClose: () => void;
	}

	let { open = $bindable(), eventId, organizerId, onPublished, onClose }: Props = $props();

	let title = $state('');
	let body = $state('');
	let isCritical = $state(false);
	let submitting = $state(false);

	function close() {
		open = false;
		onClose();
		title = '';
		body = '';
		isCritical = false;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!title.trim() || !body.trim()) return;
		submitting = true;
		try {
			const update = await publishUpdate({
				eventId,
				authorOrganizerId: organizerId,
				title: title.trim(),
				body: body.trim(),
				isCritical
			});
			onPublished(update);
			close();
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
			class="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-card-hover sm:rounded-3xl"
		>
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
					<MessageSquareText class="size-5 text-brand-700" /> Publicar actualización
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
					<label for="update-title" class="mb-1 block text-sm font-medium text-ink-700"
						>Título</label
					>
					<input
						id="update-title"
						bind:value={title}
						maxlength="80"
						placeholder="Ej. Cambio de punto de encuentro"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
				<div>
					<label for="update-body" class="mb-1 block text-sm font-medium text-ink-700"
						>Mensaje</label
					>
					<textarea
						id="update-body"
						bind:value={body}
						rows="3"
						maxlength="400"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
				</div>
				<label class="flex items-center gap-2.5 text-sm font-medium text-ink-800">
					<input
						type="checkbox"
						bind:checked={isCritical}
						class="size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
					/>
					Es un cambio importante (hora, lugar o cancelación)
				</label>
				<button
					type="submit"
					disabled={submitting || !title.trim() || !body.trim()}
					class="w-full rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
				>
					{submitting ? 'Publicando…' : 'Publicar actualización'}
				</button>
			</form>
		</div>
	</div>
{/if}
