<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft, CalendarDays, MapPin, Route, Share2, Flag, Info } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { categoryLabels, themeLabel, priorCommunicationLabels } from '$lib/labels';
	import {
		formatEventDate,
		formatEventTime,
		formatEventWeekday,
		formatDuration
	} from '$lib/utils/date';
	import VerificationBadge from '$lib/components/VerificationBadge.svelte';
	import EventStatusBanner from '$lib/components/EventStatusBanner.svelte';
	import AttendanceCounter from '$lib/components/AttendanceCounter.svelte';
	import AttendanceButtons from '$lib/components/AttendanceButtons.svelte';
	import OrganizerCard from '$lib/components/OrganizerCard.svelte';
	import EventUpdates from '$lib/components/EventUpdates.svelte';
	import EventMap from '$lib/components/EventMap.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import ReportDialog from '$lib/components/ReportDialog.svelte';

	let { data }: { data: PageData } = $props();

	// Copia local mutable de la convocatoria: permite la actualización optimista de
	// AttendanceButtons y se resincroniza cuando `data` cambia (navegación a otro slug).
	// eslint-disable-next-line svelte/prefer-writable-derived -- necesitamos mutación de propiedades anidadas (attendance), no solo reemplazo del valor.
	let event = $state(data.event);
	$effect(() => {
		event = data.event;
	});

	const closedStates = new Set(['cancelled', 'completed', 'hidden', 'rejected']);
	const attendanceDisabled = $derived(closedStates.has(event.status));

	let shareOpen = $state(false);
	let reportOpen = $state(false);
</script>

<svelte:head>
	<title>{event.title} — Convoca</title>
	<meta name="description" content={event.description} />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 pt-4 pb-24 sm:px-6 md:pb-10">
	<a
		href="/"
		class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
	>
		<ArrowLeft class="size-4" /> Volver
	</a>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-2">
			<EventStatusBanner {event} />

			<div>
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
						{categoryLabels[event.category]}
					</span>
					{#each event.themes as theme (theme)}
						<span class="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
							>{themeLabel(theme, event.customThemeLabel)}</span
						>
					{/each}
				</div>
				<h1 class="mt-2 font-display text-2xl leading-tight font-semibold text-ink-900 sm:text-3xl">
					{event.title}
				</h1>
			</div>

			<div
				class="grid grid-cols-1 gap-3 rounded-2xl border border-ink-100 bg-white p-4 sm:grid-cols-2"
			>
				<div class="flex items-start gap-2.5">
					<CalendarDays class="mt-0.5 size-5 shrink-0 text-brand-600" />
					<div class="text-sm">
						<p class="font-semibold text-ink-900">
							{formatEventWeekday(event.startAt)}, {formatEventDate(event.startAt)}
						</p>
						<p class="text-ink-500">
							{formatEventTime(event.startAt)}{event.durationMinutes
								? ` · ${formatDuration(event.durationMinutes)}`
								: ''}
						</p>
					</div>
				</div>
				<div class="flex items-start gap-2.5">
					<MapPin class="mt-0.5 size-5 shrink-0 text-brand-600" />
					<div class="text-sm">
						<p class="font-semibold text-ink-900">{event.meetingPoint.label}</p>
						<p class="text-ink-500">{event.meetingPoint.address}, {event.meetingPoint.city}</p>
					</div>
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<VerificationBadge level={event.verification.level} size="md" />
				<span
					class="flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600"
				>
					<Info class="size-3.5" />
					{priorCommunicationLabels[event.priorCommunication]}
				</span>
			</div>

			<div class="overflow-hidden rounded-2xl border border-ink-100 shadow-card">
				<EventMap
					events={[event]}
					center={event.meetingPoint.point}
					zoom={event.route ? 13 : 14.5}
					route={event.route}
					heightClass="h-72"
				/>
			</div>

			{#if event.route?.description}
				<div
					class="flex items-start gap-2.5 rounded-2xl border border-accent-100 bg-accent-50 p-4 text-sm text-accent-800"
				>
					<Route class="mt-0.5 size-5 shrink-0" />
					<p><strong class="font-semibold">Recorrido:</strong> {event.route.description}</p>
				</div>
			{/if}

			<section>
				<h2 class="font-display text-lg font-semibold text-ink-900">Descripción</h2>
				<p class="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-700">
					{event.description}
				</p>
			</section>

			<section>
				<h2 class="font-display text-lg font-semibold text-ink-900">Objetivo</h2>
				<p class="mt-2 text-sm leading-relaxed text-ink-700">{event.objective}</p>
			</section>

			{#if event.rules.length > 0}
				<section>
					<h2 class="font-display text-lg font-semibold text-ink-900">Normas de la convocatoria</h2>
					<ul class="mt-2 space-y-1.5">
						{#each event.rules as rule (rule)}
							<li class="flex items-start gap-2 text-sm text-ink-700">
								<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500"></span>
								{rule}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section>
				<h2 class="font-display text-lg font-semibold text-ink-900">
					Actualizaciones del organizador
				</h2>
				<div class="mt-2">
					<EventUpdates updates={data.updates} />
				</div>
			</section>
		</div>

		<aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
			<div class="rounded-2xl border border-ink-100 bg-white p-4">
				<AttendanceCounter attendance={event.attendance} variant="full" />
				<div class="mt-4">
					<AttendanceButtons
						eventId={event.id}
						bind:attendance={event.attendance}
						disabled={attendanceDisabled}
					/>
				</div>
				<div class="mt-3 flex gap-2">
					<button
						type="button"
						onclick={() => (shareOpen = true)}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-200 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50"
					>
						<Share2 class="size-4" /> Compartir
					</button>
					<button
						type="button"
						onclick={() => (reportOpen = true)}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-200 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50"
					>
						<Flag class="size-4" /> Reportar
					</button>
				</div>
				<p class="mt-3 text-[11px] leading-snug text-ink-400">
					Convoca no sustituye los trámites administrativos que, en su caso, correspondan a la
					organización de esta convocatoria.
				</p>
			</div>

			<OrganizerCard organizer={data.organizer} verificationLevel={event.verification.level} />
		</aside>
	</div>
</div>

<ShareDialog
	bind:open={shareOpen}
	onClose={() => (shareOpen = false)}
	title={event.title}
	url={page.url.href}
/>
<ReportDialog eventId={event.id} bind:open={reportOpen} onClose={() => (reportOpen = false)} />
