<script lang="ts">
	import type { ConcernLevel, ConcernResults } from '$lib/types';
	import { concernLevelLabels, concernLevelShortLabels } from '$lib/labels';

	interface Props {
		results: ConcernResults;
		/** true = barra compacta apilada para tarjetas; false = desglose completo de resultados. */
		compact?: boolean;
	}

	let { results, compact = false }: Props = $props();

	const LEVELS: ConcernLevel[] = [1, 2, 3, 4, 5];
	const LEVEL_COLORS: Record<ConcernLevel, string> = {
		1: 'var(--color-ink-300)',
		2: 'var(--color-ink-400)',
		3: 'var(--color-warning-300)',
		4: 'var(--color-warning-500)',
		5: 'var(--color-critical-500)'
	};

	function percentage(level: ConcernLevel): number {
		if (results.totalResponses === 0) return 0;
		return Math.round((results.counts[level] / results.totalResponses) * 100);
	}

	const averageLabel = $derived.by(() => {
		if (results.averageLevel === undefined) return 'Aún no hay datos suficientes';
		const rounded = Math.round(results.averageLevel) as ConcernLevel;
		return `${results.averageLevel.toFixed(1)} / 5 · ${concernLevelLabels[rounded]}`;
	});
</script>

{#if compact}
	<div>
		{#if results.totalResponses === 0}
			<p class="text-xs text-ink-400">Aún no hay datos suficientes</p>
		{:else}
			<div
				class="flex h-2 w-full overflow-hidden rounded-full bg-ink-100"
				role="img"
				aria-label={`Distribución de respuestas: ${LEVELS.map((l) => `${concernLevelShortLabels[l]} ${percentage(l)}%`).join(', ')}`}
			>
				{#each LEVELS as level (level)}
					{#if percentage(level) > 0}
						<span style={`width:${percentage(level)}%; background-color:${LEVEL_COLORS[level]}`}
						></span>
					{/if}
				{/each}
			</div>
			<p class="mt-1 text-xs font-medium text-ink-600">{averageLabel}</p>
		{/if}
	</div>
{:else}
	<div>
		<p class="font-display text-sm font-semibold text-ink-900">{averageLabel}</p>
		{#if results.totalResponses > 0}
			<p class="mt-0.5 text-xs text-ink-500">
				{results.totalResponses}
				{results.totalResponses === 1 ? 'persona ha respondido' : 'personas han respondido'}
			</p>
		{/if}

		{#if results.totalResponses === 0}
			<!--
				results.totalResponses === 0 aquí puede significar "sin respuestas" o "entre 1 y 4
				respuestas suprimidas por privacidad" (0043, get_concern_results) — no hay forma de
				distinguirlas desde el cliente, ni la hay: es la garantía de indistinguibilidad del
				diseño. No afirmar "sé la primera persona en participar", puede ser falso.
			-->
			<p class="mt-3 rounded-xl border border-dashed border-ink-200 p-3 text-sm text-ink-500">
				Aún no hay datos suficientes para mostrar este desglose.
			</p>
		{:else}
			<ul class="mt-3 flex flex-col gap-2">
				{#each LEVELS as level (level)}
					<li class="flex items-center gap-2.5 text-sm">
						<span class="w-24 shrink-0 text-ink-700">{concernLevelLabels[level]}</span>
						<span class="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
							<span
								class="block h-full rounded-full transition-[width]"
								style={`width:${percentage(level)}%; background-color:${LEVEL_COLORS[level]}`}
							></span>
						</span>
						<span class="w-16 shrink-0 text-right font-medium text-ink-800">
							{percentage(level)}%
						</span>
						<span class="w-10 shrink-0 text-right text-xs text-ink-400">
							{results.counts[level]}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
