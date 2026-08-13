import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Mock del cliente Supabase, compartido por todas las pruebas de este
 * archivo. `vi.hoisted` es necesario porque `vi.mock` se eleva por encima
 * de los imports: cualquier variable que su factory use tiene que crearse
 * en este bloque, no con un simple `let` más abajo (si no, TDZ).
 *
 * `state.eventsError` permite simular un fallo real de Supabase (prueba E).
 * `attachAttendance()` solo llama al RPC si `listPublicEvents()` devolvió
 * ≥1 fila (mismo comportamiento que en producción, ver eventsService.ts).
 */
const { fromMock, rpcMock, state } = vi.hoisted(() => {
	const state: {
		rows: unknown[];
		attendance: unknown[];
		eventsError: { message: string } | null;
	} = { rows: [], attendance: [], eventsError: null };

	const fromMock = vi.fn((table: string) => {
		if (table !== 'events') throw new Error(`from(${table}) inesperado en este test`);
		const builder: {
			select: () => typeof builder;
			not: () => typeof builder;
			order: () => typeof builder;
			then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => unknown;
		} = {
			select: () => builder,
			not: () => builder,
			order: () => builder,
			then: (resolve, reject) =>
				Promise.resolve({ data: state.rows, error: state.eventsError }).then(resolve, reject)
		};
		return builder;
	});

	const rpcMock = vi.fn(async (name: string) => {
		if (name !== 'get_attendance_counts') throw new Error(`rpc(${name}) inesperado en este test`);
		return { data: state.attendance, error: null };
	});

	return { fromMock, rpcMock, state };
});

vi.mock('$lib/supabase/client', () => ({
	supabase: { from: fromMock, rpc: rpcMock }
}));

import { assertOwnership, slugify, rowToEvent, OwnershipError, getPublicStats } from './eventsService';
import type { Event } from '$lib/types';

/**
 * Estas pruebas cubren la lógica pura de `eventsService.ts` (sin red): la
 * comprobación de propiedad y el mapeo de filas de Supabase al tipo
 * `Event`. La verificación real de que las políticas RLS de Postgres
 * bloquean a un usuario editando la convocatoria de otro (incluso llamando
 * directamente a la API, no solo desde la UI) se hizo en vivo contra el
 * proyecto de Supabase — ver el informe de pruebas de la Fase 14.
 */

describe('eventsService — assertOwnership', () => {
	it('no lanza si la cuenta es la propietaria', () => {
		expect(() => assertOwnership({ createdByUserId: 'user-a' }, 'user-a')).not.toThrow();
	});

	it('lanza OwnershipError si la cuenta no es la propietaria, aunque conozca el id', () => {
		expect(() => assertOwnership({ createdByUserId: 'user-a' }, 'user-b')).toThrow(OwnershipError);
	});
});

describe('eventsService — slugify', () => {
	it('normaliza acentos, espacios y mayúsculas', () => {
		expect(slugify('Concentración Vecinal, Día 1')).toBe('concentracion-vecinal-dia-1');
	});

	it('recorta guiones sobrantes al principio y al final', () => {
		expect(slugify('  ¡Marcha!  ')).toBe('marcha');
	});
});

describe('eventsService — rowToEvent', () => {
	it('convierte snake_case de la fila de Postgres a camelCase de Event, con los contadores de asistencia dados', () => {
		const row = {
			id: 'evt-1',
			slug: 'marcha-1',
			title: 'Marcha',
			description: 'Descripción',
			objective: 'Objetivo',
			category: 'marcha',
			themes: ['vivienda'],
			custom_theme_label: null,
			status: 'published',
			status_note: null,
			start_at: '2026-09-01T18:00:00.000Z',
			end_at: null,
			duration_minutes: 60,
			meeting_point: {
				point: { lat: 0, lng: 0 },
				label: 'Plaza',
				address: 'Calle 1',
				city: 'Madrid',
				province: 'Madrid'
			},
			route: null,
			organizer_id: 'org-1',
			created_by_user_id: 'user-1',
			verification: { level: 'none' },
			prior_communication: 'unknown',
			rules: ['Norma 1'],
			peaceful_declaration: true,
			cover_image_url: null,
			archived: false,
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-02T00:00:00.000Z'
		};

		const event = rowToEvent(row, { going: 3, interested: 5, isEstimate: true });

		expect(event.organizerId).toBe('org-1');
		expect(event.createdByUserId).toBe('user-1');
		expect(event.customThemeLabel).toBeUndefined();
		expect(event.attendance).toEqual({ going: 3, interested: 5, isEstimate: true });
	});
});

/**
 * `getPublicStats` — optimización OPT-1 (rendimiento/03): eliminar la
 * llamada duplicada a Supabase, dejando que reciba los `events` ya
 * obtenidos por un `listPublicEvents()` previo en la misma request en vez
 * de volver a pedirlos. Sin argumento mantiene el comportamiento público
 * original (los pide ella misma), para no romper ningún otro consumidor.
 */
describe('eventsService — getPublicStats', () => {
	const FUTURE_A = new Date(Date.now() + 7 * 86_400_000).toISOString(); // +7 días
	const FUTURE_B = new Date(Date.now() + 14 * 86_400_000).toISOString(); // +14 días
	const PAST = new Date(Date.now() - 7 * 86_400_000).toISOString(); // -7 días

	function baseRow(overrides: Record<string, unknown> = {}) {
		return {
			id: 'evt-1',
			slug: 'evt-1',
			title: 'Evento',
			description: 'Descripción',
			objective: 'Objetivo',
			category: 'marcha',
			themes: ['vivienda'],
			custom_theme_label: null,
			status: 'published',
			status_note: null,
			start_at: FUTURE_A,
			end_at: null,
			duration_minutes: 60,
			meeting_point: {
				point: { lat: 0, lng: 0 },
				label: 'Plaza',
				address: 'Calle 1',
				city: 'Madrid',
				province: 'Madrid'
			},
			route: null,
			organizer_id: 'org-1',
			created_by_user_id: 'user-1',
			verification: { level: 'none' },
			prior_communication: 'unknown',
			rules: [],
			peaceful_declaration: true,
			cover_image_url: null,
			archived: false,
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-02T00:00:00.000Z',
			...overrides
		};
	}

	// Fixture representativo: 2 convocatorias activas (futuras) + 1 ya pasada,
	// cada una con conteos de asistencia distintos — para que un fallo de
	// filtrado o de suma se note en el resultado, no se enmascare con ceros.
	const rowFuture1 = baseRow({ id: 'evt-future-1', start_at: FUTURE_A });
	const rowFuture2 = baseRow({ id: 'evt-future-2', start_at: FUTURE_B });
	const rowPast = baseRow({ id: 'evt-past', start_at: PAST });
	const fixtureRows = [rowFuture1, rowFuture2, rowPast];
	const fixtureAttendance = [
		{ event_id: 'evt-future-1', going_count: 3, interested_count: 2 },
		{ event_id: 'evt-future-2', going_count: 1, interested_count: 1 },
		{ event_id: 'evt-past', going_count: 100, interested_count: 100 } // debe excluirse
	];
	const EXPECTED = { eventCount: 2, estimatedAttendance: 3 + 2 + 1 + 1 };

	function fixtureEvents(): Event[] {
		return [
			rowToEvent(rowFuture1, { going: 3, interested: 2, isEstimate: true }),
			rowToEvent(rowFuture2, { going: 1, interested: 1, isEstimate: true }),
			rowToEvent(rowPast, { going: 100, interested: 100, isEstimate: true })
		];
	}

	beforeEach(() => {
		fromMock.mockClear();
		rpcMock.mockClear();
		state.rows = [];
		state.attendance = [];
		state.eventsError = null;
	});

	// A — PRE/POST equivalentes con el mismo fixture representativo.
	it('con events ya cargados (POST) da el mismo resultado que auto-consultando (PRE), sobre el mismo fixture', async () => {
		const postResult = await getPublicStats(fixtureEvents());

		state.rows = fixtureRows;
		state.attendance = fixtureAttendance;
		const preResult = await getPublicStats(); // sin argumento: ruta original, se auto-consulta

		expect(postResult).toEqual(EXPECTED);
		expect(preResult).toEqual(EXPECTED);
		expect(postResult).toEqual(preResult);
	});

	// B — no vuelve a consultar Supabase si recibe los datos ya cargados.
	it('con events ya cargados, NUNCA llama a supabase.from ni a supabase.rpc', async () => {
		await getPublicStats(fixtureEvents());

		expect(fromMock).not.toHaveBeenCalled();
		expect(rpcMock).not.toHaveBeenCalled();
	});

	it('sin argumento SÍ consulta Supabase (comportamiento público original preservado)', async () => {
		state.rows = fixtureRows;
		state.attendance = fixtureAttendance;

		await getPublicStats();

		expect(fromMock).toHaveBeenCalledWith('events');
		expect(rpcMock).toHaveBeenCalledWith('get_attendance_counts', {
			p_event_ids: ['evt-future-1', 'evt-future-2', 'evt-past']
		});
	});

	// D — estado vacío.
	it('con un array de events vacío, devuelve ceros sin llamar a Supabase', async () => {
		const result = await getPublicStats([]);

		expect(result).toEqual({ eventCount: 0, estimatedAttendance: 0 });
		expect(fromMock).not.toHaveBeenCalled();
		expect(rpcMock).not.toHaveBeenCalled();
	});

	// E — un error real de Supabase, en la ruta que sí consulta, sigue
	// propagándose (no se traga ni se convierte en una cifra aproximada).
	it('sin argumento, si Supabase devuelve error, lo propaga (nunca inventa una cifra)', async () => {
		state.eventsError = { message: 'db down' };

		await expect(getPublicStats()).rejects.toMatchObject({ message: 'db down' });
	});
});
