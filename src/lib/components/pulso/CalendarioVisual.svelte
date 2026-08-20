<script lang="ts">
	import { ChevronDown, ChevronUp } from '@lucide/svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type {
		MeasureState,
		TopicMeasure,
		TopicMeasureAxis,
		TopicMeasurePhaseStatus,
		TopicTimelinePhase
	} from '$lib/types';
	import { measureStateLabels } from '$lib/data/planMapData';
	import MeasurePhaseGantt from './MeasurePhaseGantt.svelte';
	import PhaseStatusDistribution from './PhaseStatusDistribution.svelte';

	interface Props {
		measures: TopicMeasure[];
		axes: TopicMeasureAxis[];
		phases: TopicTimelinePhase[];
		phaseStatuses: TopicMeasurePhaseStatus[];
	}

	let { measures, axes, phases, phaseStatuses }: Props = $props();

	const hasGantt = $derived(phaseStatuses.length > 0);

	let activePhaseId = $state<string | null>(phases[0]?.id ?? null);
	let openDeliverables = $state(false);

	$effect(() => {
		if (!phases.some((p) => p.id === activePhaseId)) {
			activePhaseId = phases[0]?.id ?? null;
		}
	});

	// Etiquetas cortas para columnas/stepper, derivadas del título real de la
	// fase (nunca inventadas): "Primeros 100 días" → "100 días"; para el
	// resto se extraen los años ya presentes en el título ("Fase 1 — 2027 y
	// 2028: crear la base" → "2027–28"). Si un título no encaja en ninguno
	// de los dos patrones, se usa tal cual.
	function phaseShortLabel(phase: TopicTimelinePhase): string {
		if (/100\s*d[ií]as/i.test(phase.title)) return '100 días';

		const dayRange = phase.title.match(/\bd[ií]as\s+(\d+)\s+a\s+(\d+)\b/i);
		if (dayRange) return `${dayRange[1]}–${dayRange[2]} días`;

		const monthRange = phase.title.match(/\bmeses\s+(\d+)\s+a\s+(\d+)\b/i);
		if (monthRange) return `${monthRange[1]}–${monthRange[2]} meses`;

		const firstHours = phase.title.match(/\bprimer(?:as|os)\s+(\d+)\s+horas\b/i);
		if (firstHours) return `${firstHours[1]} h`;

		const firstDays = phase.title.match(/\bprimer(?:as|os)\s+(\d+)\s+d[ií]as\b/i);
		if (firstDays) return `${firstDays[1]} días`;

		const years = [...phase.title.matchAll(/\b(20\d{2})\b/g)].map((m) => m[1]);
		if (years.length >= 2) {
			const first = years[0];
			const last = years[years.length - 1];
			return `${first}–${last.slice(-2)}`;
		}
		if (years.length === 1) return years[0];
		return phase.title;
	}

	// Etiquetas de tono por fase, tal como se aprobaron en el diseño de
	// referencia (design/vivienda-calendario-referencia.jsx) — presentacionales,
	// no un dato guardado en Supabase. Solo se muestran cuando el número de
	// fases coincide con el diseño aprobado (las 5 de Vivienda); si un tema
	// tiene otro número de fases, no se inventa una etiqueta.
	const PHASE_TAGS = [
		'Arranque, no ejecución',
		'Preparación',
		'Despliegue',
		'Consolidación',
		'Evaluación'
	];
	function phaseTag(index: number): string | undefined {
		return phases.length === PHASE_TAGS.length ? PHASE_TAGS[index] : undefined;
	}

	// Mismo patrón de color por eje ya usado en CosteEconomico: familia de
	// color por eje, tono base para la primera medida del eje, tono claro
	// para la segunda.
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

	const statusByMeasureId = $derived.by(() => {
		const map = new SvelteMap<string, Map<string, MeasureState>>();
		for (const s of phaseStatuses) {
			if (!map.has(s.measureId)) map.set(s.measureId, new Map());
			map.get(s.measureId)!.set(s.phaseId, s.status);
		}
		return map;
	});

	const ganttRows = $derived(
		measures.map((measure) => ({
			measure,
			colorToken: measureColorToken(measure),
			axisLabel: axes.find((a) => a.id === measure.axisId)?.title,
			statusByPhaseId: statusByMeasureId.get(measure.id) ?? new Map<string, MeasureState>()
		}))
	);

	const countsByPhaseId = $derived.by(() => {
		const map = new SvelteMap<string, Partial<Record<MeasureState, number>>>();
		for (const phase of phases) map.set(phase.id, {});
		for (const s of phaseStatuses) {
			const counts = map.get(s.phaseId);
			if (!counts) continue;
			counts[s.status] = (counts[s.status] ?? 0) + 1;
		}
		return map;
	});

	const activePhase = $derived(phases.find((p) => p.id === activePhaseId) ?? null);
	const activeMeasures = $derived(
		activePhaseId
			? measures
					.map((m) => ({ measure: m, status: statusByMeasureId.get(m.id)?.get(activePhaseId!) }))
					.filter((x): x is { measure: TopicMeasure; status: MeasureState } => !!x.status)
			: []
	);
</script>

{#if hasGantt}
	<!-- ---------- CRONOLOGÍA (stepper horizontal) ---------- -->
	<section>
		<div class="relative">
			<div class="absolute top-5 right-0 left-0 h-0.5 bg-ink-100" aria-hidden="true"></div>
			<div
				class="relative grid gap-1 sm:gap-2"
				style="grid-template-columns: repeat({phases.length}, minmax(0, 1fr));"
			>
				{#each phases as phase, i (phase.id)}
					{@const active = activePhaseId === phase.id}
					<button
						type="button"
						onclick={() => (activePhaseId = phase.id)}
						aria-current={active ? 'step' : undefined}
						class="flex min-w-0 flex-col items-center gap-2 focus-visible:outline-none"
					>
						<span
							class={`z-10 flex size-10 items-center justify-center rounded-full border-4 text-sm font-bold transition-transform duration-200 ${active ? 'scale-110' : ''}`}
							style={active
								? 'background-color: var(--color-brand-700); border-color: var(--color-brand-700); color: #fff;'
								: 'background-color: #fff; border-color: var(--color-ink-200); color: var(--color-ink-500);'}
						>
							{i + 1}
						</span>
						<span
							class="min-w-0 text-center text-[10px] leading-tight font-bold break-words sm:text-xs"
							style={`color:${active ? 'var(--color-brand-700)' : 'var(--color-ink-700)'}`}
						>
							{phaseShortLabel(phase)}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- ---------- PANEL DE FASE ACTIVA ---------- -->
	{#if activePhase}
		<section class="mt-6">
			<div
				class="rounded-3xl border border-ink-100 p-5 sm:p-7"
				style="background: linear-gradient(135deg, var(--color-brand-50) 0%, #ffffff 70%);"
			>
				<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
					<div>
						{#if phaseTag(phases.indexOf(activePhase))}
							<div class="mb-1 text-xs font-bold tracking-wide text-brand-700 uppercase">
								{phaseTag(phases.indexOf(activePhase))}
							</div>
						{/if}
						<h3 class="font-display text-xl font-bold text-ink-900 sm:text-2xl">
							{activePhase.title}
						</h3>
					</div>
					{#if activeMeasures.length > 0}
						{@const counts = countsByPhaseId.get(activePhase.id) ?? {}}
						<div class="flex flex-wrap gap-1.5">
							{#each Object.entries(counts) as [status, count] (status)}
								{#if count}
									<span
										class="rounded-full px-2.5 py-1 text-xs font-semibold"
										style={`background-color: var(--color-${
											{
												preparacion: 'ink-100',
												piloto: 'accent-100',
												despliegue: 'brand-100',
												consolidacion: 'brand-700',
												evaluacion: 'warning-100'
											}[status as MeasureState]
										}); color: ${
											status === 'consolidacion'
												? '#fff'
												: `var(--color-${
														{
															preparacion: 'ink-700',
															piloto: 'accent-700',
															despliegue: 'brand-700',
															consolidacion: 'brand-800',
															evaluacion: 'warning-700'
														}[status as MeasureState]
													})`
										}`}
									>
										{count} en {measureStateLabels[status as MeasureState].toLowerCase()}
									</span>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
				<p class="mb-6 text-sm text-ink-700">{activePhase.description}</p>

				<div class="mb-3 text-xs font-bold tracking-wide text-ink-500 uppercase">
					Medidas activas en esta etapa
				</div>
				{#if activeMeasures.length > 0}
					<div class="grid gap-2 sm:grid-cols-2">
						{#each activeMeasures as { measure, status } (measure.id)}
							{@const colorToken = measureColorToken(measure)}
							<div
								class="flex items-center gap-2.5 rounded-xl border border-ink-100 bg-white px-3 py-2.5"
							>
								<span
									class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
									style={`background-color: color-mix(in srgb, var(--color-${colorToken}) 12%, transparent); color: var(--color-${colorToken})`}
								>
									{measures.findIndex((m) => m.id === measure.id) + 1}
								</span>
								<span class="flex-1 text-sm font-medium text-ink-800">{measure.title}</span>
								<span
									class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
									style={`background-color: var(--color-${
										{
											preparacion: 'ink-100',
											piloto: 'accent-100',
											despliegue: 'brand-100',
											consolidacion: 'brand-700',
											evaluacion: 'warning-100'
										}[status]
									}); color: ${
										status === 'consolidacion'
											? '#fff'
											: `var(--color-${
													{
														preparacion: 'ink-700',
														piloto: 'accent-700',
														despliegue: 'brand-700',
														consolidacion: 'brand-800',
														evaluacion: 'warning-700'
													}[status]
												})`
									}`}
								>
									{measureStateLabels[status]}
								</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-ink-500 italic">
						Sin actuaciones específicas documentadas en esta etapa.
					</p>
				{/if}

				{#if activePhase.items.length > 0}
					<div class="mt-6 border-t border-ink-100 pt-5">
						<button
							type="button"
							onclick={() => (openDeliverables = !openDeliverables)}
							aria-expanded={openDeliverables}
							class="flex items-center gap-1.5 text-sm font-semibold text-brand-700"
						>
							{openDeliverables ? 'Ocultar' : 'Ver'} los {activePhase.items.length} entregables de esta
							etapa
							{#if openDeliverables}<ChevronUp class="size-4" />{:else}<ChevronDown
									class="size-4"
								/>{/if}
						</button>
						{#if openDeliverables}
							<ol class="mt-3 flex flex-col gap-2">
								{#each activePhase.items as item, i (item)}
									<li class="flex items-start gap-2.5 text-sm text-ink-700">
										<span
											class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700"
										>
											{i + 1}
										</span>
										{item}
									</li>
								{/each}
							</ol>
						{/if}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- ---------- GANTT ---------- -->
	<section class="mt-8">
		<h3 class="font-display text-base font-semibold text-ink-900">
			Las {measures.length} medidas, de un vistazo
		</h3>
		<p class="mt-1 mb-4 text-sm text-ink-500">
			Cada medida sigue su propio recorrido: no todas pasan por los cinco estados ni empiezan en la
			misma etapa.
		</p>
		<MeasurePhaseGantt {phases} {phaseShortLabel} rows={ganttRows} {activePhaseId} />
	</section>

	<!-- ---------- DISTRIBUCIÓN DE ESTADOS POR ETAPA ---------- -->
	<section class="mt-8">
		<h3 class="font-display text-base font-semibold text-ink-900">
			Cuántas medidas hay en cada estado
		</h3>
		<p class="mt-1 mb-4 text-sm text-ink-500">
			Preparación → Piloto → Despliegue → Consolidación → Evaluación. No todas las medidas pasan por
			todos los estados.
		</p>
		<PhaseStatusDistribution
			{phases}
			{phaseShortLabel}
			{countsByPhaseId}
			{activePhaseId}
			onSelectPhase={(id) => (activePhaseId = id)}
		/>
	</section>
{:else}
	<!-- Sin cruce medida×fase×estado todavía (p. ej. Sanidad): se mantiene el
	     listado simple de fases anterior, sin romper nada. -->
	{#if phases.length > 0}
		<ol class="relative flex flex-col gap-6">
			<div class="absolute top-2 bottom-2 left-[15px] w-px bg-ink-200" aria-hidden="true"></div>
			{#each phases as phase, i (phase.id)}
				{@const isFirst100 = /100\s*d[ií]as/i.test(phase.title)}
				<li class="relative pl-10">
					<span
						class={`absolute top-0 left-0 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isFirst100 ? 'bg-warning-100 text-warning-700' : 'bg-brand-100 text-brand-800'}`}
						>{i + 1}</span
					>
					<p class="pt-1 text-sm font-semibold text-ink-900">
						{phase.title}
						{#if isFirst100}
							<span
								class="ml-1.5 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-warning-700 uppercase"
								>Arranque, no ejecución</span
							>
						{/if}
					</p>
					{#if phase.description}
						<p class="mt-1.5 text-sm leading-relaxed text-ink-700">{phase.description}</p>
					{/if}
					{#if phase.items.length > 0}
						<ol class="mt-2.5 flex flex-col gap-1.5 border-l-2 border-ink-100 pl-3">
							{#each phase.items as item, j (item)}
								<li class="text-sm leading-relaxed text-ink-700">
									<span class="font-semibold text-ink-500">{j + 1}.</span>
									{item}
								</li>
							{/each}
						</ol>
					{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<p class="mt-3 text-sm text-ink-500">Calendario detallado pendiente de incorporar.</p>
	{/if}
{/if}
