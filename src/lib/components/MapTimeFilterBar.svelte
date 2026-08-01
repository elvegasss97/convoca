<script lang="ts">
	import type { EventTimeCategory } from '$lib/utils/eventTiming';
	import { TIME_CATEGORY_LABELS } from '$lib/utils/eventTiming';

	export type MapTimeFilter = 'all' | EventTimeCategory;

	interface Props {
		value: MapTimeFilter;
		onChange: (next: MapTimeFilter) => void;
		resultsCount: number;
	}

	let { value, onChange, resultsCount }: Props = $props();

	const options: { value: MapTimeFilter; label: string }[] = [
		{ value: 'all', label: 'Ver todas' },
		{ value: 'today', label: TIME_CATEGORY_LABELS.today },
		{ value: 'this_week', label: TIME_CATEGORY_LABELS.this_week },
		{ value: 'upcoming_weeks', label: TIME_CATEGORY_LABELS.upcoming_weeks },
		{ value: 'over_month', label: TIME_CATEGORY_LABELS.over_month },
		{ value: 'past', label: 'Finalizadas' }
	];
</script>

<div
	class="flex flex-wrap items-center gap-2"
	role="group"
	aria-label="Filtrar por proximidad temporal"
>
	{#each options as option (option.value)}
		<button
			type="button"
			onclick={() => onChange(option.value)}
			aria-pressed={value === option.value}
			class="rounded-full border px-3 py-1.5 text-xs font-semibold transition {value ===
			option.value
				? 'border-brand-700 bg-brand-700 text-white'
				: 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}"
		>
			{option.label}
		</button>
	{/each}
	<span class="text-xs text-ink-400">
		{resultsCount} resultado{resultsCount === 1 ? '' : 's'}
	</span>
</div>
