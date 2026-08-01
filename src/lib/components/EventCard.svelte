<script lang="ts">
	import { CalendarDays, MapPin } from '@lucide/svelte';
	import type { Event } from '$lib/types';
	import { categoryLabels, themeLabel } from '$lib/labels';
	import { formatEventDateShort, formatEventTime } from '$lib/utils/date';
	import {
		getEventTimeCategory,
		describeEventTimingForCard,
		TIME_CATEGORY_COLORS
	} from '$lib/utils/eventTiming';
	import VerificationBadge from './VerificationBadge.svelte';
	import AttendanceCounter from './AttendanceCounter.svelte';
	import CategoryGlyph from './CategoryGlyph.svelte';

	interface Props {
		event: Event;
		organizerName?: string;
	}

	let { event, organizerName }: Props = $props();

	const timing = $derived(getEventTimeCategory(event.startAt));
	const timeColor = $derived(
		TIME_CATEGORY_COLORS[timing.category === 'invalid' ? 'past' : timing.category]
	);
</script>

<a
	href={`/convocatorias/${event.slug}`}
	class="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
>
	<div
		class="bg-dot-grid relative flex h-24 items-center justify-between bg-brand-800 px-4 text-white"
	>
		<div class="flex items-center gap-2">
			<CategoryGlyph category={event.category} class="size-8 shrink-0 text-brand-100" />
			<div>
				<p class="font-display text-sm leading-tight font-semibold">
					{categoryLabels[event.category]}
				</p>
				<p class="text-xs text-brand-100/90">
					{themeLabel(event.themes[0], event.customThemeLabel)}
				</p>
			</div>
		</div>
		<span
			class="rounded-full bg-white/15 px-2.5 py-1 text-center font-display text-xs leading-none font-semibold backdrop-blur-sm"
		>
			{formatEventDateShort(event.startAt)}
		</span>
	</div>

	<div class="flex flex-1 flex-col gap-2.5 p-4">
		<h3 class="font-display text-base leading-snug font-semibold text-ink-900">{event.title}</h3>

		<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
			<span class="flex items-center gap-1">
				<CalendarDays class="size-3.5" />
				{formatEventDateShort(event.startAt)} · {formatEventTime(event.startAt)}
			</span>
			<span class="flex items-center gap-1">
				<MapPin class="size-3.5" />
				{event.meetingPoint.city}
			</span>
			<span class="flex items-center gap-1 font-medium" style={`color: ${timeColor}`}>
				<span class="size-2 rounded-full" style={`background-color: ${timeColor}`}></span>
				{describeEventTimingForCard(timing)}
			</span>
		</div>

		{#if organizerName}
			<div class="flex items-center gap-1.5 text-xs text-ink-600">
				<span class="truncate">{organizerName}</span>
				<VerificationBadge level={event.verification.level} />
			</div>
		{/if}

		<div class="mt-auto flex items-center justify-between pt-1">
			<AttendanceCounter attendance={event.attendance} />
		</div>
	</div>
</a>
