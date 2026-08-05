<script lang="ts">
	import {
		AlertTriangle,
		Calendar,
		CalendarCheck2,
		CalendarClock,
		CalendarRange,
		ChevronDown,
		ChevronUp,
		RefreshCcw,
		TrendingUp
	} from '@lucide/svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type {
		Topic,
		TopicMeasureChangeCondition,
		TopicEvaluationMoment,
		TopicRisk
	} from '$lib/types';
	import RiskMap from './RiskMap.svelte';
	import IndicatorExplorer from './IndicatorExplorer.svelte';

	interface Props {
		topic: Topic;
		risks: TopicRisk[];
		evaluationMoments: TopicEvaluationMoment[];
		measureChangeConditions: TopicMeasureChangeCondition[];
	}

	let { topic, risks, evaluationMoments, measureChangeConditions }: Props = $props();

	let evaluationNarrativeOpen = $state(false);
	let governanceOpen = $state(false);

	// Los 69 indicadores llegan como lista plana con el prefijo de su
	// categoría ("A. Parque público — ..." o, en temas sin letra, "Acceso —
	// ..."); se agrupan aquí solo para la presentación.
	interface IndicatorGroup {
		category: string;
		items: string[];
	}
	const indicatorGroups = $derived.by<IndicatorGroup[]>(() => {
		const order: string[] = [];
		const map = new SvelteMap<string, string[]>();
		for (const line of topic.successIndicators) {
			const sepIndex = line.indexOf(' — ');
			const category = sepIndex >= 0 ? line.slice(0, sepIndex) : 'Otros indicadores';
			const text = sepIndex >= 0 ? line.slice(sepIndex + 3) : line;
			if (!map.has(category)) order.push(category);
			const list = map.get(category) ?? [];
			list.push(text);
			map.set(category, list);
		}
		return order.map((category) => ({ category, items: map.get(category) ?? [] }));
	});

	const categoryCount = $derived(new Set(risks.map((r) => r.category).filter(Boolean)).size);

	const heroStats = $derived(
		[
			{ n: risks.length, l: risks.length === 1 ? 'riesgo identificado' : 'riesgos identificados' },
			{ n: categoryCount, l: categoryCount === 1 ? 'categoría de riesgo' : 'categorías de riesgo' },
			{
				n: topic.successIndicators.length,
				l:
					topic.successIndicators.length === 1
						? 'indicador de seguimiento'
						: 'indicadores de seguimiento'
			},
			{
				n: evaluationMoments.length,
				l: evaluationMoments.length === 1 ? 'momento de evaluación' : 'momentos de evaluación'
			}
		].filter((s) => s.n > 0)
	);

	const MOMENT_ICON: Record<string, typeof Calendar> = {
		anual: Calendar,
		bienal: CalendarRange,
		intermedia: CalendarClock,
		final: CalendarCheck2
	};
	const MOMENT_COLOR: Record<string, string> = {
		anual: 'brand-700',
		bienal: 'accent-600',
		intermedia: 'warning-700',
		final: 'ink-700'
	};
	const MOMENT_SOFT: Record<string, string> = {
		anual: 'brand-50',
		bienal: 'accent-50',
		intermedia: 'warning-50',
		final: 'ink-50'
	};

	const CONDITION_ICON: Record<string, typeof TrendingUp> = {
		ampliar: TrendingUp,
		modificar: RefreshCcw,
		suspender: AlertTriangle
	};
	const CONDITION_COLOR: Record<string, string> = {
		ampliar: 'brand-700',
		modificar: 'warning-700',
		suspender: 'accent-600'
	};
	const CONDITION_SOFT: Record<string, string> = {
		ampliar: 'brand-50',
		modificar: 'warning-50',
		suspender: 'accent-50'
	};
</script>

{#if heroStats.length > 0}
	<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
		{#each heroStats as stat (stat.l)}
			<div class="rounded-2xl bg-brand-50 p-4 text-center">
				<div class="text-3xl font-bold text-brand-700 tabular-nums">{stat.n}</div>
				<div class="mt-1 text-xs text-ink-500">{stat.l}</div>
			</div>
		{/each}
	</div>
{/if}

<!-- ---------- MAPA DE RIESGOS ---------- -->
{#if risks.length > 0}
	<section class="mt-8">
		<h3 class="font-display text-base font-semibold text-ink-900">Mapa de riesgos</h3>
		<p class="mt-1 mb-4 text-sm text-ink-500">
			Cada riesgo documenta en qué consiste, qué señales lo anticipan, cómo se reduce y qué se
			decide si llega a ocurrir.
		</p>
		<RiskMap {risks} />
	</section>
{/if}

<!-- ---------- INDICADORES ---------- -->
{#if indicatorGroups.length > 0}
	<section class="mt-8">
		<h3 class="font-display text-base font-semibold text-ink-900">
			Indicadores para medir resultados
		</h3>
		<p class="mt-1 mb-4 text-sm text-ink-500">
			{topic.successIndicators.length} indicadores en {indicatorGroups.length} categorías. Cada indicador
			deberá mostrar definición, valor inicial, fecha, fuente y objetivo cuando exista línea de base.
		</p>
		<IndicatorExplorer groups={indicatorGroups} />
	</section>
{/if}

<!-- ---------- CUÁNDO SE REVISA ---------- -->
{#if evaluationMoments.length > 0}
	<section class="mt-8">
		<h3 class="font-display text-base font-semibold text-ink-900">Cuándo se revisa</h3>
		<p class="mt-1 mb-4 text-sm text-ink-500">
			{evaluationMoments.length} ritmos de control, del más frecuente al que cierra el plan.
		</p>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each evaluationMoments as moment (moment.id)}
				{@const Icon = MOMENT_ICON[moment.key] ?? Calendar}
				<div class="rounded-2xl border border-ink-100 p-4">
					<div
						class="mb-3 flex size-9 items-center justify-center rounded-full"
						style={`background-color: var(--color-${MOMENT_SOFT[moment.key] ?? 'ink-50'})`}
					>
						<Icon
							class="size-4"
							style={`color: var(--color-${MOMENT_COLOR[moment.key] ?? 'ink-700'})`}
						/>
					</div>
					<div
						class="mb-1 text-[10px] font-bold tracking-wide uppercase"
						style={`color: var(--color-${MOMENT_COLOR[moment.key] ?? 'ink-700'})`}
					>
						{moment.frequencyLabel}
					</div>
					<div class="mb-2 text-sm font-bold text-ink-900">{moment.title}</div>
					<p class="text-xs text-ink-500">{moment.description}</p>
				</div>
			{/each}
		</div>
	</section>
{/if}

<!-- ---------- QUÉ PUEDE PASAR CON UNA MEDIDA ---------- -->
{#if measureChangeConditions.length > 0}
	<section class="mt-8">
		<h3 class="font-display text-base font-semibold text-ink-900">
			Qué puede pasar con una medida
		</h3>
		<p class="mt-1 mb-4 text-sm text-ink-500">
			Ninguna medida es indefinida: cada evaluación puede ampliarla, modificarla o suspenderla.
		</p>
		<div class="grid gap-4 sm:grid-cols-3">
			{#each measureChangeConditions as condition (condition.id)}
				{@const Icon = CONDITION_ICON[condition.key] ?? AlertTriangle}
				<div
					class="rounded-2xl p-5"
					style={`background-color: var(--color-${CONDITION_SOFT[condition.key] ?? 'ink-50'})`}
				>
					<div class="mb-3 flex size-9 items-center justify-center rounded-full bg-white">
						<Icon
							class="size-4"
							style={`color: var(--color-${CONDITION_COLOR[condition.key] ?? 'ink-700'})`}
						/>
					</div>
					<div
						class="mb-3 text-sm font-bold"
						style={`color: var(--color-${CONDITION_COLOR[condition.key] ?? 'ink-700'})`}
					>
						{condition.title}
					</div>
					<ul class="flex flex-col gap-1.5">
						{#each condition.items as item (item)}
							<li class="flex items-start gap-1.5 text-xs text-ink-700">
								<span
									class="mt-1.5 size-1 shrink-0 rounded-full"
									style={`background-color: var(--color-${CONDITION_COLOR[condition.key] ?? 'ink-700'})`}
								></span>
								{item}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>
{/if}

{#if topic.evaluationRules}
	<div class="mt-6 border-t border-ink-100 pt-4">
		{#if evaluationNarrativeOpen}
			<p class="text-sm leading-relaxed whitespace-pre-line text-ink-700">
				{topic.evaluationRules}
			</p>
		{/if}
		<button
			type="button"
			onclick={() => (evaluationNarrativeOpen = !evaluationNarrativeOpen)}
			class="mt-1.5 text-sm font-semibold text-brand-700 hover:underline"
		>
			{evaluationNarrativeOpen ? 'Mostrar menos' : 'Ver reglas de evaluación completas en texto'}
		</button>
	</div>
{/if}

{#if topic.governanceNarrative}
	<div class="mt-2 rounded-xl border border-ink-100">
		<button
			type="button"
			onclick={() => (governanceOpen = !governanceOpen)}
			aria-expanded={governanceOpen}
			class="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-semibold text-ink-900"
		>
			Gobernanza: quién puede hacer qué
			{#if governanceOpen}<ChevronUp class="size-4 text-ink-400" />{:else}<ChevronDown
					class="size-4 text-ink-400"
				/>{/if}
		</button>
		{#if governanceOpen}
			<div class="border-t border-ink-100 p-3">
				<p class="text-sm leading-relaxed whitespace-pre-line text-ink-700">
					{topic.governanceNarrative}
				</p>
			</div>
		{/if}
	</div>
{/if}

{#if !risks.length && !indicatorGroups.length && !evaluationMoments.length && !measureChangeConditions.length && !topic.evaluationRules && !topic.governanceNarrative}
	<p class="mt-3 text-sm text-ink-500">Pendiente de incorporar.</p>
{/if}
