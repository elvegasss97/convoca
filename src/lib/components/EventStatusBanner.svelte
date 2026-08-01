<script lang="ts">
	import { AlertTriangle, Ban, CheckCircle2 } from '@lucide/svelte';
	import type { Event } from '$lib/types';

	interface Props {
		event: Event;
	}

	let { event }: Props = $props();

	const visible = $derived(
		event.status === 'cancelled' || event.status === 'modified' || event.status === 'completed'
	);
	const isCancelled = $derived(event.status === 'cancelled');
	const isCompleted = $derived(event.status === 'completed');
</script>

{#if visible}
	<div
		class="flex items-start gap-3 rounded-2xl border px-4 py-3 {isCancelled
			? 'border-critical-300 bg-critical-50 text-critical-700'
			: isCompleted
				? 'border-ink-200 bg-ink-100 text-ink-600'
				: 'border-warning-300 bg-warning-50 text-warning-700'}"
		role="alert"
	>
		{#if isCancelled}
			<Ban class="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
		{:else if isCompleted}
			<CheckCircle2 class="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
		{:else}
			<AlertTriangle class="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
		{/if}
		<div class="text-sm">
			<p class="font-semibold">
				{isCancelled
					? 'Convocatoria cancelada'
					: isCompleted
						? 'Convocatoria finalizada'
						: 'Esta convocatoria ha cambiado'}
			</p>
			{#if isCompleted && !event.statusNote}
				<p class="mt-0.5 leading-snug opacity-90">Esta fecha ya ha pasado.</p>
			{/if}
			{#if event.statusNote}
				<p class="mt-0.5 leading-snug opacity-90">{event.statusNote}</p>
			{/if}
		</div>
	</div>
{/if}
