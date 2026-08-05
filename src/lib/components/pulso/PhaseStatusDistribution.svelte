<script lang="ts">
	import type { MeasureState, TopicTimelinePhase } from '$lib/types';
	import { measureStateLabels } from '$lib/data/planMapData';

	interface Props {
		phases: TopicTimelinePhase[];
		phaseShortLabel: (phase: TopicTimelinePhase) => string;
		countsByPhaseId: Map<string, Partial<Record<MeasureState, number>>>;
		activePhaseId: string | null;
		onSelectPhase: (phaseId: string) => void;
	}

	let { phases, phaseShortLabel, countsByPhaseId, activePhaseId, onSelectPhase }: Props = $props();

	const STATUS_ORDER: MeasureState[] = [
		'preparacion',
		'piloto',
		'despliegue',
		'consolidacion',
		'evaluacion'
	];

	const STATUS_DOT: Record<MeasureState, string> = {
		preparacion: 'var(--color-ink-500)',
		piloto: 'var(--color-accent-600)',
		despliegue: 'var(--color-brand-600)',
		consolidacion: 'var(--color-brand-800)',
		evaluacion: 'var(--color-warning-500)'
	};

	function total(phaseId: string): number {
		const counts = countsByPhaseId.get(phaseId) ?? {};
		return STATUS_ORDER.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
	}
</script>

<div class="grid gap-2 sm:gap-4" style="grid-template-columns: repeat({phases.length}, 1fr);">
	{#each phases as phase (phase.id)}
		{@const counts = countsByPhaseId.get(phase.id) ?? {}}
		{@const phaseTotal = total(phase.id)}
		<button type="button" onclick={() => onSelectPhase(phase.id)} class="group text-center">
			<div
				class="mb-2 text-xs font-bold"
				style={`color:${activePhaseId === phase.id ? 'var(--color-brand-700)' : 'var(--color-ink-700)'}`}
			>
				{phaseShortLabel(phase)}
			</div>
			<div
				class="flex h-28 flex-col-reverse overflow-hidden rounded-xl border border-ink-100 group-hover:border-ink-200"
			>
				{#each STATUS_ORDER as status (status)}
					{@const count = counts[status] ?? 0}
					{#if count > 0}
						<div
							title={`${measureStateLabels[status]}: ${count}`}
							style={`height:${(count / phaseTotal) * 100}%; background-color:${STATUS_DOT[status]}`}
						></div>
					{/if}
				{/each}
			</div>
			<div class="mt-1.5 text-xs text-ink-500">
				{phaseTotal} medida{phaseTotal !== 1 ? 's' : ''}
			</div>
		</button>
	{/each}
</div>
