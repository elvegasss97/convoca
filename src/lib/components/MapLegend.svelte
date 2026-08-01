<script lang="ts">
	import { ChevronDown, ChevronUp } from '@lucide/svelte';
	import { TIME_CATEGORY_COLORS, TIME_CATEGORY_LABELS } from '$lib/utils/eventTiming';
	import type { EventTimeCategory } from '$lib/utils/eventTiming';

	// "Finalizada" (gris) se omite a propósito: solo aparece si el filtro
	// "Finalizadas" está activo, y en ese caso todos los marcadores
	// visibles son ya de esa única categoría — no hace falta explicarla en
	// la leyenda de "Ver todas".
	const entries = (
		['today', 'this_week', 'upcoming_weeks', 'over_month'] as EventTimeCategory[]
	).map((category) => ({
		category,
		color: TIME_CATEGORY_COLORS[category],
		label: TIME_CATEGORY_LABELS[category]
	}));

	let collapsed = $state(false);
</script>

<div
	class="pointer-events-auto absolute bottom-3 left-3 z-10 rounded-2xl border border-ink-100 bg-white/95 shadow-card backdrop-blur"
>
	<button
		type="button"
		onclick={() => (collapsed = !collapsed)}
		class="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-ink-700 md:hidden"
		aria-expanded={!collapsed}
	>
		Leyenda
		{#if collapsed}<ChevronUp class="size-3.5" />{:else}<ChevronDown class="size-3.5" />{/if}
	</button>
	{#if !collapsed}
		<ul class="flex flex-col gap-1.5 px-3 pb-2.5 text-xs text-ink-700 md:pt-2.5">
			{#each entries as entry (entry.category)}
				<li class="flex items-center gap-2">
					<span
						class="size-2.5 shrink-0 rounded-full border border-white shadow-sm"
						style={`background-color: ${entry.color}`}
					></span>
					{entry.label}
				</li>
			{/each}
		</ul>
	{/if}
</div>
