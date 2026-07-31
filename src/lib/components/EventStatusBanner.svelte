<script lang="ts">
	import { AlertTriangle, Ban } from '@lucide/svelte';
	import type { Event } from '$lib/types';

	interface Props {
		event: Event;
	}

	let { event }: Props = $props();

	const visible = $derived(event.status === 'cancelled' || event.status === 'modified');
	const isCancelled = $derived(event.status === 'cancelled');
</script>

{#if visible}
	<div
		class="flex items-start gap-3 rounded-2xl border px-4 py-3 {isCancelled
			? 'border-critical-300 bg-critical-50 text-critical-700'
			: 'border-warning-300 bg-warning-50 text-warning-700'}"
		role="alert"
	>
		{#if isCancelled}
			<Ban class="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
		{:else}
			<AlertTriangle class="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
		{/if}
		<div class="text-sm">
			<p class="font-semibold">
				{isCancelled ? 'Convocatoria cancelada' : 'Esta convocatoria ha cambiado'}
			</p>
			{#if event.statusNote}
				<p class="mt-0.5 leading-snug opacity-90">{event.statusNote}</p>
			{/if}
		</div>
	</div>
{/if}
