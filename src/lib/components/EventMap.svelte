<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
	import type { FeatureCollection, Point as GeoJSONPointGeometry } from 'geojson';
	import type { Event, GeoPoint, RouteLine } from '$lib/types';
	import { categoryLabels } from '$lib/labels';
	import { formatEventDateShort, formatEventTime } from '$lib/utils/date';

	interface Props {
		events: Event[];
		center?: GeoPoint;
		zoom?: number;
		heightClass?: string;
		route?: RouteLine;
		/**
		 * Encuadra el mapa a los puntos de `events` en vez de usar `center`/`zoom`
		 * fijos. Pensado para listados (p. ej. Inicio, donde `center` es la
		 * ciudad seleccionada arriba y puede no tener nada que ver con dónde
		 * están las convocatorias mostradas — bug real encontrado en staging:
		 * una convocatoria en Albacete no se veía con "Madrid" seleccionada,
		 * pese a que sí estaba en los datos). La página de detalle de una
		 * convocatoria (un único punto, siempre el suyo) no debe activarlo.
		 */
		fitToEvents?: boolean;
	}

	let {
		events,
		center,
		zoom = 5.6,
		heightClass = 'h-[60vh]',
		route,
		fitToEvents = false
	}: Props = $props();

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let ready = $state(false);

	function toGeoJSON(list: Event[]): FeatureCollection {
		return {
			type: 'FeatureCollection',
			features: list.map((e) => ({
				type: 'Feature',
				id: e.id,
				geometry: {
					type: 'Point',
					coordinates: [e.meetingPoint.point.lng, e.meetingPoint.point.lat]
				},
				properties: {
					id: e.id,
					slug: e.slug,
					title: e.title,
					city: e.meetingPoint.city,
					category: categoryLabels[e.category],
					startAt: e.startAt,
					going: e.attendance.going,
					verified: e.verification.level !== 'none'
				}
			}))
		};
	}

	function popupHTML(props: Record<string, string | number | boolean>): string {
		const verifiedBadge = props.verified
			? '<span class="inline-flex items-center gap-1 rounded-full bg-brand-100 text-brand-800 px-2 py-0.5 text-[11px] font-medium">Verificada</span>'
			: '';
		return `
			<div class="w-56 p-1 font-sans">
				<p class="text-[11px] font-medium text-brand-700 uppercase tracking-wide">${props.category}</p>
				<p class="mt-0.5 font-display text-sm font-semibold text-ink-900 leading-snug">${props.title}</p>
				<p class="mt-1 text-xs text-ink-500">${formatEventDateShort(String(props.startAt))} · ${formatEventTime(String(props.startAt))} · ${props.city}</p>
				<div class="mt-2 flex items-center justify-between">
					${verifiedBadge}
					<span class="text-xs text-ink-500">${props.going} voy</span>
				</div>
				<a href="/convocatorias/${props.slug}" class="mt-2 block rounded-full bg-brand-700 px-3 py-1.5 text-center text-xs font-semibold text-white">Ver convocatoria</a>
			</div>
		`;
	}

	onMount(async () => {
		if (!browser) return;
		const maplibregl = await import('maplibre-gl');

		const initialCenter = center ?? { lat: 40.2, lng: -3.6 };

		const instance = new maplibregl.Map({
			container,
			style: {
				version: 8,
				sources: {
					osm: {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution:
							'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
					}
				},
				layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
			},
			center: [initialCenter.lng, initialCenter.lat],
			zoom,
			attributionControl: { compact: true }
		});
		map = instance;

		instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

		instance.on('load', () => {
			if (route && route.points.length > 1) {
				instance.addSource('route', {
					type: 'geojson',
					data: {
						type: 'Feature',
						properties: {},
						geometry: { type: 'LineString', coordinates: route.points.map((p) => [p.lng, p.lat]) }
					}
				});
				instance.addLayer({
					id: 'route-line',
					type: 'line',
					source: 'route',
					layout: { 'line-join': 'round', 'line-cap': 'round' },
					paint: { 'line-color': '#dc6c25', 'line-width': 4, 'line-dasharray': [0.2, 1.6] }
				});
			}

			instance.addSource('events', {
				type: 'geojson',
				data: toGeoJSON(events),
				cluster: true,
				clusterMaxZoom: 13,
				clusterRadius: 48
			});

			instance.addLayer({
				id: 'clusters',
				type: 'circle',
				source: 'events',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': '#176056',
					'circle-opacity': 0.9,
					'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 15, 26],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}
			});

			instance.addLayer({
				id: 'cluster-count',
				type: 'symbol',
				source: 'events',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': ['get', 'point_count_abbreviated'],
					'text-font': ['Noto Sans Bold'],
					'text-size': 12
				},
				paint: { 'text-color': '#ffffff' }
			});

			instance.addLayer({
				id: 'unclustered-point',
				type: 'circle',
				source: 'events',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': '#dc6c25',
					'circle-radius': 8,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}
			});

			instance.on('click', 'clusters', (e) => {
				const features = instance.queryRenderedFeatures(e.point, { layers: ['clusters'] });
				const clusterId = features[0]?.properties?.cluster_id;
				const source = instance.getSource('events') as GeoJSONSource;
				if (clusterId === undefined) return;
				source.getClusterExpansionZoom(clusterId).then((z) => {
					const geometry = features[0].geometry as GeoJSONPointGeometry;
					instance.easeTo({
						center: geometry.coordinates as [number, number],
						zoom: z ?? zoom + 2
					});
				});
			});

			instance.on('click', 'unclustered-point', (e) => {
				const feature = e.features?.[0];
				if (!feature) return;
				const geometry = feature.geometry as GeoJSONPointGeometry;
				const coordinates = geometry.coordinates.slice() as [number, number];
				new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
					.setLngLat(coordinates)
					.setHTML(popupHTML(feature.properties as Record<string, string | number | boolean>))
					.addTo(instance);
			});

			for (const layerId of ['clusters', 'unclustered-point']) {
				instance.on('mouseenter', layerId, () => (instance.getCanvas().style.cursor = 'pointer'));
				instance.on('mouseleave', layerId, () => (instance.getCanvas().style.cursor = ''));
			}

			ready = true;
		});
	});

	$effect(() => {
		const list = events;
		if (!ready || !map) return;
		const source = map.getSource('events') as GeoJSONSource | undefined;
		source?.setData(toGeoJSON(list));

		if (!fitToEvents || list.length === 0) return;
		if (list.length === 1) {
			const p = list[0].meetingPoint.point;
			map.easeTo({ center: [p.lng, p.lat], zoom: 11.5, duration: 0 });
			return;
		}
		const lngs = list.map((e) => e.meetingPoint.point.lng);
		const lats = list.map((e) => e.meetingPoint.point.lat);
		map.fitBounds(
			[
				[Math.min(...lngs), Math.min(...lats)],
				[Math.max(...lngs), Math.max(...lats)]
			],
			{ padding: 48, maxZoom: 12, duration: 0 }
		);
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<div
	bind:this={container}
	class={`w-full ${heightClass} bg-ink-100`}
	role="application"
	aria-label="Mapa de convocatorias"
></div>
