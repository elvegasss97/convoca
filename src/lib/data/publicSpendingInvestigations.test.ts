import { describe, expect, it } from 'vitest';
import {
	publicSpendingBreakdownTotal,
	publicSpendingInvestigations,
	publicSpendingSourceCount
} from './publicSpendingInvestigations';

describe('publicSpendingInvestigations', () => {
	it('mantiene siete expedientes con slugs únicos y estados explícitos', () => {
		expect(publicSpendingInvestigations).toHaveLength(7);
		expect(new Set(publicSpendingInvestigations.map((item) => item.slug)).size).toBe(7);
		expect(new Set(publicSpendingInvestigations.map((item) => item.stage))).toEqual(
			new Set(['planificado', 'regulado', 'concedido', 'adjudicado'])
		);
	});

	it('enlaza únicamente fuentes oficiales http(s) y explica qué acredita cada una', () => {
		expect(publicSpendingSourceCount).toBeGreaterThanOrEqual(14);
		for (const investigation of publicSpendingInvestigations) {
			expect(investigation.sources.length).toBeGreaterThan(0);
			for (const source of investigation.sources) {
				expect(source.url).toMatch(/^https:\/\//);
				expect(source.organization.length).toBeGreaterThan(2);
				expect(source.whatItProves.length).toBeGreaterThan(20);
			}
		}
	});

	it('reconcilia los desgloses declarados exactos con su cifra principal', () => {
		const exactSlugs = new Set([
			'acogida-proteccion-internacional-2026-2027',
			'renoinn-2-renovables-innovadoras-2026',
			'hidrogeno-renovable-auctions-as-a-service-2026',
			'subvenciones-sociales-directas-2026',
			'renovacion-equipamiento-hosteleria-2026'
		]);

		for (const investigation of publicSpendingInvestigations.filter((item) =>
			exactSlugs.has(item.slug)
		)) {
			expect(publicSpendingBreakdownTotal(investigation)).toBeCloseTo(investigation.amount, 2);
		}
	});

	it('documenta de forma expresa los dos casos cuya cifra principal y desglose usan bases distintas', () => {
		const jaca = publicSpendingInvestigations.find(
			(item) => item.slug === 'variante-jaca-a21-a23-2026'
		);
		const reconstruction = publicSpendingInvestigations.find(
			(item) => item.slug === 'empleo-reconstruccion-andalucia-extremadura-2026'
		);

		expect(jaca?.amountApproximate).toBe(true);
		expect(jaca?.breakdownNote).toContain('sin IVA');
		expect(reconstruction).toBeDefined();
		expect(reconstruction!.amount - publicSpendingBreakdownTotal(reconstruction!)).toBe(2);
		expect(reconstruction?.breakdownNote).toContain('redondeo');
	});
});
