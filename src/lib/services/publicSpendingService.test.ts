import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, operations, rowsByTable } = vi.hoisted(() => {
	type Operation = {
		table: string;
		method: 'select' | 'eq' | 'order' | 'limit';
		args: unknown[];
	};
	type QueryResult = { data: unknown[]; error: null };
	type Resolve = (value: QueryResult) => unknown;
	type Reject = (reason: unknown) => unknown;
	interface Builder {
		select: (...args: unknown[]) => Builder;
		eq: (...args: unknown[]) => Builder;
		order: (...args: unknown[]) => Builder;
		limit: (...args: unknown[]) => Builder;
		then: (resolve: Resolve, reject?: Reject) => Promise<unknown>;
	}

	const operations: Operation[] = [];
	const rowsByTable: Record<string, unknown[]> = {};

	function builderFor(table: string): Builder {
		const builder: Builder = {
			select: (...args) => {
				operations.push({ table, method: 'select', args });
				return builder;
			},
			eq: (...args) => {
				operations.push({ table, method: 'eq', args });
				return builder;
			},
			order: (...args) => {
				operations.push({ table, method: 'order', args });
				return builder;
			},
			limit: (...args) => {
				operations.push({ table, method: 'limit', args });
				return builder;
			},
			then: (resolve, reject) =>
				Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(resolve, reject)
		};
		return builder;
	}

	return {
		fromMock: vi.fn((table: string) => builderFor(table)),
		operations,
		rowsByTable
	};
});

vi.mock('$lib/supabase/client', () => ({
	supabase: { from: fromMock }
}));

import {
	getPublicSpendingInvestigation,
	listPublicSpendingNavigationItems
} from './publicSpendingService';

beforeEach(() => {
	fromMock.mockClear();
	operations.splice(0);
	for (const table of Object.keys(rowsByTable)) delete rowsByTable[table];
});

describe('public spending detail queries', () => {
	it('filtra por slug la ficha y todas sus relaciones', async () => {
		const slug = 'renoinn-2-energia-renovable-2026';

		await expect(getPublicSpendingInvestigation(slug)).resolves.toBeUndefined();

		expect(fromMock.mock.calls.map(([table]) => table)).toEqual([
			'public_spending_investigations',
			'public_spending_breakdown_items',
			'public_spending_sources',
			'public_spending_trace_steps',
			'public_spending_explainer_figures'
		]);
		expect(operations.filter(({ method }) => method === 'eq')).toEqual([
			{
				table: 'public_spending_investigations',
				method: 'eq',
				args: ['slug', slug]
			},
			...[
				'public_spending_breakdown_items',
				'public_spending_sources',
				'public_spending_trace_steps',
				'public_spending_explainer_figures'
			].map((table) => ({
				table,
				method: 'eq' as const,
				args: ['investigation_slug', slug]
			}))
		]);
	});

	it('carga una navegación ligera sin desgloses ni fuentes', async () => {
		rowsByTable.public_spending_investigations = [
			{ slug: 'caso-a', short_title: 'Caso A', sort_order: 2 }
		];

		await expect(listPublicSpendingNavigationItems()).resolves.toEqual([
			{ slug: 'caso-a', shortTitle: 'Caso A', sortOrder: 2 }
		]);
		expect(fromMock).toHaveBeenCalledTimes(1);
		expect(operations).toEqual([
			{
				table: 'public_spending_investigations',
				method: 'select',
				args: ['slug, short_title, sort_order']
			},
			{
				table: 'public_spending_investigations',
				method: 'order',
				args: ['sort_order']
			}
		]);
	});
});
