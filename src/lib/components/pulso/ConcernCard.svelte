<script lang="ts">
	import { Users, CalendarClock, MapPin, CheckCircle2, Link as LinkIcon } from '@lucide/svelte';
	import type { Concern, ConcernLevel, ConcernResults } from '$lib/types';
	import { concernCategoryLabels, concernScopeTypeLabels } from '$lib/labels';
	import { formatEventDate } from '$lib/utils/date';
	import ConcernCategoryGlyph from './ConcernCategoryGlyph.svelte';
	import ConcernResultsChart from './ConcernResultsChart.svelte';

	interface Props {
		concern: Concern;
		results: ConcernResults;
		myLevel?: ConcernLevel;
		relatedEventsCount?: number;
	}

	let { concern, results, myLevel, relatedEventsCount = 0 }: Props = $props();

	const scopeLabel = $derived(
		concern.scope.type === 'nacional'
			? concernScopeTypeLabels.nacional
			: `${concernScopeTypeLabels[concern.scope.type]} · ${concern.scope.value}`
	);

	const isOpen = $derived(!concern.closesAt || new Date(concern.closesAt) > new Date());
</script>

<a
	href={`/pulso/${concern.slug}`}
	class="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
>
	<div class="bg-dot-grid flex items-center gap-2 bg-brand-800 px-4 py-3 text-white">
		<ConcernCategoryGlyph category={concern.category} class="size-6 shrink-0 text-brand-100" />
		<p class="font-display text-sm leading-tight font-semibold">
			{concernCategoryLabels[concern.category]}
		</p>
		{#if myLevel}
			<span
				class="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm"
			>
				<CheckCircle2 class="size-3.5" /> Respondida
			</span>
		{/if}
	</div>

	<div class="flex flex-1 flex-col gap-3 p-4">
		<h3 class="font-display text-base leading-snug font-semibold text-ink-900">
			{concern.question}
		</h3>

		<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
			<span class="flex items-center gap-1">
				<MapPin class="size-3.5" />
				{scopeLabel}
			</span>
			<span class="flex items-center gap-1">
				<Users class="size-3.5" />
				{results.totalResponses}
				{results.totalResponses === 1 ? 'participante' : 'participantes'}
			</span>
			<span class="flex items-center gap-1">
				<CalendarClock class="size-3.5" />
				{isOpen
					? concern.closesAt
						? `Cierra el ${formatEventDate(concern.closesAt)}`
						: 'Activa'
					: `Cerrada el ${formatEventDate(concern.closesAt ?? concern.updatedAt)}`}
			</span>
			{#if relatedEventsCount > 0}
				<span class="flex items-center gap-1 font-medium text-brand-700">
					<LinkIcon class="size-3.5" />
					{relatedEventsCount}
					{relatedEventsCount === 1 ? 'convocatoria relacionada' : 'convocatorias relacionadas'}
				</span>
			{/if}
		</div>

		<ConcernResultsChart {results} compact />

		<div class="mt-auto pt-1">
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3.5 py-1.5 text-xs font-semibold text-white transition group-hover:bg-accent-600"
			>
				{myLevel ? 'Ver resultados' : 'Participar'}
			</span>
		</div>
	</div>
</a>
