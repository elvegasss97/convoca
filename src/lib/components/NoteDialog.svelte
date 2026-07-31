<script lang="ts">
	import { X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		placeholder?: string;
		confirmLabel: string;
		tone?: 'brand' | 'critical';
		requireNote?: boolean;
		onConfirm: (note: string) => void | Promise<void>;
		onClose: () => void;
	}

	let {
		open = $bindable(),
		title,
		description = '',
		placeholder = 'Añade una nota (opcional)…',
		confirmLabel,
		tone = 'brand',
		requireNote = false,
		onConfirm,
		onClose
	}: Props = $props();

	let note = $state('');
	let submitting = $state(false);

	function close() {
		open = false;
		onClose();
		note = '';
	}

	async function confirm() {
		if (requireNote && !note.trim()) return;
		submitting = true;
		try {
			await onConfirm(note.trim());
			close();
		} finally {
			submitting = false;
		}
	}

	const confirmClasses = $derived(
		tone === 'critical'
			? 'bg-critical-500 hover:bg-critical-700'
			: 'bg-brand-700 hover:bg-brand-800'
	);
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
				<h2 class="font-display text-lg font-semibold text-ink-900">{title}</h2>
				<button
					onclick={close}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar"
				>
					<X class="size-5" />
				</button>
			</div>
			{#if description}
				<p class="mt-1.5 text-sm text-ink-500">{description}</p>
			{/if}
			<textarea
				bind:value={note}
				rows="3"
				{placeholder}
				class="mt-3 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
			></textarea>
			<div class="mt-4 flex gap-2">
				<button
					type="button"
					onclick={close}
					class="flex-1 rounded-full border border-ink-200 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={confirm}
					disabled={submitting || (requireNote && !note.trim())}
					class="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 {confirmClasses}"
				>
					{submitting ? 'Guardando…' : confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
