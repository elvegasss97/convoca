import type { GeoPoint } from '$lib/types';

export interface GeocodeResult {
	point: GeoPoint;
	displayName: string;
	/** Mejor estimación de ciudad/municipio y provincia a partir de la dirección encontrada. */
	city?: string;
	province?: string;
}

export interface GeoBounds {
	west: number;
	south: number;
	east: number;
	north: number;
}

interface NominatimAddress {
	city?: string;
	town?: string;
	village?: string;
	municipality?: string;
	county?: string;
	state?: string;
	province?: string;
}

interface NominatimResult {
	lat: string;
	lon: string;
	display_name: string;
	address?: NominatimAddress;
}

function toGeocodeResult(raw: NominatimResult): GeocodeResult {
	const addr = raw.address;
	const city = addr?.city || addr?.town || addr?.village || addr?.municipality;
	const province = addr?.province || addr?.state || addr?.county;
	return {
		point: { lat: Number(raw.lat), lng: Number(raw.lon) },
		displayName: raw.display_name,
		city,
		province
	};
}

/**
 * Resuelve el área aproximada (bounding box) de un código postal español,
 * para usarla como filtro estricto (`bounded=1`) al buscar sugerencias.
 *
 * Necesario porque el parámetro `postalcode` de Nominatim (o simplemente
 * añadirlo como texto a la query) es solo una pista débil, no un filtro
 * estricto: para nombres de calle genéricos o muy repetidos (p. ej. "Plaza
 * de la Constitución"), Nominatim lo ignora y devuelve el resultado de
 * mayor "importancia" global (a menudo en otra provincia), aunque el código
 * postal esté presente en la query. Comprobado en vivo: buscar solo el
 * código postal sí devuelve su área real de forma fiable (es una entidad
 * indexada directamente), así que resolvemos esa área primero y luego
 * acotamos la búsqueda a ese cuadro.
 */
export async function geocodePostalCodeBounds(
	postalCode: string,
	signal?: AbortSignal
): Promise<GeoBounds | null> {
	const url = new URL('https://nominatim.openstreetmap.org/search');
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('q', `${postalCode}, España`);
	url.searchParams.set('limit', '1');
	url.searchParams.set('countrycodes', 'es');

	const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
	if (!response.ok) return null;

	const results = (await response.json()) as Array<{
		boundingbox: [string, string, string, string];
	}>;
	const first = results[0];
	if (!first?.boundingbox) return null;

	const [south, north, west, east] = first.boundingbox.map(Number);
	return { west, south, east, north };
}

/**
 * Busca varias direcciones candidatas para que la persona elija la suya
 * (ver `AddressAutocomplete` dentro de `MeetingPointPicker.svelte`), en vez
 * de que el sistema adivine un único resultado "top 1". Ningún algoritmo de
 * desambiguación (código postal, ciudad escrita, orden de la query...) es
 * fiable al 100% con nombres de calle repetidos entre localidades — la
 * única forma correcta de acertar siempre es dejar que la persona
 * confirme, igual que en cualquier buscador de direcciones serio.
 *
 * Si se pasa `bounds` (ver `geocodePostalCodeBounds`), la búsqueda queda
 * acotada estrictamente a ese cuadro: Nominatim solo puede devolver
 * resultados dentro de él, en vez de tratar la zona como una mera
 * sugerencia. Reduce el ruido de la lista, pero sigue siendo la persona
 * quien elige, no el código.
 *
 * Uso ligero, pensado para este prototipo: debounce largo en quien llama
 * (ver `MeetingPointPicker.svelte`, ~700ms tras dejar de escribir, nunca
 * por pulsación) para respetar la política de uso de Nominatim (máx. ~1
 * petición/segundo, sin autocompletado agresivo). Para producción con más
 * tráfico, conviene sustituir esto por un proveedor con SLA (Mapbox,
 * LocationIQ, Google Places...) o proxear Nominatim desde un backend
 * propio con caché.
 */
export async function geocodeAddressSuggestions(
	query: string,
	signal?: AbortSignal,
	bounds?: GeoBounds,
	limit = 6
): Promise<GeocodeResult[]> {
	const url = new URL('https://nominatim.openstreetmap.org/search');
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('q', query);
	url.searchParams.set('limit', String(limit));
	// Restringido a España (no a una lista de ciudades): el buscador de
	// direcciones debe funcionar en cualquier punto del país.
	url.searchParams.set('countrycodes', 'es');
	url.searchParams.set('addressdetails', '1');
	if (bounds) {
		url.searchParams.set(
			'viewbox',
			`${bounds.west},${bounds.north},${bounds.east},${bounds.south}`
		);
		url.searchParams.set('bounded', '1');
	}

	const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
	if (!response.ok) return [];

	const results = (await response.json()) as NominatimResult[];
	return results.map(toGeocodeResult);
}
