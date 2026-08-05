<script lang="ts">
	import type { TopicBudgetTimelineEntry } from '$lib/types';

	interface Props {
		entries: TopicBudgetTimelineEntry[];
	}

	let { entries }: Props = $props();

	let activeYear = $state<number | null>(null);
	const maxValue = $derived(entries.reduce((m, e) => Math.max(m, e.maxAmount), 0));

	function eur(n: number): string {
		return Math.round(n).toLocaleString('es-ES');
	}

	const activeEntry = $derived(entries.find((e) => e.year === activeYear) ?? null);
</script>

<div>
	<div
		class="flex h-56 items-end gap-1.5 sm:gap-2"
		role="list"
		aria-label="Distribución temporal de la inversión, 2027 a 2036"
	>
		{#each entries as entry (entry.year)}
			{@const heightPct = maxValue > 0 ? (entry.maxAmount / maxValue) * 100 : 0}
			<button
				type="button"
				role="listitem"
				onmouseenter={() => (activeYear = entry.year)}
				onmouseleave={() => (activeYear = null)}
				onfocus={() => (activeYear = entry.year)}
				onblur={() => (activeYear = null)}
				aria-pressed={activeYear === entry.year}
				aria-label={`${entry.year}: entre ${eur(entry.minAmount)} y ${eur(entry.maxAmount)} millones de euros${entry.isPeriodAverage ? ', media del periodo' : ''}`}
				class="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
			>
				<span
					class={`w-full rounded-t-md transition-colors ${
						entry.isPeriodAverage ? 'bg-brand-300' : 'bg-brand-700'
					} ${activeYear === entry.year ? 'brightness-110' : ''}`}
					style={`height:${heightPct}%`}
				></span>
				<span class="text-[11px] font-medium text-ink-500">{entry.year}</span>
			</button>
		{/each}
	</div>

	<div class="mt-3 min-h-[52px] rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-xs">
		{#if activeEntry}
			<p class="font-semibold text-ink-900">
				{activeEntry.year} · {eur(activeEntry.minAmount)}–{eur(activeEntry.maxAmount)} M€
				{#if activeEntry.isPeriodAverage}
					<span class="font-normal text-ink-500">(media del periodo)</span>
				{/if}
			</p>
			{#if activeEntry.note}
				<p class="mt-0.5 text-ink-600">{activeEntry.note}</p>
			{/if}
		{:else}
			<p class="text-ink-500">
				Pasa el cursor o navega con el teclado por cada año para ver su detalle.
			</p>
		{/if}
	</div>
</div>
