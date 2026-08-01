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

/**
 * Resuelve el área aproximada (bounding box) de un código postal español,
 * para usarla como filtro estricto (`bounded=1`) en `geocodeAddress`.
 *
 * Necesario porque el parámetro `postalcode` de Nominatim (o simplemente
 * añadirlo como texto a la query) es solo una pista débil, no un filtro
 * estricto: para nombres de calle genéricos o muy repetidos (p. ej. "Plaza
 * de la Constitución"), Nominatim lo ignora y devuelve el resultado de
 * mayor "importancia" global (a menudo en otra provincia), aunque el código
 * postal esté presente en la query. Comprobado en vivo: buscar solo el
 * código postal sí devuelve su área real de forma fiable (es una entidad
 * indexada directamente), así que resolvemos esa área primero y luego
 * acotamos la búsqueda de la calle a ese cuadro.
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
 * Geocodificación mediante la API pública de Nominatim (OpenStreetMap),
 * coherente con el resto de la app (ya usamos tiles e íconos de OSM).
 *
 * Si se pasa `bounds` (ver `geocodePostalCodeBounds`), la búsqueda queda
 * acotada estrictamente a ese cuadro (`bounded=1`): Nominatim solo puede
 * devolver resultados dentro de él, en vez de tratar la zona como una mera
 * sugerencia.
 *
 * Uso ligero, pensado para este prototipo: una petición por dirección, con
 * debounce en quien la llama (ver `MeetingPointPicker.svelte`) para respetar
 * la política de uso de Nominatim (máx. ~1 petición/segundo, nada de uso
 * masivo/automatizado). Para producción con más tráfico, conviene sustituir
 * esto por un proveedor con SLA o proxear Nominatim desde un backend propio
 * con caché.
 */
export async function geocodeAddress(
	query: string,
	signal?: AbortSignal,
	bounds?: GeoBounds
): Promise<GeocodeResult | null> {
	const url = new URL('https://nominatim.openstreetmap.org/search');
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('q', query);
	url.searchParams.set('limit', '1');
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
	if (!response.ok) return null;

	const results = (await response.json()) as Array<{
		lat: string;
		lon: string;
		display_name: string;
		address?: NominatimAddress;
	}>;
	const first = results[0];
	if (!first) return null;

	const addr = first.address;
	const city = addr?.city || addr?.town || addr?.village || addr?.municipality;
	const province = addr?.province || addr?.state || addr?.county;

	return {
		point: { lat: Number(first.lat), lng: Number(first.lon) },
		displayName: first.display_name,
		city,
		province
	};
}
