<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
	import type { GeoPoint } from '$lib/types';
	import { geocodeAddress } from '$lib/utils/geocode';
	import FieldError from './FieldError.svelte';

	interface Props {
		point: GeoPoint;
		cityName: string;
		province?: string;
		/** Dirección escrita en el paso anterior: al cambiar, se geocodifica y mueve el marcador. */
		address?: string;
		/** Código postal escrito en el paso anterior: se antepone a la dirección en la búsqueda para desambiguar calles con el mismo nombre en distintas localidades. */
		postalCode?: string;
		cityInvalid?: boolean;
	}

	let {
		point = $bindable(),
		cityName = $bindable(),
		// eslint-disable-next-line no-useless-assignment -- $bindable() default is read via the template/parent binding, not a dead write.
		province = $bindable(''),
		address = '',
		postalCode = '',
		cityInvalid = false
	}: Props = $props();

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let marker: MapLibreMarker | undefined;

	type GeocodeStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';
	let geocodeStatus = $state<GeocodeStatus>('idle');

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
			geocodeStatus = 'idle';
		});

		markerInstance.on('dragend', () => {
			const { lng, lat } = markerInstance.getLngLat();
			point = { lat, lng };
		});

		instance.on('click', (e) => {
			geocodeStatus = 'idle';
			point = { lat: e.lngLat.lat, lng: e.lngLat.lng };
			markerInstance.setLngLat(e.lngLat);
		});
	});

	// Geocodifica la dirección tal cual se escribe, sin añadir la ciudad como
	// contexto: el campo "Ciudad" se rellena a partir del resultado (más
	// abajo), así que si se deja la ciudad de una búsqueda anterior y se
	// cambia solo la dirección a otra parte de España, no queda una ciudad
	// obsoleta encadenada a la query rompiendo la búsqueda siguiente. No hay
	// lista cerrada de ciudades: funciona en cualquier punto de España.
	//
	// El código postal, si se ha escrito, se antepone a la dirección: muchos
	// nombres de calle se repiten en distintas localidades (Calle Mayor,
	// Avenida de la Constitución...) y el código postal es la forma más
	// fiable de desambiguar sin depender de una ciudad escrita a mano. A
	// diferencia de "Ciudad", este campo nunca se autorrellena con el
	// resultado, así que no puede quedar "atascado" con un valor de una
	// búsqueda anterior sin que la persona lo haya escrito ella misma.
	let geocodeTimer: ReturnType<typeof setTimeout> | undefined;
	let activeController: AbortController | undefined;

	$effect(() => {
		const query = address.trim();
		const postal = postalCode.trim();

		clearTimeout(geocodeTimer);
		activeController?.abort();

		if (query.length < 5) {
			geocodeStatus = 'idle';
			return;
		}

		geocodeTimer = setTimeout(() => {
			const controller = new AbortController();
			activeController = controller;
			geocodeStatus = 'loading';

			// Comprobado empíricamente contra Nominatim: aunque en el
			// formulario el código postal se muestre primero (para que se
			// rellene antes de escribir la calle), en la propia query de
			// búsqueda tiene que ir DESPUÉS de la dirección — antepuesto,
			// Nominatim lo trata como ruido y devuelve la coincidencia con
			// más peso global ignorando el código postal (p. ej. "28801,
			// Calle Mayor, España" resuelve a la Calle Mayor de Madrid en
			// vez de la de Alcalá de Henares); pospuesto sí desambigua
			// correctamente ("Calle Mayor, 28801, España" → Alcalá de
			// Henares).
			const fullQuery = postal ? `${query}, ${postal}, España` : `${query}, España`;

			geocodeAddress(fullQuery, controller.signal)
				.then((result) => {
					if (controller.signal.aborted) return;
					if (!result) {
						geocodeStatus = 'not-found';
						return;
					}
					point = result.point;
					if (result.city) cityName = result.city;
					if (result.province) province = result.province;
					marker?.setLngLat([result.point.lng, result.point.lat]);
					map?.easeTo({ center: [result.point.lng, result.point.lat], zoom: 16 });
					geocodeStatus = 'found';
				})
				.catch((err: unknown) => {
					if (err instanceof DOMException && err.name === 'AbortError') return;
					geocodeStatus = 'error';
				});
		}, 700);
	});

	onDestroy(() => {
		clearTimeout(geocodeTimer);
		activeController?.abort();
		map?.remove();
	});
</script>

<div class="space-y-2">
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
	{#if geocodeStatus === 'loading'}
		<p class="flex items-center gap-1.5 text-xs text-ink-500">
			<span
				class="size-3 shrink-0 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600"
			></span>
			Buscando la dirección…
		</p>
	{:else if geocodeStatus === 'found'}
		<p class="text-xs text-brand-700">
			Marcador ajustado automáticamente a la dirección escrita. Puedes arrastrarlo para afinar.
		</p>
	{:else if geocodeStatus === 'not-found'}
		<p class="text-xs text-warning-700">
			No hemos encontrado esa dirección. Arrastra el marcador o toca el mapa para situarlo a mano.
		</p>
	{:else if geocodeStatus === 'error'}
		<p class="text-xs text-warning-700">
			No se ha podido buscar la dirección ahora mismo. Arrastra el marcador o toca el mapa para
			situarlo a mano.
		</p>
	{:else}
		<p class="text-xs text-ink-400">
			Escribe la dirección y ciudad, o arrastra el marcador y toca el mapa para ajustar el punto
			exacto a mano.
		</p>
	{/if}
</div>
