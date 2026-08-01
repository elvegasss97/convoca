<script lang="ts">
	import { MapPin, ChevronDown, LocateFixed, Loader2, Search } from '@lucide/svelte';
	import { selectedCity } from '$lib/stores/location';
	import { mockCities } from '$lib/data/cities';
	import { geocodeAddressSuggestions, type GeocodeResult } from '$lib/utils/geocode';

	let open = $state(false);
	let query = $state('');
	let searchStatus = $state<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');
	let searchResults = $state<GeocodeResult[]>([]);
	let geoStatus = $state<'idle' | 'loading' | 'error'>('idle');
	let geoError = $state('');

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let activeController: AbortController | undefined;

	function choose(city: (typeof mockCities)[number]) {
		$selectedCity = city;
		close();
	}

	function chooseSearchResult(result: GeocodeResult) {
		$selectedCity = {
			name: result.city ?? result.displayName.split(',')[0],
			province: result.province ?? '',
			point: result.point
		};
		close();
	}

	function close() {
		open = false;
		query = '';
		searchResults = [];
		searchStatus = 'idle';
		geoStatus = 'idle';
		geoError = '';
	}

	$effect(() => {
		const q = query.trim();
		clearTimeout(searchTimer);
		activeController?.abort();

		if (q.length < 3) {
			searchStatus = 'idle';
			searchResults = [];
			return;
		}

		// Debounce largo (700ms) para respetar la política de uso de Nominatim
		// (máx. ~1 petición/segundo), igual que en MeetingPointPicker.svelte.
		searchTimer = setTimeout(async () => {
			const controller = new AbortController();
			activeController = controller;
			searchStatus = 'loading';
			try {
				const results = await geocodeAddressSuggestions(
					`${q}, España`,
					controller.signal,
					undefined,
					5
				);
				if (controller.signal.aborted) return;
				searchResults = results;
				searchStatus = results.length > 0 ? 'found' : 'not-found';
			} catch (err: unknown) {
				if (err instanceof DOMException && err.name === 'AbortError') return;
				searchStatus = 'error';
			}
		}, 700);
	});

	/**
	 * Geolocalización del navegador solicitada ÚNICAMENTE al pulsar este
	 * botón (nunca al cargar la página): el texto junto al botón ya explica
	 * para qué se usará antes de que aparezca el diálogo de permiso del
	 * navegador. El punto obtenido solo centra el mapa en memoria (ver
	 * `$lib/stores/location.ts`) — nunca se guarda ni se envía a ningún sitio.
	 */
	function useMyLocation() {
		if (!navigator.geolocation) {
			geoStatus = 'error';
			geoError = 'Tu navegador no admite geolocalización.';
			return;
		}
		geoStatus = 'loading';
		geoError = '';
		navigator.geolocation.getCurrentPosition(
			(position) => {
				$selectedCity = {
					name: 'Tu ubicación',
					province: '',
					point: { lat: position.coords.latitude, lng: position.coords.longitude }
				};
				geoStatus = 'idle';
				close();
			},
			(err) => {
				geoStatus = 'error';
				geoError =
					err.code === err.PERMISSION_DENIED
						? 'Has denegado el permiso de ubicación. Puedes buscar tu ciudad manualmente.'
						: 'No hemos podido obtener tu ubicación. Prueba a buscar tu ciudad manualmente.';
			},
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 }
		);
	}
</script>

<div class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
		aria-haspopup="listbox"
		aria-expanded={open}
	>
		<MapPin class="size-4 text-brand-600" strokeWidth={2.25} />
		<span>{$selectedCity.name}</span>
		<ChevronDown class="size-3.5 text-ink-500" />
	</button>

	{#if open}
		<button
			type="button"
			class="fixed inset-0 z-30 cursor-default"
			aria-label="Cerrar selector de ciudad"
			onclick={close}
		></button>
		<div
			class="absolute right-0 z-40 mt-2 w-[calc(100vw-2rem)] max-w-72 rounded-2xl border border-ink-100 bg-white p-2 shadow-card-hover sm:right-auto sm:left-0"
		>
			<div class="p-1.5 pb-2">
				<button
					type="button"
					onclick={useMyLocation}
					disabled={geoStatus === 'loading'}
					class="flex w-full items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-left text-sm font-medium text-brand-800 transition hover:bg-brand-100 disabled:opacity-60"
				>
					{#if geoStatus === 'loading'}
						<Loader2 class="size-4 shrink-0 animate-spin" />
					{:else}
						<LocateFixed class="size-4 shrink-0" />
					{/if}
					Usar mi ubicación
				</button>
				<p class="mt-1.5 px-1 text-xs leading-snug text-ink-500">
					Se usará solo para centrar el mapa en tu zona ahora mismo. No se guarda ni se comparte.
				</p>
				{#if geoStatus === 'error'}
					<p class="text-critical-600 mt-1 px-1 text-xs leading-snug">{geoError}</p>
				{/if}
			</div>

			<div class="border-t border-ink-100 p-1.5 pt-2">
				<div class="relative block">
					<Search
						class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-400"
						aria-hidden="true"
					/>
					<input
						type="search"
						bind:value={query}
						placeholder="Buscar ciudad o código postal…"
						aria-label="Buscar ciudad o código postal"
						class="w-full rounded-xl border border-ink-200 py-2 pr-2 pl-8 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 focus:outline-none"
					/>
				</div>
				{#if searchStatus === 'loading'}
					<p class="mt-1.5 px-1 text-xs text-ink-400">Buscando…</p>
				{:else if searchStatus === 'not-found'}
					<p class="mt-1.5 px-1 text-xs text-ink-400">Sin resultados. Prueba con otro término.</p>
				{:else if searchStatus === 'error'}
					<p class="text-critical-600 mt-1.5 px-1 text-xs">
						No hemos podido buscar esa ubicación. Inténtalo de nuevo.
					</p>
				{:else if searchResults.length > 0}
					<ul class="mt-1.5 flex max-h-48 flex-col gap-0.5 overflow-auto">
						{#each searchResults as result (result.displayName)}
							<li>
								<button
									type="button"
									onclick={() => chooseSearchResult(result)}
									class="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-ink-700 hover:bg-brand-50"
								>
									{result.displayName}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<ul role="listbox" class="max-h-56 overflow-auto border-t border-ink-100 p-1.5 pt-2">
				<li class="px-2 pb-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">
					Ciudades frecuentes
				</li>
				{#each mockCities as city (city.name)}
					<li>
						<button
							type="button"
							role="option"
							aria-selected={city.name === $selectedCity.name}
							onclick={() => choose(city)}
							class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-brand-50 {city.name ===
							$selectedCity.name
								? 'bg-brand-50 font-semibold text-brand-700'
								: 'text-ink-700'}"
						>
							<span>{city.name}</span>
							<span class="text-xs text-ink-400">{city.province}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
