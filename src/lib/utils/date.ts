import type { DateFilter } from '$lib/types';

const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });
const dateFormatterShort = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const weekdayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
const timeFormatter = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export function formatEventDate(iso: string): string {
	return capitalize(dateFormatter.format(new Date(iso)));
}

export function formatEventDateShort(iso: string): string {
	return capitalize(dateFormatterShort.format(new Date(iso)));
}

export function formatEventWeekday(iso: string): string {
	return capitalize(weekdayFormatter.format(new Date(iso)));
}

export function formatEventTime(iso: string): string {
	return timeFormatter.format(new Date(iso));
}

export function formatDuration(minutes?: number): string | undefined {
	if (!minutes) return undefined;
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Comprueba si una fecha ISO cae dentro del rango elegido por el filtro de fecha. */
export function matchesDateFilter(
	iso: string,
	filter: DateFilter,
	now: Date = new Date()
): boolean {
	if (filter === 'any') return true;

	const target = new Date(iso);
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const diffDays = Math.floor((target.getTime() - startOfToday.getTime()) / 86_400_000);

	switch (filter) {
		case 'today':
			return diffDays === 0;
		case 'this_weekend': {
			const day = now.getDay(); // 0 domingo, 6 sábado
			const daysUntilSaturday = (6 - day + 7) % 7;
			const daysUntilSunday = daysUntilSaturday + 1;
			return diffDays === daysUntilSaturday || diffDays === daysUntilSunday;
		}
		case 'next_7_days':
			return diffDays >= 0 && diffDays <= 7;
		case 'next_30_days':
			return diffDays >= 0 && diffDays <= 30;
		default:
			return true;
	}
}

/** Formato relativo simple para el registro de decisiones de moderación. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
	const diffMs = now.getTime() - new Date(iso).getTime();
	const diffMin = Math.round(diffMs / 60_000);
	if (diffMin < 1) return 'ahora mismo';
	if (diffMin < 60) return `hace ${diffMin} min`;
	const diffHours = Math.round(diffMin / 60);
	if (diffHours < 24) return `hace ${diffHours} h`;
	const diffDays = Math.round(diffHours / 24);
	if (diffDays === 1) return 'ayer';
	if (diffDays < 30) return `hace ${diffDays} días`;
	return formatEventDate(iso);
}
