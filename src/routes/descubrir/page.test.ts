import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Prueba de integración de `/descubrir` (OPT-1, rendimiento/03): confirma
 * que la carga SSR de la página ya NO dispara las 2 llamadas redundantes
 * que hacía `getPublicStats()` al volver a pedir `listPublicEvents()` por
 * su cuenta. El mock cubre el mismo cliente Supabase que comparten
 * `eventsService.ts` y `organizersService.ts`, para poder contar de verdad
 * cuántas operaciones dispara una carga completa de la página.
 */
const { fromMock, rpcMock, state } = vi.hoisted(() => {
	const state: {
		eventRows: unknown[];
		attendance: unknown[];
		organizerRows: unknown[];
		eventsError: { message: string } | null;
	} = { eventRows: [], attendance: [], organizerRows: [], eventsError: null };

	function thenableBuilder(getResult: () => { data: unknown; error: unknown }) {
		const builder: {
			select: () => typeof builder;
			not: () => typeof builder;
			order: () => typeof builder;
			then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => unknown;
		} = {
			select: () => builder,
			not: () => builder,
			order: () => builder,
			then: (resolve, reject) => Promise.resolve(getResult()).then(resolve, reject)
		};
		return builder;
	}

	const fromMock = vi.fn((table: string) => {
		if (table === 'events') {
			return thenableBuilder(() => ({ data: state.eventRows, error: state.eventsError }));
		}
		if (table === 'organizers') {
			return thenableBuilder(() => ({ data: state.organizerRows, error: null }));
		}
		throw new Error(`from(${table}) inesperado en este test`);
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

import { load } from './+page';

type LoadResult = { events: unknown[]; organizers: unknown[]; stats: unknown };

async function runLoad(): Promise<LoadResult> {
	return (load as unknown as () => Promise<LoadResult>)();
}

const FUTURE_A = new Date(Date.now() + 7 * 86_400_000).toISOString();
const FUTURE_B = new Date(Date.now() + 14 * 86_400_000).toISOString();

function eventRow(id: string, startAt: string) {
	return {
		id,
		slug: id,
		title: 'Evento',
		description: 'Descripción',
		objective: 'Objetivo',
		category: 'marcha',
		themes: ['vivienda'],
		custom_theme_label: null,
		status: 'published',
		status_note: null,
		start_at: startAt,
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
		updated_at: '2026-01-02T00:00:00.000Z'
	};
}

const organizerRow = {
	id: 'org-1',
	display_name: 'Asociación de prueba',
	kind: 'asociacion',
	bio: null,
	contact_email: null,
	website: null,
	avatar_url: null,
	published_events_count: 2,
	created_at: '2026-01-01T00:00:00.000Z'
};

beforeEach(() => {
	fromMock.mockClear();
	rpcMock.mockClear();
	state.eventRows = [];
	state.attendance = [];
	state.organizerRows = [];
	state.eventsError = null;
});

// C — /descubrir ya no duplica operaciones: exactamente 3 cuando hay eventos
// (events + attendance + organizers), ninguna repetida.
describe('/descubrir +page.ts load() — sin duplicar operaciones (OPT-1)', () => {
	it('con eventos: exactamente 3 operaciones Supabase (antes hasta 5) — events×1, attendance×1, organizers×1', async () => {
		state.eventRows = [eventRow('evt-1', FUTURE_A), eventRow('evt-2', FUTURE_B)];
		state.attendance = [
			{ event_id: 'evt-1', going_count: 3, interested_count: 2 },
			{ event_id: 'evt-2', going_count: 1, interested_count: 1 }
		];
		state.organizerRows = [organizerRow];

		const result = await runLoad();

		const eventsCalls = fromMock.mock.calls.filter((c) => c[0] === 'events').length;
		const organizersCalls = fromMock.mock.calls.filter((c) => c[0] === 'organizers').length;
		expect(eventsCalls).toBe(1);
		expect(organizersCalls).toBe(1);
		expect(rpcMock).toHaveBeenCalledTimes(1);

		const totalOps = fromMock.mock.calls.length + rpcMock.mock.calls.length;
		expect(totalOps).toBe(3);

		expect(result.events).toHaveLength(2);
		expect(result.organizers).toHaveLength(1);
		expect(result.stats).toEqual({ eventCount: 2, estimatedAttendance: 3 + 2 + 1 + 1 });
	});

	// D — estado vacío: exactamente 2 operaciones (antes hasta 3), sin RPC.
	it('sin eventos: exactamente 2 operaciones Supabase (antes hasta 3), sin llamar al RPC de asistencia', async () => {
		state.eventRows = [];
		state.organizerRows = [organizerRow];

		const result = await runLoad();

		const totalOps = fromMock.mock.calls.length + rpcMock.mock.calls.length;
		expect(totalOps).toBe(2);
		expect(rpcMock).not.toHaveBeenCalled();

		expect(result.events).toEqual([]);
		expect(result.organizers).toHaveLength(1);
		expect(result.stats).toEqual({ eventCount: 0, estimatedAttendance: 0 });
	});

	// E — un error real en la consulta de eventos se sigue propagando (nunca
	// se traga ni deja pasar una página con datos parciales/inventados).
	it('si listPublicEvents falla, load() rechaza y no muestra estadísticas aproximadas', async () => {
		state.eventsError = { message: 'db down' };
		state.organizerRows = [organizerRow];

		await expect(runLoad()).rejects.toMatchObject({ message: 'db down' });
	});
});
