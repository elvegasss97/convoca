<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { PlusCircle, List, Map as MapIcon, Users, CalendarCheck } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { DEFAULT_FILTERS } from '$lib/types';
	import { filterEvents } from '$lib/utils/filterEvents';
	import { selectedCity } from '$lib/stores/location';
	import EventFilters from '$lib/components/EventFilters.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import EventMap from '$lib/components/EventMap.svelte';

	let { data }: { data: PageData } = $props();

	const orgNameById = $derived(new Map(data.organizers.map((o) => [o.id, o.displayName])));
	const numberFormatter = new Intl.NumberFormat('es-ES');

	let filters = $state({ ...DEFAULT_FILTERS });

	const view = $derived(page.url.searchParams.get('vista') === 'mapa' ? 'mapa' : 'lista');
	const filteredEvents = $derived(filterEvents(data.events, filters, $selectedCity.point));

	function setView(next: 'lista' | 'mapa') {
		const url = new URL(page.url);
		if (next === 'mapa') url.searchParams.set('vista', 'mapa');
		else url.searchParams.delete('vista');
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}
</script>

<svelte:head>
	<title>Convoca — Descubre convocatorias cerca de ti</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6">
	{#if view === 'lista'}
		<section class="mb-5">
			<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Descubre qué está pasando cerca
			</h1>
			<p class="mt-1 max-w-2xl text-sm text-ink-600 sm:text-base">
				Comprueba quién organiza cada convocatoria y confirma tu asistencia sin exponer tu
				identidad.
			</p>

			<div class="mt-4 flex flex-wrap items-center gap-3">
				<div
					class="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 shadow-card"
				>
					<CalendarCheck class="size-4 text-brand-600" />
					<span class="text-sm">
						<strong class="font-semibold text-ink-900">{data.stats.eventCount}</strong> convocatorias
						activas
					</span>
				</div>
				<div
					class="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 shadow-card"
				>
					<Users class="size-4 text-accent-500" />
					<span class="text-sm">
						<strong class="font-semibold text-ink-900"
							>{numberFormatter.format(data.stats.estimatedAttendance)}</strong
						>
						personas estimadas
					</span>
				</div>
				<a
					href="/crear"
					class="ml-auto flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
				>
					<PlusCircle class="size-4" strokeWidth={2.25} />
					Crear convocatoria
				</a>
			</div>
		</section>
	{/if}

	<div class="mb-4 flex items-center justify-between gap-3">
		<div class="inline-flex rounded-full border border-ink-200 bg-white p-1 shadow-sm">
			<button
				type="button"
				onclick={() => setView('lista')}
				class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition {view ===
				'lista'
					? 'bg-brand-700 text-white'
					: 'text-ink-600 hover:bg-ink-50'}"
			>
				<List class="size-4" /> Listado
			</button>
			<button
				type="button"
				onclick={() => setView('mapa')}
				class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition {view ===
				'mapa'
					? 'bg-brand-700 text-white'
					: 'text-ink-600 hover:bg-ink-50'}"
			>
				<MapIcon class="size-4" /> Mapa
			</button>
		</div>
	</div>

	<div class="mb-5">
		<EventFilters bind:filters resultsCount={filteredEvents.length} />
	</div>

	{#if view === 'lista'}
		{#if filteredEvents.length > 0}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredEvents as event (event.id)}
					<EventCard {event} organizerName={orgNameById.get(event.organizerId)} />
				{/each}
			</div>
		{:else}
			<div class="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
				<p class="text-sm text-ink-500">No hay convocatorias que coincidan con estos filtros.</p>
			</div>
		{/if}
	{:else}
		<div class="overflow-hidden rounded-2xl border border-ink-100 shadow-card">
			<EventMap
				events={filteredEvents}
				center={$selectedCity.point}
				zoom={11.5}
				heightClass="h-[70vh]"
				fitToEvents
			/>
		</div>
	{/if}
</div>
