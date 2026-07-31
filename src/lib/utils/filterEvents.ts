import type { Event, EventFiltersState, GeoPoint } from '$lib/types';
import { matchesDateFilter } from './date';
import { distanceKm } from './geo';

/**
 * Filtrado puro de convocatorias, compartido entre la capa de servicios
 * (para la carga inicial en el `load` de la ruta) y la pantalla de Inicio
 * (para el filtrado instantáneo en cliente sin volver a pedir datos).
 */
export function filterEvents(
	events: Event[],
	filters: Partial<EventFiltersState>,
	origin?: GeoPoint
): Event[] {
	let results = events;

	if (filters.query) {
		const q = filters.query.trim().toLowerCase();
		results = results.filter(
			(e) =>
				e.title.toLowerCase().includes(q) ||
				e.description.toLowerCase().includes(q) ||
				e.meetingPoint.city.toLowerCase().includes(q)
		);
	}

	if (filters.date && filters.date !== 'any') {
		results = results.filter((e) => matchesDateFilter(e.startAt, filters.date!));
	}

	if (filters.categories && filters.categories.length > 0) {
		results = results.filter((e) => filters.categories!.includes(e.category));
	}

	if (filters.themes && filters.themes.length > 0) {
		results = results.filter((e) => e.themes.some((t) => filters.themes!.includes(t)));
	}

	if (filters.verifiedOnly) {
		results = results.filter((e) => e.verification.level !== 'none');
	}

	if (filters.distanceKm && origin) {
		const maxKm = filters.distanceKm;
		results = results.filter((e) => distanceKm(origin, e.meetingPoint.point) <= maxKm);
	}

	return [...results].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}
