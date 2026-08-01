/**
 * Única fuente de verdad para "a cuánto tiempo está una convocatoria",
 * usada por el mapa (filtros y color de marcador), el listado, las
 * tarjetas de evento y sus pruebas. Nunca se reimplementa esta lógica en
 * otro sitio — solo se formatea el resultado de forma distinta según el
 * contexto (`describeEventTiming` / `describeEventTimingForCard`).
 *
 * La categoría depende únicamente de la fecha real del evento
 * (`event.startAt`), nunca de `event.status` — un evento `modified` o
 * `cancelled` sigue clasificándose por cuándo ocurre, ese estado se
 * comunica aparte (badges, `EventStatusBanner`).
 */

export type EventTimeCategory = 'today' | 'this_week' | 'upcoming_weeks' | 'over_month' | 'past';

/** Categoría inválida cuando `startAt` no es una fecha ISO interpretable. */
export type EventTimeCategoryOrInvalid = EventTimeCategory | 'invalid';

export interface EventTimeCategoryResult {
	category: EventTimeCategoryOrInvalid;
	/** Días naturales (calendario, no de 24h) hasta el evento en `timeZone`. Negativo = pasado. `NaN` si `invalid`. */
	daysUntil: number;
}

const DEFAULT_TIME_ZONE = 'Europe/Madrid';

/**
 * Año/mes/día "civil" de `date` en `timeZone`, vía `Intl` — es lo único
 * fiable sin depender de una librería de fechas: `Intl.DateTimeFormat`
 * consulta la base tz real (IANA), así que el cambio de horario de verano
 * ya queda resuelto por el motor de JS, no hay que calcularlo a mano.
 */
function civilDateParts(
	date: Date,
	timeZone: string
): { year: number; month: number; day: number } {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Diferencia en días naturales entre dos fechas civiles, ancladas a
 * medianoche UTC para la resta (evita que un desfase de pocas horas por
 * DST convierta "mañana" en "en 0.96 días" y redondee mal con
 * `Math.floor`/`Math.round`).
 */
function civilDaysBetween(
	from: { year: number; month: number; day: number },
	to: { year: number; month: number; day: number }
): number {
	const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
	const toUtc = Date.UTC(to.year, to.month - 1, to.day);
	return Math.round((toUtc - fromUtc) / 86_400_000);
}

/**
 * Clasifica `eventDateIso` (fecha ISO tal como la devuelve Supabase, p. ej.
 * `event.startAt`) en una de las categorías temporales, en `timeZone`
 * (por defecto Europe/Madrid, como pide el producto — nunca la zona
 * horaria del navegador de quien mira el mapa).
 *
 * Límites exactos (en días desde HOY, ambos extremos incluidos):
 *   hoy = 0 · esta semana = 1–7 · próximas semanas = 8–30 · más de un mes > 30 · pasado < 0.
 */
export function getEventTimeCategory(
	eventDateIso: string,
	timeZone: string = DEFAULT_TIME_ZONE,
	now: Date = new Date()
): EventTimeCategoryResult {
	const eventDate = new Date(eventDateIso);
	if (Number.isNaN(eventDate.getTime())) {
		return { category: 'invalid', daysUntil: NaN };
	}

	const daysUntil = civilDaysBetween(
		civilDateParts(now, timeZone),
		civilDateParts(eventDate, timeZone)
	);

	let category: EventTimeCategory;
	if (daysUntil < 0) category = 'past';
	else if (daysUntil === 0) category = 'today';
	else if (daysUntil <= 7) category = 'this_week';
	else if (daysUntil <= 30) category = 'upcoming_weeks';
	else category = 'over_month';

	return { category, daysUntil };
}

/** Color de marcador/leyenda por categoría (nunca la única señal, ver componentes de mapa). */
export const TIME_CATEGORY_COLORS: Record<EventTimeCategory, string> = {
	today: '#dc2626', // rojo
	this_week: '#2563eb', // azul
	// Amarillo oscuro (no amarillo puro tipo #eab308/#facc15): sobre un mapa
	// claro y con el trazo blanco del marcador, un amarillo puro casi
	// desaparece. #ca8a04 sigue leyéndose claramente como "amarillo" pero
	// con contraste suficiente — nunca es la única señal de todos modos
	// (ver aria-label/tooltip/etiqueta en EventMap y la leyenda).
	upcoming_weeks: '#ca8a04',
	over_month: '#7c3aed', // morado
	past: '#9ca3af' // gris (solo relevante si se llega a listar "Finalizadas")
};

export const TIME_CATEGORY_LABELS: Record<EventTimeCategory, string> = {
	today: 'Hoy',
	this_week: 'Esta semana',
	upcoming_weeks: 'Próximas semanas',
	over_month: 'Más de un mes',
	past: 'Finalizada'
};

/** Texto corto para aria-label/tooltip/badge del marcador. Nunca depende solo del color. */
export function describeEventTiming(result: EventTimeCategoryResult): string {
	if (result.category === 'invalid') return 'Fecha no disponible';
	if (result.category === 'past') return 'Finalizada';
	if (result.category === 'today') return 'Hoy';
	if (result.daysUntil === 1) return 'Mañana';
	if (result.category === 'this_week' || result.category === 'upcoming_weeks') {
		return `En ${result.daysUntil} días`;
	}
	return 'Dentro de más de un mes';
}

/** Variante para la tarjeta de evento: semanas en vez de días a partir de "próximas semanas". */
export function describeEventTimingForCard(result: EventTimeCategoryResult): string {
	if (result.category === 'invalid') return 'Fecha no disponible';
	if (result.category === 'past') return 'Finalizada';
	if (result.category === 'today') return 'Hoy';
	if (result.daysUntil === 1) return 'Mañana';
	if (result.category === 'this_week') return `En ${result.daysUntil} días`;
	if (result.category === 'upcoming_weeks') {
		const weeks = Math.max(1, Math.round(result.daysUntil / 7));
		return `En ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
	}
	return 'Dentro de más de un mes';
}
