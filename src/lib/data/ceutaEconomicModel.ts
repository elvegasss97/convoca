/**
 * Modelo económico del Plan Ceuta (borrador 0.1).
 *
 * Fuente: `Plan-Ceuta-Modelo-Economico-Borrador-0.1.xlsx` (hojas Resumen,
 * Escenarios, Personal, Inversiones, Operacion, Calendario, Comprobaciones)
 * y `Plan-Ceuta-Borrador-0.1.md` (§11, "Marco económico preliminar cerrado
 * para revisión"). Las cifras de este archivo se verificaron por triple vía
 * antes de transcribirlas: la tabla narrativa del `.md`, las hojas del
 * `.xlsx` (convertidas a CSV con LibreOffice headless para comparación
 * exacta) y el bloque de datos JS embebido en
 * `Plan-Ceuta-Artifact-Final.html` (que ya declaraba haber sido contrastado
 * contra el mismo Excel). Las tres fuentes coincidieron a 6 decimales en
 * los tres escenarios — no se encontró ninguna discrepancia que resolver.
 *
 * No existe todavía una fuente estructurada en Supabase para este
 * presupuesto (mismo caso que Sanidad, ver `sanidadBudgetData.ts`): mientras
 * no se migre, este módulo tipado es la única fuente que consumen los
 * componentes de presupuesto, CIE y calendario de Plan Ceuta. Ningún
 * componente debe repetir estas cifras a mano.
 */

export type CeutaScenarioKey = 'bajo' | 'central' | 'alto';
export type CeutaMeasureId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'TRANS';

export const CEUTA_ORDEN_MEDIDAS: CeutaMeasureId[] = [
	'M1',
	'M2',
	'M3',
	'M4',
	'M5',
	'M6',
	'M7',
	'M8',
	'TRANS'
];

export const CEUTA_NOMBRES_MEDIDA: Record<CeutaMeasureId, string> = {
	M1: 'M1 · Mando y alerta temprana',
	M2: 'M2 · Frontera y rescate',
	M3: 'M3 · Unidad Fronteriza 24/7',
	M4: 'M4 · Cadena de decisión',
	M5: 'M5 · Retorno y readmisión',
	M6: 'M6 · Asilo y vulnerabilidad',
	M7: 'M7 · Infraestructura y CIE',
	M8: 'M8 · Protección de Ceuta',
	TRANS: 'Refuerzo transversal y judicial'
};

export interface CeutaScenarioMeta {
	key: CeutaScenarioKey;
	label: string;
	desc: string;
}

export const CEUTA_ESCENARIOS_META: CeutaScenarioMeta[] = [
	{
		key: 'bajo',
		label: 'Bajo',
		desc: 'Prueba de sensibilidad a la baja'
	},
	{
		key: 'central',
		label: 'Central',
		desc: 'Escenario recomendado para revisión'
	},
	{
		key: 'alto',
		label: 'Alto',
		desc: 'Prueba de sensibilidad al alza'
	}
];

export interface CeutaMeasureCost {
	inv: number;
	personal: number;
	otros: number;
}

export interface CeutaCalendarYear {
	anio: number;
	inv: number;
	op: number;
}

export interface CeutaCieParams {
	plazas: number;
	/** Referencia histórica 2020, €/plaza (obra del CIE de Algeciras: 21.003.071,39 € sin IVA / 500 plazas). Ancla comparable, no precio ofertable. */
	base: number;
	cpi: number;
	logistica: number;
	alcance: number;
	/** Costes fijos de proyecto, en M€. */
	fijos: number;
	/** Coste del suelo si no se cede a coste cero, en M€. */
	suelo: number;
	/** Fracción de contingencia (0.15 = 15%). */
	contingencia: number;
}

export interface CeutaScenario {
	key: CeutaScenarioKey;
	label: string;
	/** Todas las magnitudes monetarias están en M€ constantes de julio de 2026, salvo indicación contraria. */
	inversion: number;
	personal: number;
	otros: number;
	totalAnual: number;
	gastoBruto: number;
	financiacionUE: number;
	costeEstatal: number;
	/** Reserva anual de emergencia: techo contingente, excluido del gasto esperado. */
	reserva: number;
	medidas: Record<CeutaMeasureId, CeutaMeasureCost>;
	calendario: CeutaCalendarYear[];
	cie: CeutaCieParams;
}

export const CEUTA_ESCENARIOS: Record<CeutaScenarioKey, CeutaScenario> = {
	bajo: {
		key: 'bajo',
		label: 'Bajo',
		inversion: 46.606385,
		personal: 14.3177,
		otros: 8.531987,
		totalAnual: 22.849687,
		gastoBruto: 140.276252,
		financiacionUE: 14.00477,
		costeEstatal: 126.271482,
		reserva: 5.0,
		medidas: {
			M1: { inv: 2.7, personal: 0.8562, otros: 0.8 },
			M2: { inv: 8.9, personal: 1.602, otros: 0.578 },
			M3: { inv: 5.0, personal: 3.954, otros: 0.8 },
			M4: { inv: 0.2, personal: 0.2282, otros: 0.15 },
			M5: { inv: 1.0, personal: 0.5425, otros: 2.5 },
			M6: { inv: 6.0, personal: 0.9888, otros: 0.568 },
			M7: { inv: 19.006385, personal: 5.224, otros: 1.785987 },
			M8: { inv: 2.0, personal: 0.446, otros: 0.95 },
			TRANS: { inv: 1.8, personal: 0.476, otros: 0.4 }
		},
		calendario: [
			{ anio: 2026, inv: 12.230192, op: 5.397381 },
			{ anio: 2027, inv: 13.785766, op: 16.3557 },
			{ anio: 2028, inv: 11.336915, op: 16.3557 },
			{ anio: 2029, inv: 5.751915, op: 16.3557 },
			{ anio: 2030, inv: 3.501596, op: 16.3557 },
			{ anio: 2031, inv: 0, op: 22.849687 }
		],
		cie: {
			plazas: 150,
			base: 42006.14278,
			cpi: 1.2,
			logistica: 1.05,
			alcance: 1.1,
			fijos: 4.0,
			suelo: 0,
			contingencia: 0.1
		}
	},
	central: {
		key: 'central',
		label: 'Central',
		inversion: 88.085081,
		personal: 26.949,
		otros: 21.69972,
		totalAnual: 48.64872,
		gastoBruto: 291.261889,
		financiacionUE: 64.019503,
		costeEstatal: 227.242385,
		reserva: 10.0,
		medidas: {
			M1: { inv: 4.5, personal: 1.639, otros: 1.2 },
			M2: { inv: 17.386, personal: 2.907, otros: 1.72158 },
			M3: { inv: 8.5, personal: 7.74, otros: 1.2 },
			M4: { inv: 0.4, personal: 0.427, otros: 0.25 },
			M5: { inv: 1.9, personal: 1.036, otros: 7.9 },
			M6: { inv: 11.0, personal: 1.92, otros: 1.7072 },
			M7: { inv: 36.899081, personal: 9.59, otros: 5.17094 },
			M8: { inv: 4.0, personal: 0.85, otros: 1.75 },
			TRANS: { inv: 3.5, personal: 0.84, otros: 0.8 }
		},
		calendario: [
			{ anio: 2026, inv: 22.548572, op: 11.776967 },
			{ anio: 2027, inv: 25.72369, op: 35.68778 },
			{ anio: 2028, inv: 21.588324, op: 35.68778 },
			{ anio: 2029, inv: 11.249724, op: 35.68778 },
			{ anio: 2030, inv: 6.97477, op: 35.68778 },
			{ anio: 2031, inv: 0, op: 48.64872 }
		],
		cie: {
			plazas: 250,
			base: 42006.14278,
			cpi: 1.26,
			logistica: 1.15,
			alcance: 1.2,
			fijos: 6.0,
			suelo: 0,
			contingencia: 0.15
		}
	},
	alto: {
		key: 'alto',
		label: 'Alto',
		inversion: 156.732468,
		personal: 49.3496,
		otros: 56.598331,
		totalAnual: 105.947931,
		gastoBruto: 605.974057,
		financiacionUE: 214.186502,
		costeEstatal: 391.787555,
		reserva: 20.0,
		medidas: {
			M1: { inv: 7.0, personal: 2.798, otros: 1.8 },
			M2: { inv: 28.7, personal: 5.1504, otros: 3.848 },
			M3: { inv: 13.0, personal: 14.2425, otros: 1.8 },
			M4: { inv: 0.7, personal: 0.7665, otros: 0.4 },
			M5: { inv: 3.5, personal: 1.9152, otros: 24.75 },
			M6: { inv: 18.0, personal: 3.564, otros: 5.7875 },
			M7: { inv: 73.832468, personal: 17.904, otros: 13.412831 },
			M8: { inv: 6.5, personal: 1.497, otros: 3.4 },
			TRANS: { inv: 5.5, personal: 1.512, otros: 1.4 }
		},
		calendario: [
			{ anio: 2026, inv: 36.584974, op: 26.163258 },
			{ anio: 2027, inv: 43.254896, op: 79.2826 },
			{ anio: 2028, inv: 39.314741, op: 79.2826 },
			{ anio: 2029, inv: 22.619741, op: 79.2826 },
			{ anio: 2030, inv: 14.958117, op: 79.2826 },
			{ anio: 2031, inv: 0, op: 105.947931 }
		],
		cie: {
			plazas: 400,
			base: 42006.14278,
			cpi: 1.3,
			logistica: 1.25,
			alcance: 1.35,
			fijos: 8.0,
			suelo: 5.0,
			contingencia: 0.2
		}
	}
};

/**
 * Formateador único de M€: 1 decimal, separador de millares es-ES.
 * Único punto de formato para que cabecera, tabla y gráfico nunca diverjan.
 */
export function meur(n: number): string {
	return (
		new Intl.NumberFormat('es-ES', {
			useGrouping: true,
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(n) + ' M€'
	);
}

/** Coste anual total de una medida en un escenario (personal + otros). */
export function costeAnualMedida(escenario: CeutaScenario, id: CeutaMeasureId): number {
	const m = escenario.medidas[id];
	return m.personal + m.otros;
}

/** Peso porcentual de una medida sobre el coste anual maduro del escenario. */
export function pesoMedidaPct(escenario: CeutaScenario, id: CeutaMeasureId): number {
	return (costeAnualMedida(escenario, id) / escenario.totalAnual) * 100;
}

/** Inversión y operación acumuladas 2026–2031 del calendario de un escenario. */
export function calendarioAcumulado(escenario: CeutaScenario): {
	inv: number;
	op: number;
	total: number;
} {
	const inv = escenario.calendario.reduce((s, a) => s + a.inv, 0);
	const op = escenario.calendario.reduce((s, a) => s + a.op, 0);
	return { inv, op, total: inv + op };
}

export interface CeutaCieBreakdown {
	/** Inversión total del CIE, en M€. */
	total: number;
	/** Coste restante de la Medida 7 (CATE y primera atención), en M€. */
	cate: number;
	/** Total declarado de la Medida 7 (CIE + CATE), en M€. */
	totalMedida7: number;
	factorContingencia: number;
}

/**
 * Fórmula del CIE, idéntica a la del artifact de referencia:
 * (plazas × referencia por plaza × actualización IPC × logística × alcance
 *   + costes fijos + suelo) × (1 + contingencia).
 * La suma entre paréntesis se calcula primero; la contingencia multiplica
 * el conjunto una sola vez (nunca solo al suelo).
 */
export function calcularCIE(escenario: CeutaScenario): CeutaCieBreakdown {
	const c = escenario.cie;
	const base = c.plazas * c.base * c.cpi * c.logistica * c.alcance;
	const conFijos = base + c.fijos * 1_000_000 + c.suelo * 1_000_000;
	const totalEur = conFijos * (1 + c.contingencia);
	const total = totalEur / 1_000_000;
	const totalMedida7 = escenario.medidas.M7.inv;
	return {
		total,
		cate: totalMedida7 - total,
		totalMedida7,
		factorContingencia: 1 + c.contingencia
	};
}

/**
 * Comprobaciones automáticas de coherencia del modelo (equivalente tipado
 * a la hoja "Comprobaciones" del Excel, que debe mostrar OK en sus 10
 * controles antes de usar el modelo). Se ejecutan en un test dedicado
 * (`ceutaEconomicModel.test.ts`) — cualquier fallo aquí significa que el
 * modelo tipado se ha desincronizado de su fuente y NO debe usarse para
 * mostrar cifras públicas.
 */
export interface CeutaModelCheck {
	nombre: string;
	ok: boolean;
	detalle: string;
}

const EPS = 0.02; // tolerancia en M€ (20.000 €) para redondeos de origen

function approxEqual(a: number, b: number, eps = EPS): boolean {
	return Math.abs(a - b) <= eps;
}

export function validarModeloEconomicoCeuta(): CeutaModelCheck[] {
	const checks: CeutaModelCheck[] = [];

	for (const key of Object.keys(CEUTA_ESCENARIOS) as CeutaScenarioKey[]) {
		const esc = CEUTA_ESCENARIOS[key];

		const sumaInv = CEUTA_ORDEN_MEDIDAS.reduce((s, id) => s + esc.medidas[id].inv, 0);
		checks.push({
			nombre: `[${esc.label}] Suma de inversiones por medida = inversión inicial bruta`,
			ok: approxEqual(sumaInv, esc.inversion),
			detalle: `suma medidas ${sumaInv.toFixed(3)} vs ${esc.inversion.toFixed(3)}`
		});

		const sumaPersonal = CEUTA_ORDEN_MEDIDAS.reduce((s, id) => s + esc.medidas[id].personal, 0);
		checks.push({
			nombre: `[${esc.label}] Suma de personal por medida = personal anual`,
			ok: approxEqual(sumaPersonal, esc.personal),
			detalle: `suma medidas ${sumaPersonal.toFixed(3)} vs ${esc.personal.toFixed(3)}`
		});

		const sumaOtros = CEUTA_ORDEN_MEDIDAS.reduce((s, id) => s + esc.medidas[id].otros, 0);
		checks.push({
			nombre: `[${esc.label}] Suma de otros costes por medida = operación no personal`,
			ok: approxEqual(sumaOtros, esc.otros),
			detalle: `suma medidas ${sumaOtros.toFixed(3)} vs ${esc.otros.toFixed(3)}`
		});

		checks.push({
			nombre: `[${esc.label}] Coste anual maduro = personal + otros`,
			ok: approxEqual(esc.personal + esc.otros, esc.totalAnual),
			detalle: `${(esc.personal + esc.otros).toFixed(3)} vs ${esc.totalAnual.toFixed(3)}`
		});

		const acumulado = calendarioAcumulado(esc);
		checks.push({
			nombre: `[${esc.label}] Inversión acumulada del calendario = inversión inicial bruta`,
			ok: approxEqual(acumulado.inv, esc.inversion),
			detalle: `${acumulado.inv.toFixed(3)} vs ${esc.inversion.toFixed(3)}`
		});
		checks.push({
			nombre: `[${esc.label}] Gasto bruto 2026–2031 = inversión + operación del calendario`,
			ok: approxEqual(acumulado.total, esc.gastoBruto),
			detalle: `${acumulado.total.toFixed(3)} vs ${esc.gastoBruto.toFixed(3)}`
		});

		checks.push({
			nombre: `[${esc.label}] Coste estatal estimado = gasto bruto − financiación UE potencial`,
			ok: approxEqual(esc.gastoBruto - esc.financiacionUE, esc.costeEstatal),
			detalle: `${(esc.gastoBruto - esc.financiacionUE).toFixed(3)} vs ${esc.costeEstatal.toFixed(3)}`
		});
		checks.push({
			nombre: `[${esc.label}] Financiación UE potencial no supera el gasto bruto`,
			ok: esc.financiacionUE < esc.gastoBruto,
			detalle: `${esc.financiacionUE.toFixed(3)} < ${esc.gastoBruto.toFixed(3)}`
		});

		const cie = calcularCIE(esc);
		checks.push({
			nombre: `[${esc.label}] Fórmula del CIE: inversión CIE ≤ total de la Medida 7`,
			ok: cie.total <= esc.medidas.M7.inv + EPS && cie.cate >= -EPS,
			detalle: `CIE ${cie.total.toFixed(3)} + CATE ${cie.cate.toFixed(3)} = M7 ${esc.medidas.M7.inv.toFixed(3)}`
		});
	}

	return checks;
}
