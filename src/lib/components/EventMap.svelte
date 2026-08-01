<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
	import type { FeatureCollection, Point as GeoJSONPointGeometry } from 'geojson';
	import type { Event, GeoPoint, RouteLine } from '$lib/types';
	import { categoryLabels } from '$lib/labels';
	import { formatEventDateShort, formatEventTime } from '$lib/utils/date';
	import {
		getEventTimeCategory,
		describeEventTiming,
		TIME_CATEGORY_COLORS,
		type EventTimeCategory
	} from '$lib/utils/eventTiming';
	import MapLegend from '$lib/components/MapLegend.svelte';

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
		/** Oculta la leyenda de colores temporales — no aporta nada con un único punto (ficha de detalle). */
		showLegend?: boolean;
	}

	let {
		events,
		center,
		zoom = 5.6,
		heightClass = 'h-[60vh]',
		route,
		fitToEvents = false,
		showLegend = false
	}: Props = $props();

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let ready = $state(false);

	// Orden = proximidad temporal (0 = más próximo). Se guarda como
	// propiedad numérica para poder agregarla en los clusters
	// (`clusterProperties`, min/max) y también para el color individual vía
	// expresión `match`, sin recalcular nada en el propio estilo del mapa.
	const RANK_BY_CATEGORY: Record<EventTimeCategory, number> = {
		today: 0,
		this_week: 1,
		upcoming_weeks: 2,
		over_month: 3,
		past: 4
	};
	const CATEGORY_BY_RANK: EventTimeCategory[] = [
		'today',
		'this_week',
		'upcoming_weeks',
		'over_month',
		'past'
	];

	function toGeoJSON(list: Event[]): FeatureCollection {
		return {
			type: 'FeatureCollection',
			features: list.map((e) => {
				const timing = getEventTimeCategory(e.startAt);
				const category: EventTimeCategory =
					timing.category === 'invalid' ? 'past' : timing.category;
				return {
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
						verified: e.verification.level !== 'none',
						timeCategory: category,
						timeLabel: describeEventTiming(timing),
						timeRank: RANK_BY_CATEGORY[category]
					}
				};
			})
		};
	}

	function popupHTML(props: Record<string, string | number | boolean>): string {
		const verifiedBadge = props.verified
			? '<span class="inline-flex items-center gap-1 rounded-full bg-brand-100 text-brand-800 px-2 py-0.5 text-[11px] font-medium">Verificada</span>'
			: '';
		const timeColor = TIME_CATEGORY_COLORS[props.timeCategory as EventTimeCategory] ?? '#6b7280';
		return `
			<div class="w-56 p-1 font-sans">
				<p class="text-[11px] font-medium text-brand-700 uppercase tracking-wide">${props.category}</p>
				<p class="mt-0.5 font-display text-sm font-semibold text-ink-900 leading-snug">${props.title}</p>
				<p class="mt-1 text-xs text-ink-500">${formatEventDateShort(String(props.startAt))} · ${formatEventTime(String(props.startAt))} · ${props.city}</p>
				<div class="mt-1.5 flex items-center gap-1.5">
					<span class="inline-block size-2 rounded-full" style="background-color:${timeColor}"></span>
					<span class="text-xs font-medium text-ink-700">${props.timeLabel}</span>
				</div>
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
		// Dos bugs reales preexistentes encontrados en staging (nunca se había
		// verificado un build de producción con datos reales, solo el dev
		// server, que sí funciona de otra forma):
		//
		// 1. Rollup nunca emitía `maplibre-gl-worker.mjs` en la ruta que
		//    MapLibre pide por defecto — 404 silencioso. El mapa base (tiles
		//    raster) no lo necesita y se veía perfectamente normal, pero
		//    CUALQUIER marcador dependía de él para procesarse.
		// 2. Un intento de arreglo con `import(...?url)` (que sí resuelve la
		//    ruta del worker) no bastaba: el propio `maplibre-gl-worker.mjs`
		//    importa `./maplibre-gl-shared.mjs` con una ruta RELATIVA fija,
		//    de código propio del paquete que no reescribe Vite al copiar el
		//    worker como asset suelto — en tiempo de ejecución el worker
		//    pedía un `maplibre-gl-shared.mjs` que nunca se llegó a publicar,
		//    y el servidor devolvía el HTML de fallback de la SPA en su
		//    lugar. Chrome lo toleraba en silencio (por eso nunca se detectó
		//    en las pruebas); Firefox lo rechaza de forma estricta
		//    (`NS_ERROR_CORRUPTED_CONTENT`) — así se encontró de verdad.
		//
		// Arreglo: copiar ambos archivos EXACTOS del paquete instalado a
		// `static/vendor/`, uno junto al otro, para que la ruta relativa
		// interna del worker siga funcionando tal cual. Si se actualiza
		// `maplibre-gl`, hay que volver a copiar los dos desde
		// `node_modules/maplibre-gl/dist/`.
		maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');

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

		let hoverPopup: InstanceType<typeof maplibregl.Popup> | null = null;

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
				clusterRadius: 48,
				// Agregados por cluster: rango de proximidad temporal de sus
				// miembros. minRank decide el color (el evento más próximo en el
				// tiempo manda); si minRank !== maxRank, el cluster mezcla fechas
				// de categorías distintas (ver capa `cluster-mixed-indicator`).
				clusterProperties: {
					minRank: ['min', ['get', 'timeRank']],
					maxRank: ['max', ['get', 'timeRank']]
				}
			});

			const rankColorExpr: (string | number | unknown[])[] = ['match', ['get', 'minRank']];
			CATEGORY_BY_RANK.forEach((cat, rank) => {
				rankColorExpr.push(rank, TIME_CATEGORY_COLORS[cat]);
			});
			rankColorExpr.push(TIME_CATEGORY_COLORS.past);

			instance.addLayer({
				id: 'clusters',
				type: 'circle',
				source: 'events',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': rankColorExpr as never,
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

			// Anillo discontinuo alrededor de clusters que mezclan categorías
			// distintas — la indicación textual/visual de "fechas diferentes"
			// que pide el encargo, sin depender solo del color del relleno.
			instance.addLayer({
				id: 'cluster-mixed-indicator',
				type: 'circle',
				source: 'events',
				filter: ['all', ['has', 'point_count'], ['!=', ['get', 'minRank'], ['get', 'maxRank']]],
				paint: {
					'circle-color': 'rgba(0,0,0,0)',
					'circle-radius': ['+', ['step', ['get', 'point_count'], 16, 5, 20, 15, 26], 5],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#111827',
					'circle-stroke-opacity': 0.55
				}
			});

			const pointColorExpr: (string | number | unknown[])[] = ['match', ['get', 'timeCategory']];
			CATEGORY_BY_RANK.forEach((cat) => {
				pointColorExpr.push(cat, TIME_CATEGORY_COLORS[cat]);
			});
			pointColorExpr.push(TIME_CATEGORY_COLORS.past);

			instance.addLayer({
				id: 'unclustered-point',
				type: 'circle',
				source: 'events',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': pointColorExpr as never,
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
				hoverPopup?.remove();
				const geometry = feature.geometry as GeoJSONPointGeometry;
				const coordinates = geometry.coordinates.slice() as [number, number];
				new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
					.setLngLat(coordinates)
					.setHTML(popupHTML(feature.properties as Record<string, string | number | boolean>))
					.addTo(instance);
			});

			// Tooltip ligero al pasar el cursor (icono/etiqueta accesible además
			// del color — un marcador en un mapa renderizado en canvas no puede
			// llevar un aria-label real por elemento; esta es la vía práctica de
			// dar la misma información sin clic, y la ficha pública/tarjeta
			// siguen siendo la vía totalmente accesible en texto).
			instance.on('mouseenter', 'unclustered-point', (e) => {
				instance.getCanvas().style.cursor = 'pointer';
				const feature = e.features?.[0];
				if (!feature) return;
				const props = feature.properties as Record<string, string | number | boolean>;
				const geometry = feature.geometry as GeoJSONPointGeometry;
				hoverPopup = new maplibregl.Popup({
					closeButton: false,
					closeOnClick: false,
					maxWidth: '200px',
					offset: 12
				})
					.setLngLat(geometry.coordinates as [number, number])
					.setHTML(
						`<div class="p-0.5 font-sans text-xs"><p class="font-semibold text-ink-900">${props.title}</p><p class="text-ink-500">${props.timeLabel}</p></div>`
					)
					.addTo(instance);
			});
			instance.on('mouseleave', 'unclustered-point', () => {
				instance.getCanvas().style.cursor = '';
				hoverPopup?.remove();
				hoverPopup = null;
			});

			instance.on('mouseenter', 'clusters', () => (instance.getCanvas().style.cursor = 'pointer'));
			instance.on('mouseleave', 'clusters', () => (instance.getCanvas().style.cursor = ''));

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
			map.easeTo({ center: [p.lng, p.lat], zoom: 14.5, duration: 0 });
			return;
		}
		const lngs = list.map((e) => e.meetingPoint.point.lng);
		const lats = list.map((e) => e.meetingPoint.point.lat);
		map.fitBounds(
			[
				[Math.min(...lngs), Math.min(...lats)],
				[Math.max(...lngs), Math.max(...lats)]
			],
			{ padding: 48, maxZoom: 14.5, duration: 0 }
		);
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<div class="relative">
	<div
		bind:this={container}
		class={`w-full ${heightClass} bg-ink-100`}
		role="application"
		aria-label="Mapa de convocatorias, coloreadas por proximidad temporal"
	></div>
	{#if showLegend}
		<MapLegend />
	{/if}
</div>
