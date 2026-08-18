import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Mismo patrón de mock que `concernsService.test.ts`/`eventsService.test.ts`:
 * `vi.hoisted` porque `vi.mock` se eleva por encima de los imports. Solo
 * interesa REGISTRAR qué columnas/filtros/valores usan las funciones de
 * moderación de Voz abierta — la barrera real vuelve a ser RLS +
 * `enforce_open_voice_contribution_update` en Postgres (0047), esto es solo
 * la capa de conveniencia del cliente.
 */
const { fromMock, calls, queueResult } = vi.hoisted(() => {
	const calls: {
		select: string[];
		eq: [string, unknown][];
		is: [string, unknown][];
		order: [string, unknown][];
		update: Record<string, unknown>[];
	} = { select: [], eq: [], is: [], order: [], update: [] };

	let nextResult: { data: unknown; error: unknown } = { data: [], error: null };

	const fromMock = vi.fn((table: string) => {
		if (table !== 'open_voice_contributions')
			throw new Error(`from(${table}) inesperado en este test`);
		const builder: {
			select: (cols: string) => typeof builder;
			eq: (col: string, val: unknown) => typeof builder;
			is: (col: string, val: unknown) => typeof builder;
			order: (col: string, opts: unknown) => typeof builder;
			update: (patch: Record<string, unknown>) => typeof builder;
			then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => unknown;
		} = {
			select: (cols) => {
				calls.select.push(cols);
				return builder;
			},
			eq: (col, val) => {
				calls.eq.push([col, val]);
				return builder;
			},
			is: (col, val) => {
				calls.is.push([col, val]);
				return builder;
			},
			order: (col, opts) => {
				calls.order.push([col, opts]);
				return builder;
			},
			update: (patch) => {
				calls.update.push(patch);
				return builder;
			},
			then: (resolve, reject) => Promise.resolve(nextResult).then(resolve, reject)
		};
		return builder;
	});

	return {
		fromMock,
		calls,
		queueResult: (result: { data: unknown; error: unknown }) => {
			nextResult = result;
		}
	};
});

vi.mock('$lib/supabase/client', () => ({
	supabase: { from: fromMock }
}));

import {
	listPendingOpenVoiceContributionsForModeration,
	setOpenVoiceModerationStatus
} from './openVoiceService';

beforeEach(() => {
	calls.select.length = 0;
	calls.eq.length = 0;
	calls.is.length = 0;
	calls.order.length = 0;
	calls.update.length = 0;
	queueResult({ data: [], error: null });
});

describe('listPendingOpenVoiceContributionsForModeration', () => {
	it('filtra por moderation_status=pending y excluye retiradas, sin exponer user_id', async () => {
		await listPendingOpenVoiceContributionsForModeration();
		expect(calls.eq).toContainEqual(['moderation_status', 'pending']);
		expect(calls.is).toContainEqual(['withdrawn_at', null]);
		expect(calls.select[0]).not.toContain('user_id');
		expect(calls.select[0]).toContain('moderation_status');
	});

	it('ordena por creación ascendente (cola: más antigua primero)', async () => {
		await listPendingOpenVoiceContributionsForModeration();
		expect(calls.order).toContainEqual(['created_at', { ascending: true }]);
	});

	it('mapea moderation_status de la fila a moderationStatus del dominio', async () => {
		queueResult({
			data: [
				{
					id: 'c1',
					content: 'contenido de prueba con longitud suficiente para pasar el check',
					scope_type: 'nacional',
					scope_value: null,
					scope_municipality_ine_code: null,
					status: 'recibida',
					moderation_status: 'pending',
					created_at: '2026-01-01T00:00:00Z',
					updated_at: '2026-01-01T00:00:00Z'
				}
			],
			error: null
		});
		const items = await listPendingOpenVoiceContributionsForModeration();
		expect(items).toEqual([expect.objectContaining({ id: 'c1', moderationStatus: 'pending' })]);
	});

	it('propaga el error de Supabase si la consulta falla', async () => {
		queueResult({ data: null, error: new Error('boom') });
		await expect(listPendingOpenVoiceContributionsForModeration()).rejects.toThrow();
	});
});

describe('setOpenVoiceModerationStatus', () => {
	it('actualiza EXCLUSIVAMENTE moderation_status — nunca contenido, ámbito ni autor', async () => {
		await setOpenVoiceModerationStatus('c1', 'approved');
		expect(calls.update).toEqual([{ moderation_status: 'approved' }]);
		expect(calls.eq).toContainEqual(['id', 'c1']);
	});

	it('acepta los 3 estados de moderación que expone el panel', async () => {
		await setOpenVoiceModerationStatus('c1', 'flagged');
		await setOpenVoiceModerationStatus('c2', 'rejected');
		expect(calls.update).toEqual([
			{ moderation_status: 'flagged' },
			{ moderation_status: 'rejected' }
		]);
	});

	it('lanza un mensaje de error legible si Supabase rechaza la actualización', async () => {
		queueResult({ data: null, error: { message: 'permission denied' } });
		await expect(setOpenVoiceModerationStatus('c1', 'approved')).rejects.toThrow(
			'No se ha podido actualizar el estado de moderación.'
		);
	});
});
