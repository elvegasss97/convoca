import { describe, expect, it } from 'vitest';
import {
	getEventTimeCategory,
	describeEventTiming,
	describeEventTimingForCard
} from './eventTiming';

// Ancla fija en Europe/Madrid para que las pruebas no dependan del día en
// que se ejecuten. 2026-03-15 es CET/CEST-neutral a propósito (lejos de
// cualquier cambio de horario), los casos de DST se prueban aparte.
const FIXED_NOW = new Date('2026-03-15T10:00:00Z');

function iso(daysFromNow: number, hour = 12): string {
	const d = new Date(FIXED_NOW);
	d.setUTCDate(d.getUTCDate() + daysFromNow);
	d.setUTCHours(hour, 0, 0, 0);
	return d.toISOString();
}

describe('getEventTimeCategory — límites exactos', () => {
	it('hoy (0 días) -> today', () => {
		expect(getEventTimeCategory(iso(0), 'Europe/Madrid', FIXED_NOW).category).toBe('today');
	});

	it('mañana (1 día) -> this_week', () => {
		expect(getEventTimeCategory(iso(1), 'Europe/Madrid', FIXED_NOW).category).toBe('this_week');
	});

	it('4 días -> this_week (azul)', () => {
		const result = getEventTimeCategory(iso(4), 'Europe/Madrid', FIXED_NOW);
		expect(result.category).toBe('this_week');
	});

	it('7 días (límite superior de esta semana) -> this_week', () => {
		expect(getEventTimeCategory(iso(7), 'Europe/Madrid', FIXED_NOW).category).toBe('this_week');
	});

	it('8 días (límite inferior de próximas semanas) -> upcoming_weeks', () => {
		expect(getEventTimeCategory(iso(8), 'Europe/Madrid', FIXED_NOW).category).toBe(
			'upcoming_weeks'
		);
	});

	it('15 días -> upcoming_weeks (amarillo)', () => {
		expect(getEventTimeCategory(iso(15), 'Europe/Madrid', FIXED_NOW).category).toBe(
			'upcoming_weeks'
		);
	});

	it('27 días -> upcoming_weeks (amarillo, no se queda sin clasificar entre 22 y 30)', () => {
		expect(getEventTimeCategory(iso(27), 'Europe/Madrid', FIXED_NOW).category).toBe(
			'upcoming_weeks'
		);
	});

	it('30 días (límite superior de próximas semanas) -> upcoming_weeks', () => {
		expect(getEventTimeCategory(iso(30), 'Europe/Madrid', FIXED_NOW).category).toBe(
			'upcoming_weeks'
		);
	});

	it('31 días (límite inferior de más de un mes) -> over_month', () => {
		expect(getEventTimeCategory(iso(31), 'Europe/Madrid', FIXED_NOW).category).toBe('over_month');
	});

	it('45 días -> over_month (morado)', () => {
		expect(getEventTimeCategory(iso(45), 'Europe/Madrid', FIXED_NOW).category).toBe('over_month');
	});

	it('ayer (-1 día) -> past', () => {
		expect(getEventTimeCategory(iso(-1), 'Europe/Madrid', FIXED_NOW).category).toBe('past');
	});
});

describe('getEventTimeCategory — casos límite', () => {
	it('fecha ISO inválida -> invalid, nunca lanza', () => {
		const result = getEventTimeCategory('no-es-una-fecha', 'Europe/Madrid', FIXED_NOW);
		expect(result.category).toBe('invalid');
		expect(Number.isNaN(result.daysUntil)).toBe(true);
	});

	it('cadena vacía -> invalid', () => {
		expect(getEventTimeCategory('', 'Europe/Madrid', FIXED_NOW).category).toBe('invalid');
	});

	it('cambio de año: 20 dic -> 5 ene sigue calculando bien los días', () => {
		const now = new Date('2026-12-20T12:00:00Z');
		const eventDate = '2027-01-05T12:00:00.000Z';
		const result = getEventTimeCategory(eventDate, 'Europe/Madrid', now);
		expect(result.daysUntil).toBe(16);
		expect(result.category).toBe('upcoming_weeks');
	});

	it('cambio de mes: 28 feb -> 3 mar (mismo año) calcula bien los días', () => {
		const now = new Date('2026-02-28T12:00:00Z');
		const eventDate = '2026-03-03T12:00:00.000Z';
		const result = getEventTimeCategory(eventDate, 'Europe/Madrid', now);
		expect(result.daysUntil).toBe(3);
		expect(result.category).toBe('this_week');
	});

	it('usa el día civil de Madrid, no la fecha UTC — mismo día civil aunque las fechas UTC difieran', () => {
		// now: 2026-06-15T22:00:00Z = 2026-06-16 00:00 en Madrid (CEST, verano, UTC+2).
		// event: 2026-06-16T21:00:00Z = 2026-06-16 23:00 en Madrid — mismo día civil
		// que "now" (16 de junio), aunque sus fechas UTC sean días distintos
		// (15 vs 16). Una comparación ingenua por fecha UTC daría 1 día; en
		// Madrid es el mismo día: "hoy".
		const now = new Date('2026-06-15T22:00:00Z');
		const event = '2026-06-16T21:00:00.000Z';
		const result = getEventTimeCategory(event, 'Europe/Madrid', now);
		expect(result.daysUntil).toBe(0);
		expect(result.category).toBe('today');
	});

	it('horario de verano: el salto de reloj de fin de marzo no descuadra el conteo de días', () => {
		// España cambia a verano el último domingo de marzo (2026: 29 de marzo).
		// Un evento 10 días después de una fecha justo antes del cambio debe
		// seguir contando 10 días exactos, no 9 ni 11 por la hora perdida.
		const now = new Date('2026-03-25T10:00:00Z');
		const eventDate = new Date('2026-04-04T10:00:00Z').toISOString();
		const result = getEventTimeCategory(eventDate, 'Europe/Madrid', now);
		expect(result.daysUntil).toBe(10);
	});

	it('usa Europe/Madrid por defecto sin pasar el parámetro', () => {
		const result = getEventTimeCategory(iso(0), undefined, FIXED_NOW);
		expect(result.category).toBe('today');
	});
});

describe('describeEventTiming / describeEventTimingForCard', () => {
	it('hoy', () => {
		const r = getEventTimeCategory(iso(0), 'Europe/Madrid', FIXED_NOW);
		expect(describeEventTiming(r)).toBe('Hoy');
		expect(describeEventTimingForCard(r)).toBe('Hoy');
	});

	it('mañana', () => {
		const r = getEventTimeCategory(iso(1), 'Europe/Madrid', FIXED_NOW);
		expect(describeEventTiming(r)).toBe('Mañana');
	});

	it('en N días dentro de esta semana', () => {
		const r = getEventTimeCategory(iso(4), 'Europe/Madrid', FIXED_NOW);
		expect(describeEventTiming(r)).toBe('En 4 días');
	});

	it('en N días dentro de próximas semanas (ejemplo del encargo: 18 días)', () => {
		const r = getEventTimeCategory(iso(18), 'Europe/Madrid', FIXED_NOW);
		expect(describeEventTiming(r)).toBe('En 18 días');
	});

	it('la tarjeta expresa próximas semanas en semanas, no en días', () => {
		const r = getEventTimeCategory(iso(15), 'Europe/Madrid', FIXED_NOW);
		expect(describeEventTimingForCard(r)).toMatch(/^En \d+ semanas?$/);
	});

	it('más de un mes', () => {
		const r = getEventTimeCategory(iso(45), 'Europe/Madrid', FIXED_NOW);
		expect(describeEventTiming(r)).toBe('Dentro de más de un mes');
		expect(describeEventTimingForCard(r)).toBe('Dentro de más de un mes');
	});

	it('pasado -> Finalizada', () => {
		const r = getEventTimeCategory(iso(-3), 'Europe/Madrid', FIXED_NOW);
		expect(describeEventTiming(r)).toBe('Finalizada');
	});

	it('inválida -> mensaje explícito, no una fecha inventada', () => {
		const r = getEventTimeCategory('fecha-mala', 'Europe/Madrid', FIXED_NOW);
		expect(describeEventTiming(r)).toBe('Fecha no disponible');
	});
});
