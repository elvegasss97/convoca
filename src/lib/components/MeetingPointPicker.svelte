<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
	import type { GeoPoint } from '$lib/types';
	import {
		geocodeAddressSuggestions,
		geocodePostalCodeBounds,
		type GeoBounds,
		type GeocodeResult
	} from '$lib/utils/geocode';
	import FieldError from './FieldError.svelte';

	interface Props {
		point: GeoPoint;
		cityName: string;
		province?: string;
		/** Dirección escrita: al cambiar, busca sugerencias reales para elegir (nunca adivina una sola). */
		address: string;
		/** Código postal escrito en el paso anterior: acota el área de búsqueda de sugerencias para desambiguar calles con el mismo nombre en distintas localidades. */
		postalCode?: string;
		cityInvalid?: boolean;
		addressInvalid?: boolean;
	}

	let {
		point = $bindable(),
		cityName = $bindable(),
		// eslint-disable-next-line no-useless-assignment -- $bindable() default is read via the template/parent binding, not a dead write.
		province = $bindable(''),
		address = $bindable(),
		postalCode = '',
		cityInvalid = false,
		addressInvalid = false
	}: Props = $props();

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let marker: MapLibreMarker | undefined;

	onMount(async () => {
		if (!browser) return;
		const maplibregl = await import('maplibre-gl');

		const instance = new maplibregl.Map({
			container,
			style: {
				version: 8,
				sources: {
					osm: {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution: '© OpenStreetMap'
					}
				},
				layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
			},
			center: [point.lng, point.lat],
			zoom: 13,
			attributionControl: { compact: true }
		});
		map = instance;
		instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

		const markerInstance = new maplibregl.Marker({ color: '#dc6c25', draggable: true })
			.setLngLat([point.lng, point.lat])
			.addTo(instance);
		marker = markerInstance;

		markerInstance.on('dragstart', () => {
			suggestionsStatus = 'idle';
		});

		markerInstance.on('dragend', () => {
			const { lng, lat } = markerInstance.getLngLat();
			point = { lat, lng };
		});

		instance.on('click', (e) => {
			suggestionsStatus = 'idle';
			point = { lat: e.lngLat.lat, lng: e.lngLat.lng };
			markerInstance.setLngLat(e.lngLat);
		});
	});

	// Ningún algoritmo de desambiguación (código postal antepuesto/pospuesto,
	// ciudad escrita, "top 1" por importancia global...) acierta siempre con
	// nombres de calle repetidos entre localidades (Calle Mayor, Plaza de la
	// Constitución...) — comprobado en vivo con casos reales que fallaban
	// (código postal de Torre del Mar resolviendo en Sevilla). La única forma
	// correcta es no adivinar: se buscan varias direcciones candidatas y la
	// persona elige la suya de una lista, igual que en cualquier buscador de
	// direcciones serio (Google Maps, etc.). El código postal, si se ha
	// escrito, se sigue usando para acotar el área de búsqueda (menos ruido
	// en la lista), pero nunca decide él solo.
	type SuggestionsStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';
	let suggestionsStatus = $state<SuggestionsStatus>('idle');
	let suggestions = $state<GeocodeResult[]>([]);
	let suggestionsOpen = $state(false);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let activeController: AbortController | undefined;
	let cachedPostalCode: string | undefined;
	let cachedBounds: GeoBounds | null = null;

	$effect(() => {
		const query = address.trim();
		const postal = postalCode.trim();

		clearTimeout(searchTimer);
		activeController?.abort();

		if (query.length < 4) {
			suggestionsStatus = 'idle';
			suggestions = [];
			suggestionsOpen = false;
			return;
		}

		searchTimer = setTimeout(async () => {
			const controller = new AbortController();
			activeController = controller;
			suggestionsStatus = 'loading';

			try {
				let bounds: GeoBounds | undefined;
				if (/^\d{5}$/.test(postal)) {
					if (postal !== cachedPostalCode) {
						cachedPostalCode = postal;
						cachedBounds = await geocodePostalCodeBounds(postal, controller.signal);
					}
					bounds = cachedBounds ?? undefined;
				}
				if (controller.signal.aborted) return;

				const results = await geocodeAddressSuggestions(
					`${query}, España`,
					controller.signal,
					bounds
				);
				if (controller.signal.aborted) return;
				// Nominatim puede devolver dos resultados (distintos tramos OSM de
				// la misma calle) con el mismo display_name; sin deduplicar, la
				// clave repetida del {#each} de abajo hace que Svelte lance un
				// error en tiempo de ejecución (each_key_duplicate) que aborta el
				// render de todo el desplegable a medias.
				const seenNames: string[] = [];
				suggestions = results.filter((r) => {
					if (seenNames.includes(r.displayName)) return false;
					seenNames.push(r.displayName);
					return true;
				});
				suggestionsOpen = true;
				suggestionsStatus = suggestions.length > 0 ? 'found' : 'not-found';
			} catch (err: unknown) {
				if (err instanceof DOMException && err.name === 'AbortError') return;
				suggestionsStatus = 'error';
			}
		}, 700);
	});

	function selectSuggestion(result: GeocodeResult) {
		address = result.displayName;
		point = result.point;
		if (result.city) cityName = result.city;
		if (result.province) province = result.province;
		marker?.setLngLat([result.point.lng, result.point.lat]);
		map?.easeTo({ center: [result.point.lng, result.point.lat], zoom: 16 });
		suggestions = [];
		suggestionsOpen = false;
		suggestionsStatus = 'idle';
	}

	onDestroy(() => {
		clearTimeout(searchTimer);
		activeController?.abort();
		map?.remove();
	});
</script>

<div class="space-y-2">
	<div class="relative">
		<label for="meeting-address" class="mb-1 block text-sm font-medium text-ink-700">
			Dirección
		</label>
		<input
			id="meeting-address"
			bind:value={address}
			placeholder="Ej. Plaza Mayor, s/n"
			autocomplete="off"
			role="combobox"
			aria-expanded={suggestionsOpen}
			aria-controls="address-suggestions"
			aria-invalid={addressInvalid}
			onfocus={() => {
				if (suggestions.length > 0) suggestionsOpen = true;
			}}
			onblur={() => {
				// Delay para que el mousedown de una sugerencia (más abajo) se
				// dispare antes de que el listbox se cierre por el blur.
				setTimeout(() => (suggestionsOpen = false), 150);
			}}
			class="w-full rounded-xl text-sm focus:ring-brand-500 {addressInvalid
				? 'border-critical-400 focus:border-critical-500'
				: 'border-ink-200 focus:border-brand-500'}"
		/>
		{#if addressInvalid}
			<FieldError message="Indica la dirección." />
		{/if}
		{#if suggestionsOpen && (suggestionsStatus === 'loading' || suggestions.length > 0 || suggestionsStatus === 'not-found')}
			<ul
				id="address-suggestions"
				role="listbox"
				aria-label="Direcciones encontradas"
				class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-ink-200 bg-white py-1 shadow-card-hover"
			>
				{#if suggestionsStatus === 'loading'}
					<li class="flex items-center gap-1.5 px-3 py-2 text-xs text-ink-500">
						<span
							class="size-3 shrink-0 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600"
						></span>
						Buscando direcciones…
					</li>
				{:else if suggestions.length === 0}
					<li class="px-3 py-2 text-xs text-warning-700">
						No hemos encontrado direcciones con ese texto{postalCode.trim()
							? ' en ese código postal'
							: ''}. Sigue escribiendo, o coloca el punto a mano en el mapa.
					</li>
				{:else}
					{#each suggestions as result (result.displayName)}
						<li role="option" aria-selected="false">
							<button
								type="button"
								onmousedown={(e) => {
									e.preventDefault();
									selectSuggestion(result);
								}}
								class="block w-full px-3 py-2 text-left text-xs text-ink-700 hover:bg-brand-50"
							>
								{result.displayName}
							</button>
						</li>
					{/each}
				{/if}
			</ul>
		{/if}
	</div>
	<div>
		<label for="city-input" class="mb-1 block text-sm font-medium text-ink-700">Ciudad</label>
		<input
			id="city-input"
			bind:value={cityName}
			placeholder="Escribe cualquier ciudad o pueblo de España"
			aria-invalid={cityInvalid}
			class="w-full rounded-xl text-sm focus:ring-brand-500 {cityInvalid
				? 'border-critical-400 focus:border-critical-500'
				: 'border-ink-200 focus:border-brand-500'}"
		/>
		{#if cityInvalid}
			<FieldError message="Indica la ciudad o pueblo." />
		{/if}
	</div>
	<div class="overflow-hidden rounded-2xl border border-ink-100">
		<div bind:this={container} class="h-56 w-full bg-ink-100"></div>
	</div>
	<p class="text-xs text-ink-400">
		Elige tu dirección de la lista de sugerencias para colocar el punto con precisión, o arrastra el
		marcador y toca el mapa para ajustarlo a mano.
	</p>
</div>
