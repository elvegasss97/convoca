<script lang="ts">
	import { Coins, ArrowRight, RotateCcw } from '@lucide/svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { Topic, TopicMeasure, TopicMeasureAxis, TopicTimelinePhase } from '$lib/types';
	import { measureStateLabels, type PlanMapAxis, type PlanMapData } from '$lib/data/planMapData';

	interface Props {
		topic: Topic;
		measures: TopicMeasure[];
		axes: TopicMeasureAxis[];
		timelinePhases: TopicTimelinePhase[];
		measureNumberById: Map<string, number>;
		mapData: PlanMapData;
		onOpenMeasure: (measureId: string) => void;
	}

	let { topic, measures, axes, timelinePhases, measureNumberById, mapData, onOpenMeasure }: Props =
		$props();

	type SelectionKind = 'cause' | 'axis' | 'measure' | 'phase' | 'result';
	interface Selection {
		kind: SelectionKind;
		id: string;
	}

	let selection = $state<Selection | null>(null);
	let showInvestment = $state(false);

	function select(kind: SelectionKind, id: string) {
		if (selection?.kind === kind && selection.id === id) {
			selection = null;
			return;
		}
		selection = { kind, id };
	}

	function resetSelection() {
		selection = null;
	}

	function findAxis(id: string): PlanMapAxis | undefined {
		return mapData.axes.find((a) => a.id === id);
	}

	function axisLabel(axis: PlanMapAxis): string {
		return axis.label ?? axes.find((a) => a.id === axis.id)?.title ?? axis.id;
	}

	function measuresForAxis(axis: PlanMapAxis): string[] {
		if (axis.measureIds) return axis.measureIds;
		return measures.filter((m) => m.axisId === axis.id).map((m) => m.id);
	}

	function measuresForCause(cause: PlanMapData['causes'][number]): string[] {
		const ids = new SvelteSet<string>();
		for (const axisId of cause.axisIds) {
			const axis = findAxis(axisId);
			if (axis) for (const mid of measuresForAxis(axis)) ids.add(mid);
		}
		return [...ids];
	}

	function causesForAxis(axisId: string): PlanMapData['causes'] {
		return mapData.causes.filter((c) => c.axisIds.includes(axisId));
	}

	function axesForMeasure(measureId: string): PlanMapAxis[] {
		return mapData.axes.filter((axis) => measuresForAxis(axis).includes(measureId));
	}

	function causesForMeasure(measureId: string): PlanMapData['causes'] {
		const axisIds = new Set(axesForMeasure(measureId).map((a) => a.id));
		return mapData.causes.filter((c) => c.axisIds.some((id) => axisIds.has(id)));
	}

	function measuresForPhase(phaseIndex: number): string[] {
		return [
			...new Set(
				mapData.phaseStates.filter((ps) => ps.phaseIndex === phaseIndex).map((ps) => ps.measureId)
			)
		];
	}

	function stateAt(measureId: string, phaseIndex: number) {
		return mapData.phaseStates.find(
			(ps) => ps.measureId === measureId && ps.phaseIndex === phaseIndex
		)?.state;
	}

	function statesForMeasure(measureId: string) {
		return mapData.phaseStates
			.filter((ps) => ps.measureId === measureId)
			.sort((a, b) => a.phaseIndex - b.phaseIndex);
	}

	// Conjunto de medidas relacionadas con la selección actual. `null` = sin
	// selección, nada se atenúa.
	const relatedMeasureIds = $derived.by<Set<string> | null>(() => {
		const sel = selection;
		if (!sel) return null;
		if (sel.kind === 'measure') return new SvelteSet([sel.id]);
		if (sel.kind === 'cause') {
			const cause = mapData.causes.find((c) => c.id === sel.id);
			return new SvelteSet(cause ? measuresForCause(cause) : []);
		}
		if (sel.kind === 'axis') {
			const axis = findAxis(sel.id);
			return new SvelteSet(axis ? measuresForAxis(axis) : []);
		}
		if (sel.kind === 'result') {
			const result = mapData.results.find((r) => r.id === sel.id);
			return new SvelteSet(result?.measureIds ?? []);
		}
		if (sel.kind === 'phase') {
			return new SvelteSet(measuresForPhase(Number(sel.id)));
		}
		return null;
	});

	const relatedAxisIds = $derived.by<Set<string> | null>(() => {
		const sel = selection;
		if (!sel) return null;
		if (sel.kind === 'cause') {
			const cause = mapData.causes.find((c) => c.id === sel.id);
			return new SvelteSet(cause?.axisIds ?? []);
		}
		if (sel.kind === 'axis') return new SvelteSet([sel.id]);
		if (!relatedMeasureIds) return null;
		const s = new SvelteSet<string>();
		for (const axis of mapData.axes) {
			if (measuresForAxis(axis).some((id) => relatedMeasureIds.has(id))) s.add(axis.id);
		}
		return s;
	});

	const relatedCauseIds = $derived.by<Set<string> | null>(() => {
		const sel = selection;
		if (!sel) return null;
		if (sel.kind === 'cause') return new SvelteSet([sel.id]);
		if (!relatedAxisIds) return null;
		const s = new SvelteSet<string>();
		for (const cause of mapData.causes) {
			if (cause.axisIds.some((id) => relatedAxisIds.has(id))) s.add(cause.id);
		}
		return s;
	});

	const relatedPhaseIndices = $derived.by<Set<number> | null>(() => {
		if (!relatedMeasureIds) return null;
		const s = new SvelteSet<number>();
		for (let i = 0; i < timelinePhases.length; i++) {
			if (measuresForPhase(i).some((id) => relatedMeasureIds!.has(id))) s.add(i);
		}
		return s;
	});

	const relatedResultIds = $derived.by<Set<string> | null>(() => {
		if (!relatedMeasureIds) return null;
		const s = new SvelteSet<string>();
		for (const result of mapData.results) {
			if (result.measureIds.some((id) => relatedMeasureIds!.has(id))) s.add(result.id);
		}
		return s;
	});

	const orderedMeasures = $derived(
		[...measures].sort(
			(a, b) => (measureNumberById.get(a.id) ?? 0) - (measureNumberById.get(b.id) ?? 0)
		)
	);

	// Extrae un rango de años corto de un título de fase ("Fase 2 — 2029 a
	// 2031: ampliar" -> "2029–31"); si no hay años (p. ej. "Primeros 100
	// días"), usa una forma abreviada del propio título.
	function phaseShortLabel(title: string): string {
		const years = title.match(/\d{4}/g);
		if (years && years.length >= 2) {
			return `${years[0]}–${years[1].slice(2)}`;
		}
		if (years && years.length === 1) return years[0];
		if (/100\s*d[ií]as/i.test(title)) return '100 días';
		return title.length > 16 ? `${title.slice(0, 14)}…` : title;
	}

	function selectedCause() {
		return selection?.kind === 'cause'
			? mapData.causes.find((c) => c.id === selection!.id)
			: undefined;
	}
	function selectedAxis() {
		return selection?.kind === 'axis' ? findAxis(selection.id) : undefined;
	}
	function selectedMeasure() {
		return selection?.kind === 'measure' ? measures.find((m) => m.id === selection!.id) : undefined;
	}
	function selectedPhase() {
		return selection?.kind === 'phase' ? timelinePhases[Number(selection.id)] : undefined;
	}
	function selectedResult() {
		return selection?.kind === 'result'
			? mapData.results.find((r) => r.id === selection!.id)
			: undefined;
	}

	function measureTitle(id: string): string {
		return measures.find((m) => m.id === id)?.title ?? '';
	}

	// Rango de inversión aproximado (para la barra segmentada): toma el
	// primer número de estimatedCost como referencia de tamaño relativo,
	// nunca como cifra nueva mostrada al usuario.
	function investmentWeight(measure: TopicMeasure): number {
		const match = measure.estimatedCost?.match(/[\d.]+/);
		if (!match) return 0;
		return Number(match[0].replace(/\./g, ''));
	}
	const totalInvestmentWeight = $derived(
		orderedMeasures.reduce((sum, m) => sum + investmentWeight(m), 0)
	);

	const AXIS_COLORS = [
		'border-brand-300 bg-brand-50 text-brand-800 data-[active=true]:bg-brand-600 data-[active=true]:text-white data-[active=true]:border-brand-600',
		'border-accent-300 bg-accent-50 text-accent-800 data-[active=true]:bg-accent-600 data-[active=true]:text-white data-[active=true]:border-accent-600',
		'border-warning-300 bg-warning-50 text-warning-700 data-[active=true]:bg-warning-700 data-[active=true]:text-white data-[active=true]:border-warning-700',
		'border-ink-300 bg-ink-50 text-ink-700 data-[active=true]:bg-ink-700 data-[active=true]:text-white data-[active=true]:border-ink-700'
	];
</script>

<section
	aria-label={`Mapa interactivo de ${topic.documentTitle || topic.title}`}
	class="overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-b from-brand-50/60 to-white p-4 sm:p-6"
>
	<!-- Problema -->
	<div class="rounded-2xl bg-white/70 p-3.5 sm:p-4">
		<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">El problema</p>
		<p class="mt-1 text-sm leading-relaxed font-medium text-ink-900 sm:text-base">
			{mapData.problemHeadline}
		</p>
	</div>

	<div class="mx-auto my-2 h-5 w-px bg-ink-200" aria-hidden="true"></div>

	<!-- Causas -->
	<div>
		<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">Causas</p>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each mapData.causes as cause (cause.id)}
				<button
					type="button"
					aria-pressed={selection?.kind === 'cause' && selection.id === cause.id}
					onclick={() => select('cause', cause.id)}
					class={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-opacity sm:text-sm ${
						selection?.kind === 'cause' && selection.id === cause.id
							? 'border-ink-700 bg-ink-800 text-white'
							: 'border-ink-200 bg-ink-50 text-ink-700'
					} ${relatedCauseIds && !relatedCauseIds.has(cause.id) ? 'opacity-35' : ''}`}
				>
					{cause.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="mx-auto my-2 h-5 w-px bg-ink-200" aria-hidden="true"></div>

	<!-- Ejes de respuesta -->
	<div>
		<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">Ejes de respuesta</p>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each mapData.axes as axis, i (axis.id)}
				<button
					type="button"
					aria-pressed={selection?.kind === 'axis' && selection.id === axis.id}
					data-active={selection?.kind === 'axis' && selection.id === axis.id}
					onclick={() => select('axis', axis.id)}
					class={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-opacity sm:text-sm ${AXIS_COLORS[i % AXIS_COLORS.length]} ${
						relatedAxisIds && !relatedAxisIds.has(axis.id) ? 'opacity-35' : ''
					}`}
				>
					{axisLabel(axis)}
				</button>
			{/each}
		</div>
	</div>

	<div class="mx-auto my-2 h-5 w-px bg-ink-200" aria-hidden="true"></div>

	<!-- Medidas -->
	<div>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">
				Las {orderedMeasures.length} medidas
			</p>
			{#if topic.investmentRange}
				<button
					type="button"
					onclick={() => (showInvestment = !showInvestment)}
					aria-expanded={showInvestment}
					class="flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
				>
					<Coins class="size-3.5" /> Reparto de la inversión
				</button>
			{/if}
		</div>

		{#if showInvestment && topic.investmentRange}
			<div class="mt-2 rounded-xl border border-ink-100 bg-white p-3">
				<p class="text-xs text-ink-600">
					Inversión global: <strong class="text-ink-900">{topic.investmentRange}</strong>
					{#if topic.investmentGdpPercent}· {topic.investmentGdpPercent}{/if}
				</p>
				<div class="mt-2 flex h-4 w-full overflow-hidden rounded-full bg-ink-100">
					{#each orderedMeasures as measure (measure.id)}
						{@const weight = investmentWeight(measure)}
						{@const pct = totalInvestmentWeight > 0 ? (weight / totalInvestmentWeight) * 100 : 0}
						{#if pct > 0}
							<button
								type="button"
								title={`${measure.title} — ${measure.estimatedCost ?? ''}`}
								aria-label={`${measure.title}: ${measure.estimatedCost ?? 'inversión no disponible'}`}
								onclick={() => select('measure', measure.id)}
								style={`width:${pct}%`}
								class={`h-full border-r border-white/60 transition-opacity last:border-r-0 ${
									relatedMeasureIds && !relatedMeasureIds.has(measure.id) ? 'opacity-30' : ''
								} ${(measureNumberById.get(measure.id) ?? 0) % 2 === 0 ? 'bg-brand-400' : 'bg-brand-600'}`}
							></button>
						{/if}
					{/each}
				</div>
				<p class="mt-1.5 text-xs text-ink-400">
					Ancho proporcional a la inversión estimada de cada medida. Pulsa un tramo para ver el
					detalle.
				</p>
			</div>
		{/if}

		<div class="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
			{#each orderedMeasures as measure (measure.id)}
				<button
					type="button"
					aria-pressed={selection?.kind === 'measure' && selection.id === measure.id}
					onclick={() => select('measure', measure.id)}
					class={`flex items-start gap-1.5 rounded-xl border p-2 text-left transition-opacity sm:p-2.5 ${
						selection?.kind === 'measure' && selection.id === measure.id
							? 'border-brand-500 bg-brand-50'
							: 'border-ink-100 bg-white'
					} ${relatedMeasureIds && !relatedMeasureIds.has(measure.id) ? 'opacity-35' : ''}`}
				>
					<span
						class="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800"
						>{measureNumberById.get(measure.id)}</span
					>
					<span
						class="line-clamp-2 text-xs leading-tight font-medium text-ink-800"
						title={measure.title}>{measure.title}</span
					>
				</button>
			{/each}
		</div>
	</div>

	<div class="mx-auto my-2 h-5 w-px bg-ink-200" aria-hidden="true"></div>

	<!-- Calendario -->
	<div>
		<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">Calendario</p>
		<div class="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
			{#each timelinePhases as phase, i (phase.id)}
				<button
					type="button"
					aria-pressed={selection?.kind === 'phase' && selection.id === String(i)}
					onclick={() => select('phase', String(i))}
					class={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-opacity ${
						selection?.kind === 'phase' && selection.id === String(i)
							? 'border-warning-500 bg-warning-50 text-warning-700'
							: 'border-ink-100 bg-white text-ink-700'
					} ${relatedPhaseIndices && !relatedPhaseIndices.has(i) ? 'opacity-35' : ''}`}
				>
					{phaseShortLabel(phase.title)}
				</button>
			{/each}
		</div>
	</div>

	<div class="mx-auto my-2 h-5 w-px bg-ink-200" aria-hidden="true"></div>

	<!-- Resultados -->
	<div>
		<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">Resultados</p>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each mapData.results as result (result.id)}
				<button
					type="button"
					aria-pressed={selection?.kind === 'result' && selection.id === result.id}
					onclick={() => select('result', result.id)}
					class={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-opacity sm:text-sm ${
						selection?.kind === 'result' && selection.id === result.id
							? 'border-brand-500 bg-brand-600 text-white'
							: 'border-brand-200 bg-white text-brand-800'
					} ${relatedResultIds && !relatedResultIds.has(result.id) ? 'opacity-35' : ''}`}
				>
					{result.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Panel contextual -->
	<div
		aria-live="polite"
		class="mt-4 min-h-[88px] rounded-2xl border border-brand-100 bg-white p-3.5 sm:p-4"
	>
		{#if !selection}
			<p class="text-sm text-ink-500">
				Selecciona una causa, un eje, una medida, una etapa o un resultado para descubrir sus
				conexiones.
			</p>
		{:else if selectedCause()}
			{@const cause = selectedCause()!}
			<div class="flex items-start justify-between gap-2">
				<p class="text-sm font-semibold text-ink-900">{cause.label}</p>
				<button
					type="button"
					onclick={resetSelection}
					class="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-700"
				>
					<RotateCcw class="size-3" /> Ver mapa completo
				</button>
			</div>
			<p class="mt-1 text-sm leading-relaxed text-ink-700">{cause.description}</p>
			<p class="mt-2 text-xs font-semibold text-ink-500">Ejes de respuesta relacionados</p>
			<div class="mt-1 flex flex-wrap gap-1.5">
				{#each cause.axisIds as axisId (axisId)}
					{@const axis = findAxis(axisId)}
					{#if axis}
						<button
							type="button"
							onclick={() => select('axis', axisId)}
							class="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-brand-300 hover:bg-brand-50"
						>
							{axisLabel(axis)}
						</button>
					{/if}
				{/each}
			</div>
			<p class="mt-2 text-xs font-semibold text-ink-500">Medidas que actúan sobre esta causa</p>
			<ul class="mt-1 flex flex-col gap-1">
				{#each measuresForCause(cause) as mid (mid)}
					<li>
						<button
							type="button"
							onclick={() => select('measure', mid)}
							class="text-left text-sm text-brand-700 hover:underline"
						>
							{measureNumberById.get(mid)}. {measureTitle(mid)}
						</button>
					</li>
				{/each}
			</ul>
		{:else if selectedAxis()}
			{@const axis = selectedAxis()!}
			<div class="flex items-start justify-between gap-2">
				<p class="text-sm font-semibold text-ink-900">{axisLabel(axis)}</p>
				<button
					type="button"
					onclick={resetSelection}
					class="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-700"
				>
					<RotateCcw class="size-3" /> Ver mapa completo
				</button>
			</div>
			<p class="mt-1 text-sm leading-relaxed text-ink-700">{axis.description}</p>
			{#if causesForAxis(axis.id).length > 0}
				<p class="mt-2 text-xs font-semibold text-ink-500">Responde a estas causas</p>
				<div class="mt-1 flex flex-wrap gap-1.5">
					{#each causesForAxis(axis.id) as cause (cause.id)}
						<button
							type="button"
							onclick={() => select('cause', cause.id)}
							class="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-brand-300 hover:bg-brand-50"
						>
							{cause.label}
						</button>
					{/each}
				</div>
			{/if}
			<p class="mt-2 text-xs font-semibold text-ink-500">Medidas de este eje</p>
			<ul class="mt-1 flex flex-col gap-1">
				{#each measuresForAxis(axis) as mid (mid)}
					<li>
						<button
							type="button"
							onclick={() => select('measure', mid)}
							class="text-left text-sm text-brand-700 hover:underline"
						>
							{measureNumberById.get(mid)}. {measureTitle(mid)}
						</button>
					</li>
				{/each}
			</ul>
		{:else if selectedMeasure()}
			{@const measure = selectedMeasure()!}
			<div class="flex items-start justify-between gap-2">
				<p class="text-sm font-semibold text-ink-900">{measure.title}</p>
				<button
					type="button"
					onclick={resetSelection}
					class="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-700"
				>
					<RotateCcw class="size-3" /> Ver mapa completo
				</button>
			</div>
			{#if measure.problemAddressed}
				<p class="mt-1.5 text-xs text-ink-500">
					<strong class="font-semibold text-ink-700">Problema que resuelve:</strong>
					{measure.problemAddressed}
				</p>
			{/if}
			{#if causesForMeasure(measure.id).length > 0}
				<p class="mt-2 text-xs text-ink-500">
					<strong class="font-semibold text-ink-700">Causa:</strong>
					{causesForMeasure(measure.id)
						.map((c) => c.label)
						.join(' · ')}
				</p>
			{/if}
			{#if axesForMeasure(measure.id).length > 0}
				<p class="mt-1 text-xs text-ink-500">
					<strong class="font-semibold text-ink-700">Eje:</strong>
					{axesForMeasure(measure.id)
						.map((a) => axisLabel(a))
						.join(' · ')}
				</p>
			{/if}
			<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
				{#if measure.estimatedCost}<span
						><strong class="text-ink-800">Inversión:</strong> {measure.estimatedCost}</span
					>{/if}
				{#if measure.timeframe}<span
						><strong class="text-ink-800">Plazo:</strong>
						{measure.timeframe.replace('Plazo: ', '')}</span
					>{/if}
			</div>
			{#if statesForMeasure(measure.id).length > 0}
				<p class="mt-2 text-xs font-semibold text-ink-500">Recorrido temporal</p>
				<div class="mt-1 flex flex-wrap gap-1.5">
					{#each statesForMeasure(measure.id) as ps (ps.phaseIndex)}
						<button
							type="button"
							onclick={() => select('phase', String(ps.phaseIndex))}
							class="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-brand-300 hover:bg-brand-50"
						>
							{phaseShortLabel(timelinePhases[ps.phaseIndex]?.title ?? '')}: {measureStateLabels[
								ps.state
							]}
						</button>
					{/each}
				</div>
			{/if}
			<button
				type="button"
				onclick={() => onOpenMeasure(measure.id)}
				class="mt-3 flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
			>
				Ver medida completa <ArrowRight class="size-3.5" />
			</button>
		{:else if selectedPhase()}
			{@const phase = selectedPhase()!}
			{@const phaseIndex = Number(selection.id)}
			<div class="flex items-start justify-between gap-2">
				<p class="text-sm font-semibold text-ink-900">{phase.title}</p>
				<button
					type="button"
					onclick={resetSelection}
					class="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-700"
				>
					<RotateCcw class="size-3" /> Ver mapa completo
				</button>
			</div>
			{#if phase.description}
				<p class="mt-1 text-sm leading-relaxed text-ink-700">{phase.description}</p>
			{/if}
			<p class="mt-2 text-xs font-semibold text-ink-500">Medidas en esta etapa, por estado</p>
			<ul class="mt-1 flex flex-col gap-1">
				{#each measuresForPhase(phaseIndex) as mid (mid)}
					{@const state = stateAt(mid, phaseIndex)}
					<li class="flex items-center justify-between gap-2">
						<button
							type="button"
							onclick={() => select('measure', mid)}
							class="text-left text-sm text-brand-700 hover:underline"
						>
							{measureNumberById.get(mid)}. {measureTitle(mid)}
						</button>
						{#if state}
							<span
								class="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600"
								>{measureStateLabels[state]}</span
							>
						{/if}
					</li>
				{/each}
			</ul>
			{#if measuresForPhase(phaseIndex).length === 0}
				<p class="mt-1 text-xs text-ink-400">
					Ninguna medida tiene una actuación específica documentada en esta etapa.
				</p>
			{/if}
		{:else if selectedResult()}
			{@const result = selectedResult()!}
			<div class="flex items-start justify-between gap-2">
				<p class="text-sm font-semibold text-ink-900">{result.label}</p>
				<button
					type="button"
					onclick={resetSelection}
					class="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-700"
				>
					<RotateCcw class="size-3" /> Ver mapa completo
				</button>
			</div>
			<p class="mt-1 text-sm leading-relaxed text-ink-700">{result.description}</p>
			{#if result.indicatorCategory}
				<p class="mt-1.5 text-xs text-ink-500">
					Se evalúa mediante los indicadores de <strong class="text-ink-700"
						>{result.indicatorCategory}</strong
					>, más abajo en "Indicadores para medir los resultados".
				</p>
			{/if}
			<p class="mt-2 text-xs font-semibold text-ink-500">Medidas que contribuyen</p>
			<ul class="mt-1 flex flex-col gap-1">
				{#each result.measureIds as mid (mid)}
					<li>
						<button
							type="button"
							onclick={() => select('measure', mid)}
							class="text-left text-sm text-brand-700 hover:underline"
						>
							{measureNumberById.get(mid)}. {measureTitle(mid)}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="mt-3 flex justify-center">
		<a
			href="#medidas"
			class="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
		>
			Explorar las medidas completas <ArrowRight class="size-3.5" />
		</a>
	</div>
</section>
