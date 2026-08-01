<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		PlusCircle,
		List,
		Map as MapIcon,
		Users,
		CalendarCheck,
		Search,
		ShieldCheck,
		Megaphone,
		Compass
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import { DEFAULT_FILTERS } from '$lib/types';
	import { filterEvents } from '$lib/utils/filterEvents';
	import { getEventTimeCategory } from '$lib/utils/eventTiming';
	import { selectedCity } from '$lib/stores/location';
	import EventFilters from '$lib/components/EventFilters.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import EventMap from '$lib/components/EventMap.svelte';
	import MapTimeFilterBar, { type MapTimeFilter } from '$lib/components/MapTimeFilterBar.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data }: { data: PageData } = $props();

	const orgNameById = $derived(new Map(data.organizers.map((o) => [o.id, o.displayName])));
	const numberFormatter = new Intl.NumberFormat('es-ES');

	let filters = $state({ ...DEFAULT_FILTERS });

	const view = $derived(page.url.searchParams.get('vista') === 'mapa' ? 'mapa' : 'lista');

	const VALID_TIME_FILTERS = new Set([
		'all',
		'today',
		'this_week',
		'upcoming_weeks',
		'over_month',
		'past'
	]);
	const timeFilter = $derived.by((): MapTimeFilter => {
		const raw = page.url.searchParams.get('tiempo');
		return raw && VALID_TIME_FILTERS.has(raw) ? (raw as MapTimeFilter) : 'all';
	});

	// Filtro temporal separado de `filters` (EventFiltersState/filterEvents ya
	// existente, chips "Hoy/Este finde/..."): esta es la categorización nueva
	// pedida para el mapa (hoy/esta semana/próximas semanas/más de un mes),
	// con semántica y límites distintos. Se aplica igual en mapa y listado
	// ("sincroniza mapa y listado" / "conserva el filtro al cambiar de vista")
	// porque ambos parten del mismo `filteredEvents`.
	const timeFilteredEvents = $derived.by(() => {
		const base = filterEvents(data.events, filters, $selectedCity.point);
		if (timeFilter === 'all') {
			return base.filter((e) => getEventTimeCategory(e.startAt).category !== 'past');
		}
		return base.filter((e) => {
			const result = getEventTimeCategory(e.startAt);
			const category = result.category === 'invalid' ? 'past' : result.category;
			return category === timeFilter;
		});
	});
	const filteredEvents = $derived(timeFilteredEvents);

	function setView(next: 'lista' | 'mapa') {
		const url = new URL(page.url);
		if (next === 'mapa') url.searchParams.set('vista', 'mapa');
		else url.searchParams.delete('vista');
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function setTimeFilter(next: MapTimeFilter) {
		const url = new URL(page.url);
		if (next === 'all') url.searchParams.delete('tiempo');
		else url.searchParams.set('tiempo', next);
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function resetAllFilters() {
		filters = { ...DEFAULT_FILTERS };
		setTimeFilter('all');
	}

	const hasActiveFilters = $derived(
		timeFilter !== 'all' ||
			filters.query !== '' ||
			filters.date !== 'any' ||
			filters.distanceKm !== null ||
			filters.categories.length > 0 ||
			filters.themes.length > 0 ||
			filters.verifiedOnly
	);
</script>

<Seo
	title="Convocatorias ciudadanas, cerca de ti"
	description="Descubre, crea y comparte manifestaciones, concentraciones, recogidas de firmas y acciones ciudadanas desde un único mapa. Convoca es una plataforma ciudadana independiente."
/>

<div class="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6">
	{#if view === 'lista'}
		<section class="mb-8 border-b border-ink-100 pb-8">
			<h1 class="font-display text-3xl font-semibold text-balance text-ink-900 sm:text-4xl">
				Convocatorias ciudadanas, cerca de ti
			</h1>
			<p class="mt-2 max-w-2xl text-sm text-ink-600 sm:text-base">
				Descubre, crea y comparte manifestaciones, concentraciones, recogidas de firmas y acciones
				ciudadanas desde un único mapa. Comprueba quién organiza cada convocatoria y confirma tu
				asistencia sin exponer tu identidad.
			</p>

			<div class="mt-5 flex flex-wrap items-center gap-3">
				<a
					href="#convocatorias"
					class="flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
				>
					<Search class="size-4" strokeWidth={2.25} />
					Explorar convocatorias
				</a>
				<a
					href="/crear"
					class="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-5 py-3 text-sm font-semibold text-ink-800 shadow-sm transition hover:bg-ink-50"
				>
					<PlusCircle class="size-4" strokeWidth={2.25} />
					Crear una convocatoria
				</a>
			</div>

			<div class="mt-5 flex flex-wrap items-center gap-3">
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
			</div>

			<dl class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="flex items-start gap-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
						<Compass class="size-4.5 text-brand-700" aria-hidden="true" />
					</span>
					<div>
						<dt class="text-sm font-semibold text-ink-900">1. Descubre</dt>
						<dd class="mt-0.5 text-sm text-ink-600">
							Busca por ciudad, código postal o en el mapa qué convocatorias hay cerca de ti.
						</dd>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
						<Megaphone class="size-4.5 text-brand-700" aria-hidden="true" />
					</span>
					<div>
						<dt class="text-sm font-semibold text-ink-900">2. Participa</dt>
						<dd class="mt-0.5 text-sm text-ink-600">
							Confirma tu asistencia o marca tu interés de forma anónima, sin crear cuenta.
						</dd>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
						<ShieldCheck class="size-4.5 text-brand-700" aria-hidden="true" />
					</span>
					<div>
						<dt class="text-sm font-semibold text-ink-900">3. Confía</dt>
						<dd class="mt-0.5 text-sm text-ink-600">
							Cada convocatoria muestra quién la organiza y su estado de verificación, con
							honestidad.
						</dd>
					</div>
				</div>
			</dl>
		</section>
	{/if}

	<div id="convocatorias" class="mb-4 flex scroll-mt-20 items-center justify-between gap-3">
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

	<div class="mb-3">
		<MapTimeFilterBar
			value={timeFilter}
			onChange={setTimeFilter}
			resultsCount={filteredEvents.length}
		/>
	</div>

	<div class="mb-5">
		<EventFilters
			bind:filters
			resultsCount={filteredEvents.length}
			onClearAll={() => setTimeFilter('all')}
		/>
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
				<p class="text-sm font-medium text-ink-700">
					{hasActiveFilters
						? 'Ninguna convocatoria coincide con estos filtros.'
						: `Todavía no hay convocatorias publicadas en ${$selectedCity.name}.`}
				</p>
				<p class="mt-1 text-sm text-ink-500">
					{hasActiveFilters
						? 'Prueba a quitar algún filtro o buscar en otra ciudad.'
						: 'Prueba a buscar otra ciudad o sé la primera persona en crear una.'}
				</p>
				<div class="mt-4 flex flex-wrap items-center justify-center gap-2">
					{#if hasActiveFilters}
						<button
							type="button"
							onclick={resetAllFilters}
							class="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
						>
							Quitar filtros
						</button>
					{/if}
					<a
						href="/crear"
						class="rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
					>
						Crear convocatoria
					</a>
				</div>
			</div>
		{/if}
	{:else if filteredEvents.length > 0}
		<div class="overflow-hidden rounded-2xl border border-ink-100 shadow-card">
			<EventMap
				events={filteredEvents}
				center={$selectedCity.point}
				zoom={11.5}
				heightClass="h-[70vh]"
				fitToEvents
				showLegend
			/>
		</div>
	{:else}
		<div class="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
			<p class="text-sm font-medium text-ink-700">
				{hasActiveFilters
					? 'Ninguna convocatoria coincide con estos filtros en el mapa.'
					: `Todavía no hay convocatorias publicadas en ${$selectedCity.name}.`}
			</p>
			<p class="mt-1 text-sm text-ink-500">
				Prueba a quitar filtros, buscar otra ciudad o usar tu ubicación con el selector de arriba.
			</p>
			{#if hasActiveFilters}
				<button
					type="button"
					onclick={resetAllFilters}
					class="mt-4 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
				>
					Quitar filtros
				</button>
			{/if}
		</div>
	{/if}

	{#if view === 'lista'}
		<section
			class="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-brand-100 bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="flex items-start gap-3">
				<ShieldCheck class="mt-0.5 size-6 shrink-0 text-brand-700" aria-hidden="true" />
				<div>
					<p class="font-display text-base font-semibold text-ink-900">
						Una plataforma ciudadana, no partidista
					</p>
					<p class="mt-1 max-w-xl text-sm text-ink-700">
						Convoca es un proyecto independiente que no pertenece a ningún partido político,
						sindicato ni administración. Cualquier persona puede publicar una convocatoria; cada
						ficha indica claramente su estado de verificación para que decidas tú en quién confiar.
					</p>
				</div>
			</div>
			<a
				href="/crear"
				class="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-accent-600"
			>
				<PlusCircle class="size-4" strokeWidth={2.25} />
				Crear tu convocatoria
			</a>
		</section>
	{/if}
</div>
