<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import type { MeasureState, TopicMeasure, TopicTimelinePhase } from '$lib/types';
	import { measureStateLabels } from '$lib/data/planMapData';

	interface GanttMeasure {
		measure: TopicMeasure;
		colorToken: string;
		axisLabel?: string;
		statusByPhaseId: Map<string, MeasureState>;
	}

	interface Props {
		phases: TopicTimelinePhase[];
		phaseShortLabel: (phase: TopicTimelinePhase) => string;
		rows: GanttMeasure[];
		activePhaseId: string | null;
	}

	let { phases, phaseShortLabel, rows, activePhaseId }: Props = $props();

	let hoverMeasureId = $state<string | null>(null);
	let hoverPhaseId = $state<string | null>(null);
	let expandedMeasureId = $state<string | null>(null);

	let scrollEl = $state<HTMLDivElement | null>(null);
	let showScrollHint = $state(true);

	function updateScrollHint() {
		if (!scrollEl) return;
		const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
		showScrollHint = scrollWidth - clientWidth - scrollLeft > 8;
	}

	function statusBg(status: MeasureState | undefined): string {
		if (!status) return 'var(--color-ink-50)';
		return `var(--color-${
			{
				preparacion: 'ink-100',
				piloto: 'accent-100',
				despliegue: 'brand-100',
				consolidacion: 'brand-700',
				evaluacion: 'warning-100'
			}[status]
		})`;
	}

	function statusFg(status: MeasureState | undefined): string {
		if (!status) return 'var(--color-ink-400)';
		return status === 'consolidacion'
			? '#fff'
			: `var(--color-${
					{
						preparacion: 'ink-700',
						piloto: 'accent-700',
						despliegue: 'brand-700',
						consolidacion: 'brand-800',
						evaluacion: 'warning-700'
					}[status]
				})`;
	}

	// Color del punto de la leyenda: siempre un tono con contraste sobre
	// fondo blanco, a diferencia de statusFg (pensado para texto sobre el
	// propio fondo de estado, blanco en el caso de "consolidación").
	function statusDot(status: MeasureState): string {
		return `var(--color-${
			{
				preparacion: 'ink-500',
				piloto: 'accent-600',
				despliegue: 'brand-600',
				consolidacion: 'brand-800',
				evaluacion: 'warning-500'
			}[status]
		})`;
	}
</script>

<div class="flex flex-wrap gap-x-4 gap-y-1.5">
	{#each Object.entries(measureStateLabels) as [key, label] (key)}
		<span class="flex items-center gap-1.5 text-xs font-medium text-ink-700">
			<span
				class="size-2.5 rounded-sm"
				style={`background-color:${statusDot(key as MeasureState)}`}
				aria-hidden="true"
			></span>
			{label}
		</span>
	{/each}
</div>

<div class="relative mt-4">
	<div
		bind:this={scrollEl}
		onscroll={updateScrollHint}
		class="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
	>
		<div class="min-w-[640px]">
			<div
				class="grid gap-1"
				style="grid-template-columns: 200px repeat({phases.length}, 1fr);"
				aria-hidden="true"
			>
				<div></div>
				{#each phases as phase (phase.id)}
					<div
						class="pb-2 text-center text-xs font-bold"
						style={`color:${activePhaseId === phase.id ? 'var(--color-brand-700)' : 'var(--color-ink-500)'}`}
					>
						{phaseShortLabel(phase)}
					</div>
				{/each}
			</div>

			<div class="flex flex-col gap-1.5">
				{#each rows as row (row.measure.id)}
					{@const isOpen = expandedMeasureId === row.measure.id}
					{@const activePhases = phases.filter((p) => row.statusByPhaseId.has(p.id))}
					<div>
						<button
							type="button"
							onclick={() => (expandedMeasureId = isOpen ? null : row.measure.id)}
							aria-expanded={isOpen}
							class="grid w-full items-center gap-1 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none"
							style="grid-template-columns: 200px repeat({phases.length}, 1fr);"
						>
							<span class="flex items-center gap-2 py-1.5 pr-2">
								<span
									class="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
									style={`background-color: color-mix(in srgb, var(--color-${row.colorToken}) 12%, transparent); color: var(--color-${row.colorToken})`}
								>
									{rows.indexOf(row) + 1}
								</span>
								<span class="line-clamp-2 text-xs leading-tight font-semibold text-ink-800">
									{row.measure.title}
								</span>
							</span>
							{#each phases as phase (phase.id)}
								{@const status = row.statusByPhaseId.get(phase.id)}
								{@const hovered = hoverMeasureId === row.measure.id || hoverPhaseId === phase.id}
								<span
									onmouseenter={() => {
										hoverMeasureId = row.measure.id;
										hoverPhaseId = phase.id;
									}}
									onmouseleave={() => {
										hoverMeasureId = null;
										hoverPhaseId = null;
									}}
									class="flex h-8 items-center justify-center rounded-md transition-all duration-150"
									style={`background-color:${statusBg(status)}; opacity:${
										!status ? 0.5 : hoverMeasureId || hoverPhaseId ? (hovered ? 1 : 0.45) : 1
									}; border:1.5px solid ${activePhaseId === phase.id ? 'var(--color-brand-300)' : 'transparent'}`}
									title={status
										? `${row.measure.title} — ${phaseShortLabel(phase)}: ${measureStateLabels[status]}`
										: undefined}
								>
									{#if status}
										<span
											class="hidden text-[10px] font-bold sm:inline"
											style={`color:${statusFg(status)}`}
										>
											{measureStateLabels[status].slice(0, 4)}
										</span>
									{/if}
								</span>
							{/each}
						</button>
						<span class="sr-only">
							{row.measure.title}:
							{activePhases
								.map(
									(p) =>
										`${phaseShortLabel(p)}: ${measureStateLabels[row.statusByPhaseId.get(p.id)!]}`
								)
								.join('; ')}
						</span>
						{#if isOpen}
							<div
								class="mt-1 mb-2 ml-7 flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-xs text-ink-700"
							>
								{#if row.axisLabel}
									<span class="font-semibold text-ink-800">{row.axisLabel}</span>
									<ArrowRight class="size-3 text-ink-400" aria-hidden="true" />
								{/if}
								{#each activePhases as phase, i (phase.id)}
									{@const status = row.statusByPhaseId.get(phase.id)}
									<span class="flex items-center gap-1">
										<span
											class="rounded-full px-2 py-0.5 font-semibold"
											style={`background-color:${statusBg(status)}; color:${statusFg(status)}`}
										>
											{phaseShortLabel(phase)}: {measureStateLabels[status!]}
										</span>
										{#if i < activePhases.length - 1}
											<ArrowRight class="size-2.5 text-ink-400" aria-hidden="true" />
										{/if}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
	{#if showScrollHint}
		<div
			class="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden"
			aria-hidden="true"
		></div>
	{/if}
</div>
<p class="mt-1.5 text-xs text-ink-400 sm:hidden">Desliza para ver todas las fases →</p>
