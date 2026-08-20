<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
	import type { FeatureCollection, Point as GeoJSONPoint } from 'geojson';
	import type { MunicipalIssue, MunicipalPetition } from '$lib/types';

	interface Props {
		issues: MunicipalIssue[];
		petitions: MunicipalPetition[];
		mode: 'issues' | 'petitions';
		onSelectIssue?: (issue: MunicipalIssue) => void;
		onSelectPetition?: (petition: MunicipalPetition) => void;
	}

	let {
		issues,
		petitions,
		mode,
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

			// Halo: es la "iluminación" del mapa. En Firmas crece con el número
			// de apoyos; en Problemas marca focos activos sin convertirlo en heatmap
			// opaco que tape la geografía.
			instance.addLayer({
				id: 'municipal-cluster-glow',
				type: 'circle',
				source: 'municipal-points',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': '#279583',
					'circle-opacity': 0.2,
					'circle-blur': 0.8,
					'circle-radius': [
						'interpolate',
						['linear'],
						['coalesce', ['get', 'totalWeight'], ['get', 'point_count']],
						1,
						22,
						100,
						38,
						1000,
						60,
						10000,
						82
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
					'circle-opacity': 0.27,
					'circle-blur': 0.82,
					'circle-radius': [
						'interpolate',
						['linear'],
						['get', 'weight'],
						1,
						18,
						100,
						28,
						1000,
						44,
						10000,
						68
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

	onDestroy(() => {
		map?.remove();
		map = undefined;
	});
</script>

<div class="relative overflow-hidden rounded-3xl border border-ink-100 bg-ink-100 shadow-card">
	<div bind:this={container} class="h-[64vh] min-h-[430px] w-full sm:h-[68vh]"></div>
	<div
		class="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-ink-600 shadow-sm backdrop-blur"
	>
		{mode === 'issues'
			? 'Cada luz = un problema documentado'
			: 'Más brillo = más apoyos ciudadanos'}
	</div>
</div>
