import { describe, expect, it } from 'vitest';
import {
	CEUTA_ESCENARIOS,
	CEUTA_ORDEN_MEDIDAS,
	calcularCIE,
	calendarioAcumulado,
	costeAnualMedida,
	meur,
	pesoMedidaPct,
	validarModeloEconomicoCeuta
} from './ceutaEconomicModel';

/**
 * Estos tests fijan la equivalencia PRE/POST del modelo económico de Plan
 * Ceuta: `PRE` es la tabla narrativa de `Plan-Ceuta-Borrador-0.1.md` §11 y
 * las hojas del `.xlsx` (transcritas literalmente en los comentarios de
 * cada test); `POST` es lo que calcula este módulo tipado a partir de los
 * mismos datos. Cualquier divergencia futura debe fallar aquí antes de
 * llegar a un componente.
 */

describe('ceutaEconomicModel — comprobaciones automáticas (equivalente a la hoja "Comprobaciones" del Excel)', () => {
	it('los 3 escenarios pasan todas las comprobaciones de coherencia', () => {
		const checks = validarModeloEconomicoCeuta();
		const fallidas = checks.filter((c) => !c.ok);
		expect(fallidas, JSON.stringify(fallidas, null, 2)).toEqual([]);
		expect(checks.length).toBeGreaterThan(0);
	});
});

describe('ceutaEconomicModel — resultado consolidado (md §11.1 / xlsx hoja Escenarios)', () => {
	it('escenario Bajo coincide con la tabla del borrador', () => {
		const bajo = CEUTA_ESCENARIOS.bajo;
		expect(meur(bajo.inversion)).toBe('46,6 M€');
		expect(meur(bajo.personal)).toBe('14,3 M€');
		expect(meur(bajo.totalAnual)).toBe('22,8 M€');
		expect(meur(bajo.gastoBruto)).toBe('140,3 M€');
		expect(meur(bajo.financiacionUE)).toBe('14,0 M€');
		expect(meur(bajo.costeEstatal)).toBe('126,3 M€');
	});

	it('escenario Central coincide con la tabla del borrador', () => {
		const central = CEUTA_ESCENARIOS.central;
		expect(meur(central.inversion)).toBe('88,1 M€');
		expect(meur(central.personal)).toBe('26,9 M€');
		expect(meur(central.otros)).toBe('21,7 M€');
		expect(meur(central.totalAnual)).toBe('48,6 M€');
		expect(meur(central.gastoBruto)).toBe('291,3 M€');
		expect(meur(central.financiacionUE)).toBe('64,0 M€');
		expect(meur(central.costeEstatal)).toBe('227,2 M€');
		expect(meur(central.reserva)).toBe('10,0 M€');
	});

	it('escenario Alto coincide con la tabla del borrador', () => {
		const alto = CEUTA_ESCENARIOS.alto;
		expect(meur(alto.inversion)).toBe('156,7 M€');
		expect(meur(alto.gastoBruto)).toBe('606,0 M€');
		expect(meur(alto.financiacionUE)).toBe('214,2 M€');
		expect(meur(alto.costeEstatal)).toBe('391,8 M€');
	});
});

describe('ceutaEconomicModel — escenario Central por medida (md §11.2)', () => {
	it.each([
		['M1', 4.5, 1.6, 1.2, 2.8],
		['M2', 17.4, 2.9, 1.7, 4.6],
		['M3', 8.5, 7.7, 1.2, 8.9],
		['M4', 0.4, 0.4, 0.3, 0.7],
		['M5', 1.9, 1.0, 7.9, 8.9],
		['M6', 11.0, 1.9, 1.7, 3.6],
		['M7', 36.9, 9.6, 5.2, 14.8],
		['M8', 4.0, 0.9, 1.8, 2.6]
	] as const)(
		'%s: inversión %s M€, personal %s M€, otros %s M€, total anual %s M€',
		(id, inv, personal, otros, total) => {
			const m = CEUTA_ESCENARIOS.central.medidas[id];
			expect(Number(meur(m.inv).replace(' M€', '').replace(',', '.'))).toBeCloseTo(inv, 1);
			expect(Number(meur(m.personal).replace(' M€', '').replace(',', '.'))).toBeCloseTo(
				personal,
				1
			);
			expect(Number(meur(m.otros).replace(' M€', '').replace(',', '.'))).toBeCloseTo(otros, 1);
			expect(costeAnualMedida(CEUTA_ESCENARIOS.central, id)).toBeCloseTo(total, 1);
		}
	);

	it('el total de la tabla por medida coincide con los totales del escenario', () => {
		const central = CEUTA_ESCENARIOS.central;
		const sumaInv = CEUTA_ORDEN_MEDIDAS.reduce((s, id) => s + central.medidas[id].inv, 0);
		const sumaTotalAnual = CEUTA_ORDEN_MEDIDAS.reduce(
			(s, id) => s + costeAnualMedida(central, id),
			0
		);
		expect(sumaInv).toBeCloseTo(central.inversion, 2);
		expect(sumaTotalAnual).toBeCloseTo(central.totalAnual, 2);
	});

	it('el peso porcentual de todas las medidas suma 100%', () => {
		const central = CEUTA_ESCENARIOS.central;
		const sumaPct = CEUTA_ORDEN_MEDIDAS.reduce((s, id) => s + pesoMedidaPct(central, id), 0);
		expect(sumaPct).toBeCloseTo(100, 1);
	});
});

describe('ceutaEconomicModel — calendario presupuestario central (md §11.5)', () => {
	it.each([
		[2026, 22.5, 11.8, 34.3],
		[2027, 25.7, 35.7, 61.4],
		[2028, 21.6, 35.7, 57.3],
		[2029, 11.2, 35.7, 46.9],
		[2030, 7.0, 35.7, 42.7],
		[2031, 0.0, 48.6, 48.6]
	])('%s: inversión %s M€, operación %s M€, total %s M€', (anio, inv, op, total) => {
		const fila = CEUTA_ESCENARIOS.central.calendario.find((a) => a.anio === anio);
		expect(fila).toBeDefined();
		expect(fila!.inv).toBeCloseTo(inv, 1);
		expect(fila!.op).toBeCloseTo(op, 1);
		expect(fila!.inv + fila!.op).toBeCloseTo(total, 1);
	});

	it('el acumulado 2026–2031 coincide con el total de la tabla (88,1 / 203,2 / 291,3 M€)', () => {
		const acumulado = calendarioAcumulado(CEUTA_ESCENARIOS.central);
		expect(acumulado.inv).toBeCloseTo(88.1, 1);
		expect(acumulado.op).toBeCloseTo(203.2, 1);
		expect(acumulado.total).toBeCloseTo(291.3, 1);
	});
});

describe('ceutaEconomicModel — fórmula del CIE (md §11.4)', () => {
	it('Central: 250 plazas → inversión CIE ≈ 27,9 M€, CATE ≈ 9,0 M€, Medida 7 total 36,9 M€', () => {
		const cie = calcularCIE(CEUTA_ESCENARIOS.central);
		expect(cie.total).toBeCloseTo(27.9, 1);
		expect(cie.cate).toBeCloseTo(9.0, 1);
		expect(cie.totalMedida7).toBeCloseTo(36.9, 1);
	});

	it('la fórmula respeta el orden de operaciones: la contingencia multiplica UNA vez a (base + fijos + suelo), nunca solo al suelo', () => {
		const esc = CEUTA_ESCENARIOS.alto; // único escenario con suelo > 0
		const c = esc.cie;
		const base = c.plazas * c.base * c.cpi * c.logistica * c.alcance;
		const esperado =
			((base + c.fijos * 1_000_000 + c.suelo * 1_000_000) * (1 + c.contingencia)) / 1_000_000;
		expect(calcularCIE(esc).total).toBeCloseTo(esperado, 6);
	});

	it('a mayor escenario, mayor inversión de CIE (monotonía Bajo < Central < Alto)', () => {
		const bajo = calcularCIE(CEUTA_ESCENARIOS.bajo).total;
		const central = calcularCIE(CEUTA_ESCENARIOS.central).total;
		const alto = calcularCIE(CEUTA_ESCENARIOS.alto).total;
		expect(bajo).toBeLessThan(central);
		expect(central).toBeLessThan(alto);
	});
});

describe('meur — formato monetario', () => {
	it('usa coma decimal y un decimal fijo, con sufijo M€', () => {
		expect(meur(88.085081)).toBe('88,1 M€');
		expect(meur(0)).toBe('0,0 M€');
	});
});
