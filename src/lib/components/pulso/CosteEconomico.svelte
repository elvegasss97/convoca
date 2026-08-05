<script lang="ts">
	import { ChevronDown, ChevronUp, Info } from '@lucide/svelte';
	import type {
		Topic,
		TopicBudgetLine,
		TopicBudgetScenario,
		TopicBudgetTimelineEntry,
		TopicMeasure,
		TopicMeasureAxis
	} from '$lib/types';
	import BudgetDonutChart from './BudgetDonutChart.svelte';
	import BudgetTimelineChart from './BudgetTimelineChart.svelte';

	interface Props {
		topic: Topic;
		measures: TopicMeasure[];
		axes: TopicMeasureAxis[];
		budgetLines: TopicBudgetLine[];
		budgetScenarios: TopicBudgetScenario[];
		budgetTimeline: TopicBudgetTimelineEntry[];
	}

	let { topic, measures, axes, budgetLines, budgetScenarios, budgetTimeline }: Props = $props();

	// PIB de referencia para el % ilustrativo — dato macroeconómico externo,
	// no contenido del plan, por eso vive aquí y no en Supabase.
	const PIB_2025_MILLONES = 1_687_152; // INE, Contabilidad Nacional Trimestral, 4T 2025

	let view = $state<'lineas' | 'medidas'>('lineas');
	let scenarioKey = $state<string>('central');
	let doubleCountOpen = $state(false);
	let narrativeOpen = $state(false);
	let selectedId = $state<string | null>(null);

	const scenario = $derived(
		budgetScenarios.find((s) => s.key === scenarioKey) ??
			budgetScenarios.find((s) => s.key === 'central') ??
			budgetScenarios[0]
	);
	const centralScenario = $derived(budgetScenarios.find((s) => s.key === 'central'));
	// Los escenarios no central se escalan proporcionalmente a partir del
	// reparto central: la fuente no detalla un reparto propio por escenario.
	// Ver aviso explícito debajo del selector.
	const factor = $derived(centralScenario && scenario ? scenario.total / centralScenario.total : 1);

	// Colores por medida: mismo patrón ya aprobado (familia de color por eje,
	// tono base para la primera medida del eje, tono claro para la segunda).
	const AXIS_FAMILY_SHADES: Record<number, { family: string; shades: [string, string] }> = {
		0: { family: 'brand', shades: ['700', '300'] },
		1: { family: 'accent', shades: ['600', '300'] },
		2: { family: 'warning', shades: ['700', '300'] },
		3: { family: 'ink', shades: ['800', '500'] }
	};
	function measureColorToken(measure: TopicMeasure): string {
		const axisIndex = axes.findIndex((a) => a.id === measure.axisId);
		const family = AXIS_FAMILY_SHADES[axisIndex] ?? AXIS_FAMILY_SHADES[0];
		const positionInAxis = measures
			.filter((m) => m.axisId === measure.axisId)
			.findIndex((m) => m.id === measure.id);
		return `${family.family}-${family.shades[positionInAxis % 2]}`;
	}

	const lineItems = $derived(
		budgetLines.map((l) => ({
			id: l.id,
			label: l.name,
			min: l.minAmount * factor,
			max: l.maxAmount * factor,
			colorToken: l.colorToken
		}))
	);
	const measureItems = $derived(
		measures
			.filter((m) => m.estimatedCostMin != null && m.estimatedCostMax != null)
			.map((m, i) => ({
				id: m.id,
				label: `${i + 1}. ${m.title}`,
				min: (m.estimatedCostMin ?? 0) * factor,
				max: (m.estimatedCostMax ?? 0) * factor,
				colorToken: measureColorToken(m)
			}))
	);

	function eur(n: number): string {
		return Math.round(n).toLocaleString('es-ES');
	}

	const pibPct = $derived(scenario ? ((scenario.total / PIB_2025_MILLONES) * 100).toFixed(2) : '0');

	const hasStructuredBudget = $derived(budgetLines.length > 0 && budgetScenarios.length > 0);
</script>

{#if hasStructuredBudget && scenario}
	<!-- ---------- SELECTOR DE ESCENARIO ---------- -->
	<div class="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 p-5 sm:p-7">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<div class="text-xs font-semibold tracking-wide text-brand-100 uppercase">
					Inversión media anual
				</div>
				<div class="text-4xl font-bold text-white tabular-nums sm:text-5xl">
					{eur(scenario.total)} <span class="text-xl font-medium sm:text-2xl">M€</span>
				</div>
				<div class="mt-1 text-sm text-brand-100">≈ {pibPct} % del PIB español de 2025</div>
			</div>
			<div
				class="flex rounded-full bg-white/10 p-1"
				role="radiogroup"
				aria-label="Escenario de inversión"
			>
				{#each budgetScenarios as s (s.id)}
					<button
						type="button"
						role="radio"
						aria-checked={scenarioKey === s.key}
						onclick={() => (scenarioKey = s.key)}
						class={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors sm:px-4 ${
							scenarioKey === s.key ? 'bg-white text-brand-700' : 'text-white hover:bg-white/10'
						}`}
					>
						{s.label}
					</button>
				{/each}
			</div>
		</div>
		{#if scenario.description}
			<p class="mt-4 text-sm text-brand-100">{scenario.description}</p>
		{/if}
		<div class="mt-5 flex flex-wrap gap-6 border-t border-white/15 pt-4">
			<div>
				<div class="text-xs font-medium text-brand-100">Inversión total 2027–2036</div>
				<div class="text-lg font-bold text-white">{eur(scenario.total * 10)} M€</div>
			</div>
			{#if topic.referenceGoal}
				<div>
					<div class="text-xs font-medium text-brand-100">Objetivo de referencia</div>
					<div class="text-lg font-bold text-white">{topic.referenceGoal}</div>
				</div>
			{/if}
		</div>
	</div>
	<p class="mt-3 flex items-start gap-1.5 text-xs text-ink-500">
		<Info class="mt-0.5 size-3.5 shrink-0" />
		Los importes por línea y por medida se escalan de forma proporcional según el escenario elegido, a
		partir del reparto central. El reparto exacto de cada escenario mínimo o máximo no está detallado
		en la fuente — es una visualización ilustrativa, no una previsión oficial.
	</p>

	<!-- ---------- DONUT + LISTA ---------- -->
	<section class="mt-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<h3 class="font-display text-base font-semibold text-ink-900">¿En qué se invierte?</h3>
			<div
				class="flex rounded-full border border-ink-100 p-1"
				role="radiogroup"
				aria-label="Agrupar por"
			>
				{#each [['lineas', 'Por línea presupuestaria'], ['medidas', 'Por medida']] as [key, label] (key)}
					<button
						type="button"
						role="radio"
						aria-checked={view === key}
						onclick={() => {
							view = key as 'lineas' | 'medidas';
							selectedId = null;
						}}
						class={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
							view === key ? 'bg-ink-800 text-white' : 'text-ink-600 hover:bg-ink-50'
						}`}
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<BudgetDonutChart
			items={view === 'lineas' ? lineItems : measureItems}
			{selectedId}
			onSelect={(id) => (selectedId = id)}
		/>

		{#if view === 'lineas'}
			<div class="mt-6 flex flex-col gap-2">
				{#each budgetLines as line (line.id)}
					{@const open = selectedId === line.id}
					<div
						class={`overflow-hidden rounded-2xl border transition-colors ${open ? '' : 'border-ink-100'}`}
						style={open ? `border-color: var(--color-${line.colorToken})` : ''}
					>
						<button
							type="button"
							onclick={() => (selectedId = open ? null : line.id)}
							aria-expanded={open}
							class="flex w-full items-center gap-3 p-3.5 text-left hover:bg-ink-50/60 sm:p-4"
						>
							<span
								class="size-3 shrink-0 rounded-full"
								style={`background-color: var(--color-${line.colorToken})`}
							></span>
							<span class="flex-1 text-sm font-semibold text-ink-900">{line.name}</span>
							{#if open}<ChevronUp class="size-4 shrink-0 text-ink-400" />{:else}<ChevronDown
									class="size-4 shrink-0 text-ink-400"
								/>{/if}
						</button>
						{#if open}
							<div class="flex flex-col gap-2 px-4 pb-4 pl-[calc(1rem+1.125rem)]">
								{#if line.description}<p class="text-xs text-ink-700">{line.description}</p>{/if}
								{#if line.note}<p class="text-xs text-ink-500 italic">{line.note}</p>{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ---------- DISTRIBUCIÓN TEMPORAL ---------- -->
	{#if budgetTimeline.length > 0}
		<section class="mt-8">
			<h3 class="font-display text-base font-semibold text-ink-900">Distribución temporal</h3>
			<p class="mt-1 mb-4 text-sm text-ink-500">
				Implantación progresiva 2027–2036. Total decenal: {eur(
					Math.min(...budgetTimeline.map((t) => t.minAmount)) * 10
				)}
				–{eur(Math.max(...budgetTimeline.map((t) => t.maxAmount)) * 10)} M€ orientativos.
			</p>
			<BudgetTimelineChart entries={budgetTimeline} />
		</section>
	{/if}

	<!-- ---------- QUÉ NO SE CONTABILIZA DOS VECES ---------- -->
	{#if topic.budgetDoubleCountRules.length > 0}
		<section class="mt-8">
			<button
				type="button"
				onclick={() => (doubleCountOpen = !doubleCountOpen)}
				aria-expanded={doubleCountOpen}
				class="flex w-full items-center justify-between gap-3 rounded-2xl border border-ink-100 p-4 text-left sm:p-5"
			>
				<div>
					<h3 class="font-display text-sm font-bold text-ink-900">
						Qué no debe contabilizarse dos veces
					</h3>
					<p class="mt-0.5 text-xs text-ink-500">
						Reglas del borrador para evitar cifras infladas o engañosas
					</p>
				</div>
				{#if doubleCountOpen}<ChevronUp class="size-5 shrink-0 text-ink-500" />{:else}<ChevronDown
						class="size-5 shrink-0 text-ink-500"
					/>{/if}
			</button>
			{#if doubleCountOpen}
				<ul class="mt-3 flex flex-col gap-2 pl-1">
					{#each topic.budgetDoubleCountRules as rule (rule)}
						<li class="flex items-start gap-2.5 text-sm text-ink-700">
							<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600"></span>
							{rule}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
{:else}
	<!-- Sin desglose estructurado todavía (p. ej. Sanidad): se mantiene la
	     vista simple anterior, sin romper nada. -->
	<dl class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
		<div class="rounded-xl border border-ink-100 p-3">
			<dt class="text-xs text-ink-500">Inversión estimada</dt>
			<dd class="mt-0.5 text-sm font-semibold text-ink-900">
				{topic.investmentRange || 'Pendiente'}
			</dd>
		</div>
		<div class="rounded-xl border border-ink-100 p-3">
			<dt class="text-xs text-ink-500">Esfuerzo</dt>
			<dd class="mt-0.5 text-sm font-semibold text-ink-900">
				{topic.investmentGdpPercent || 'Pendiente'}
			</dd>
		</div>
		<div class="rounded-xl border border-ink-100 p-3">
			<dt class="text-xs text-ink-500">Objetivo</dt>
			<dd class="mt-0.5 text-sm font-semibold text-ink-900">
				{topic.referenceGoal || 'Pendiente'}
			</dd>
		</div>
	</dl>
{/if}

{#if topic.budgetNarrative}
	<div class="mt-6 border-t border-ink-100 pt-4">
		{#if narrativeOpen}
			<p class="text-sm leading-relaxed whitespace-pre-line text-ink-700">
				{topic.budgetNarrative}
			</p>
		{/if}
		<button
			type="button"
			onclick={() => (narrativeOpen = !narrativeOpen)}
			class="mt-1.5 text-sm font-semibold text-brand-700 hover:underline"
		>
			{narrativeOpen ? 'Mostrar menos' : 'Ver desglose económico completo en texto'}
		</button>
	</div>
{/if}
