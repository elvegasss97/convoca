<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
	import type { FeatureCollection, Point as GeoJSONPoint } from 'geojson';
	import type { MunicipalIssue, MunicipalPetition } from '$lib/types';

	export interface MunicipalMapFocusRequest {
		id: string;
		lat: number;
		lng: number;
		nonce: number;
	}

	interface Props {
		issues: MunicipalIssue[];
		petitions: MunicipalPetition[];
		mode: 'issues' | 'petitions';
		focusRequest?: MunicipalMapFocusRequest | null;
		onSelectIssue?: (issue: MunicipalIssue) => void;
		onSelectPetition?: (petition: MunicipalPetition) => void;
	}

	let {
		issues,
		petitions,
		mode,
		focusRequest = null,
		onSelectIssue = () => undefined,
		onSelectPetition = () => undefined
	}: Props = $props();

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let ready = $state(false);

	function toGeoJSON(): FeatureCollection<GeoJSONPoint> {
		if (mode === 'issues') {
			return {
				type: 'FeatureCollection',
				features: issues.map((issue) => ({
					type: 'Feature',
					id: issue.id,
					geometry: { type: 'Point', coordinates: [issue.point.lng, issue.point.lat] },
					properties: {
						id: issue.id,
						kind: 'issue',
						municipality: issue.municipalityName,
						title: issue.title,
						status: issue.status,
						weight: 1
					}
				}))
			};
		}

		return {
			type: 'FeatureCollection',
			features: petitions.map((petition) => ({
				type: 'Feature',
				id: petition.id,
				geometry: { type: 'Point', coordinates: [petition.point.lng, petition.point.lat] },
				properties: {
					id: petition.id,
					kind: 'petition',
					municipality: petition.municipalityName,
					title: petition.title,
					status: petition.status,
					weight: Math.max(1, petition.supportCount)
				}
			}))
		};
	}

	function selectFeature(id: string) {
		if (mode === 'issues') {
			const issue = issues.find((item) => item.id === id);
			if (issue) onSelectIssue(issue);
			return;
		}
		const petition = petitions.find((item) => item.id === id);
		if (petition) onSelectPetition(petition);
	}

	onMount(async () => {
		if (!browser) return;
		const maplibregl = await import('maplibre-gl');
		maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');

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
				layers: [
					{
						id: 'osm',
						type: 'raster',
						source: 'osm',
						minzoom: 0,
						maxzoom: 19,
						paint: { 'raster-saturation': -0.62, 'raster-brightness-max': 0.96 }
					}
				]
			},
			center: [-3.65, 40.15],
			zoom: 5.15,
			minZoom: 4,
			maxZoom: 17,
			interactive: true,
			dragPan: true,
			scrollZoom: true,
			doubleClickZoom: true,
			boxZoom: true,
			touchZoomRotate: true,
			attributionControl: { compact: true }
		});
		map = instance;
		instance.dragPan.enable();
		instance.getCanvas().style.cursor = 'grab';
		instance.on('dragstart', () => {
			instance.getCanvas().style.cursor = 'grabbing';
		});
		instance.on('dragend', () => {
			instance.getCanvas().style.cursor = 'grab';
		});
		instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

		instance.on('load', () => {
			instance.addSource('municipal-points', {
				type: 'geojson',
				data: toGeoJSON(),
				cluster: true,
				clusterRadius: 46,
				clusterMaxZoom: 12,
				clusterProperties: {
					totalWeight: ['+', ['get', 'weight']]
				}
			});

			// Halo visible pero translúcido: debe leerse como una "luz" sin ocultar
			// la geografía. En Firmas aumenta con el número de apoyos.
			instance.addLayer({
				id: 'municipal-cluster-glow',
				type: 'circle',
				source: 'municipal-points',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': '#279583',
					'circle-opacity': 0.34,
					'circle-blur': 0.72,
					'circle-radius': [
						'interpolate',
						['linear'],
						['coalesce', ['get', 'totalWeight'], ['get', 'point_count']],
						1,
						28,
						100,
						44,
						1000,
						66,
						10000,
						88
					]
				}
			});

			instance.addLayer({
				id: 'municipal-clusters',
				type: 'circle',
				source: 'municipal-points',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': '#176056',
					'circle-opacity': 0.94,
					'circle-radius': ['step', ['get', 'point_count'], 15, 5, 19, 20, 24, 100, 29],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}
			});

			instance.addLayer({
				id: 'municipal-cluster-count',
				type: 'symbol',
				source: 'municipal-points',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': ['get', 'point_count_abbreviated'],
					'text-font': ['Noto Sans Bold'],
					'text-size': 12
				},
				paint: { 'text-color': '#ffffff' }
			});

			instance.addLayer({
				id: 'municipal-point-glow',
				type: 'circle',
				source: 'municipal-points',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': '#43b29e',
					'circle-opacity': 0.42,
					'circle-blur': 0.7,
					'circle-radius': [
						'interpolate',
						['linear'],
						['get', 'weight'],
						1,
						24,
						100,
						36,
						1000,
						52,
						10000,
						74
					]
				}
			});

			instance.addLayer({
				id: 'municipal-points',
				type: 'circle',
				source: 'municipal-points',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': [
						'match',
						['get', 'status'],
						'resolved',
						'#8a7a63',
						'in_action',
						'#dc6c25',
						'#176056'
					],
					'circle-radius': [
						'interpolate',
						['linear'],
						['get', 'weight'],
						1,
						8,
						100,
						11,
						1000,
						15,
						10000,
						20
					],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}
			});

			instance.addLayer({
				id: 'municipal-point-focus',
				type: 'circle',
				source: 'municipal-points',
				filter: ['==', ['get', 'id'], '__none__'],
				paint: {
					'circle-color': '#f97316',
					'circle-opacity': 0.14,
					'circle-radius': 17,
					'circle-stroke-width': 4,
					'circle-stroke-color': '#f97316',
					'circle-stroke-opacity': 0.95
				}
			});

			instance.on('click', 'municipal-points', (event) => {
				const feature = event.features?.[0];
				const id = feature?.properties?.id;
				if (typeof id === 'string') selectFeature(id);
			});

			instance.on('click', 'municipal-clusters', async (event) => {
				const feature = event.features?.[0];
				const clusterId = feature?.properties?.cluster_id;
				const coordinates = (feature?.geometry as GeoJSONPoint | undefined)?.coordinates;
				if (typeof clusterId !== 'number' || !coordinates) return;
				const source = instance.getSource('municipal-points') as GeoJSONSource;
				const zoom = await source.getClusterExpansionZoom(clusterId);
				instance.easeTo({ center: coordinates as [number, number], zoom });
			});

			for (const layer of ['municipal-points', 'municipal-clusters']) {
				instance.on('mouseenter', layer, () => {
					instance.getCanvas().style.cursor = 'pointer';
				});
				instance.on('mouseleave', layer, () => {
					instance.getCanvas().style.cursor = 'grab';
				});
			}

			ready = true;
		});
	});

	$effect(() => {
		// Referenciar las tres props hace que Svelte vuelva a ejecutar el efecto
		// cuando cambia vista o datos, y MapLibre recibe el nuevo GeoJSON sin
		// recrear el mapa (evita parpadeos y fugas de workers).
		void mode;
		void issues;
		void petitions;
		if (!ready || !map) return;
		const source = map.getSource('municipal-points') as GeoJSONSource | undefined;
		source?.setData(toGeoJSON());
	});

	$effect(() => {
		const request = focusRequest;
		if (!ready || !map) return;

		if (!request || mode !== 'issues') {
			map.setFilter('municipal-point-focus', ['==', ['get', 'id'], '__none__']);
			return;
		}

		// El nonce permite volver a enfocar el mismo problema si el usuario pulsa
		// su tarjeta más de una vez. El zoom 14 supera el nivel máximo de clusters,
		// así que siempre aterrizamos sobre el punto individual documentado.
		void request.nonce;
		map.setFilter('municipal-point-focus', ['==', ['get', 'id'], request.id]);
		map.flyTo({
			center: [request.lng, request.lat],
			zoom: Math.max(map.getZoom(), 14),
			duration: 850,
			essential: true
		});
	});

	onDestroy(() => {
		map?.remove();
		map = undefined;
	});
</script>

<div class="relative overflow-hidden rounded-3xl border border-ink-100 bg-ink-100 shadow-card">
	<div bind:this={container} class="h-[64vh] min-h-[430px] w-full sm:h-[68vh]"></div>
</div>

<style>
	/* Las fichas pertenecen a la página padre. Evitamos que vuelvan a flotar sobre
	   el mapa aunque conserven temporalmente sus utilidades Tailwind de posición. */
	:global(div.relative > article.absolute.top-3.left-3.z-10) {
		position: static !important;
		top: auto !important;
		left: auto !important;
		z-index: auto !important;
		width: 100% !important;
		margin-top: 0.75rem;
		backdrop-filter: none;
	}

	/* Si una vista no tiene aún elementos públicos, no mostramos una gran tarjeta
	   de estado vacío: el mapa queda como protagonista y completamente despejado. */
	:global(section.mt-8:has(> .border-dashed)) {
		display: none;
	}
</style>