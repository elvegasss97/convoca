import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Mock del cliente Supabase, mismo patrón que `eventsService.test.ts`:
 * `vi.hoisted` porque `vi.mock` se eleva por encima de los imports. Aquí
 * solo interesa REGISTRAR qué llamadas `.eq()`/`.in()` hace `listConcerns`
 * sobre el builder, no simular datos reales — la barrera real vuelve a ser
 * RLS en Postgres, esto es solo la capa de conveniencia del cliente.
 */
const { fromMock, calls } = vi.hoisted(() => {
	const calls: { eq: [string, unknown][]; in: [string, unknown][] } = { eq: [], in: [] };

	const fromMock = vi.fn((table: string) => {
		if (table !== 'concerns') throw new Error(`from(${table}) inesperado en este test`);
		const builder: {
			select: () => typeof builder;
			order: () => typeof builder;
			eq: (col: string, val: unknown) => typeof builder;
			in: (col: string, val: unknown) => typeof builder;
			then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => unknown;
		} = {
			select: () => builder,
			order: () => builder,
			eq: (col, val) => {
				calls.eq.push([col, val]);
				return builder;
			},
			in: (col, val) => {
				calls.in.push([col, val]);
				return builder;
			},
			then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject)
		};
		return builder;
	});

	return { fromMock, calls };
});

vi.mock('$lib/supabase/client', () => ({
	supabase: { from: fromMock }
}));

import { listConcerns } from './concernsService';

beforeEach(() => {
	calls.eq.length = 0;
	calls.in.length = 0;
});

describe('listConcerns — filtro territorial tolerante a ambos nombres de Baleares', () => {
	it('filtra por comunidad_autonoma "Illes Balears" aceptando también filas con el nombre antiguo', async () => {
		await listConcerns({ scope: { type: 'comunidad_autonoma', value: 'Illes Balears' } });
		expect(calls.in).toContainEqual(['scope_value', ['Illes Balears', 'Islas Baleares']]);
		expect(calls.eq.some(([col]) => col === 'scope_value')).toBe(false);
	});

	it('sigue funcionando igual para una comunidad autónoma sin alias (Cataluña)', async () => {
		await listConcerns({ scope: { type: 'comunidad_autonoma', value: 'Cataluña' } });
		expect(calls.in).toContainEqual(['scope_value', ['Cataluña']]);
	});

	it('el ámbito provincia sigue usando igualdad estricta (sin alias territoriales conocidos a ese nivel)', async () => {
		await listConcerns({ scope: { type: 'provincia', value: 'Zaragoza' } });
		expect(calls.eq).toContainEqual(['scope_value', 'Zaragoza']);
		expect(calls.in).toEqual([]);
	});

	it('el ámbito nacional no filtra por scope_value', async () => {
		await listConcerns({ scope: { type: 'nacional' } });
		expect(calls.eq.some(([col]) => col === 'scope_value')).toBe(false);
		expect(calls.in).toEqual([]);
	});
});
