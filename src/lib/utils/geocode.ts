import type { GeoPoint } from '$lib/types';

export interface GeocodeResult {
	point: GeoPoint;
	displayName: string;
	/** Mejor estimación de ciudad/municipio y provincia a partir de la dirección encontrada. */
	city?: string;
	province?: string;
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
 * Geocodificación mediante la API pública de Nominatim (OpenStreetMap),
 * coherente con el resto de la app (ya usamos tiles e íconos de OSM).
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
	signal?: AbortSignal
): Promise<GeocodeResult | null> {
	const url = new URL('https://nominatim.openstreetmap.org/search');
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('q', query);
	url.searchParams.set('limit', '1');
	// Restringido a España (no a una lista de ciudades): el buscador de
	// direcciones debe funcionar en cualquier punto del país.
	url.searchParams.set('countrycodes', 'es');
	url.searchParams.set('addressdetails', '1');

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
