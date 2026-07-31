import type { GeoPoint } from '$lib/types';

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/** Distancia en kilómetros entre dos puntos usando la fórmula del haversine. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
	const R = 6371;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)} m`;
	return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}
