/**
 * Datos del presupuesto interactivo del Plan Sanidad 2036.
 *
 * Fuente: Presupuesto_CONVOCA_Sanidad_2036.xlsx (hojas Resumen/Serie/M2_Backlog/Calculo)
 * y modelo_presupuesto_convoca.py, cierre 5 de agosto de 2026 (y Memoria_Presupuesto_
 * CONVOCA_Sanidad_2036.md). Todo valor numérico de este archivo se recalcula
 * directamente desde el modelo Python/Excel (con precisión de 2 decimales) en vez de
 * transcribir cifras ya redondeadas a 1 decimal: redondear dos veces (primero a 1
 * decimal en el origen, después a entero al mostrarlo con Math.round) provocaba que
 * algunas cifras subieran una unidad de más — p. ej. M1 mostraba 385 M€ en vez de 384,
 * M4 mostraba 273 M€ en vez de 272 — cuando el valor real redondeado a 1 decimal caía
 * justo en una frontera ".5". Con 2 decimales de origen ese empate no vuelve a
 * producirse (verificado sin excepciones contra las 240 combinaciones de escenario ×
 * año × medida, más bandas, componentes y totales). Todavía no existe una fuente
 * estructurada en Supabase para el presupuesto de Sanidad (a diferencia de Vivienda,
 * que sí tiene topic_budget_lines/scenarios/timeline): mientras no se migre, estas
 * constantes tipadas son la fuente real que consume la página.
 * Todas las cifras son gasto incremental frente al escenario sin plan, en euros
 * constantes de 2026.
 */

/**
 * Formateador numérico común del bloque de presupuesto de Sanidad (cabecera,
 * tarjetas de medidas, gráfico y tooltips): redondea a entero y usa el
 * separador de millares español (punto), vía Intl a través de toLocaleString.
 * Único punto de formato para evitar que cabecera/tarjetas/gráfico diverjan.
 *
 * useGrouping: 'always' es necesario porque el valor por defecto de la
 * localización es-ES ('auto') sigue la regla CLDR "min2" y omite el separador
 * de millares en números de 4 cifras (p. ej. (3359).toLocaleString('es-ES')
 * da "3359", no "3.359") — solo lo aplica a partir de 5 cifras. Sin forzarlo,
 * la cabecera mostraba "3359 M€" en vez de "3.359 M€".
 */
export function formatSanidadEur(n: number): string {
	return Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' });
}

export type SanidadBudgetScenarioKey = 'Bajo' | 'Central' | 'Alto';
export type SanidadMeasureId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8';

export const SANIDAD_BUDGET_YEARS = [
	'2027',
	'2028',
	'2029',
	'2030',
	'2031',
	'2032',
	'2033',
	'2034',
	'2035',
	'2036'
] as const;

export interface SanidadBudgetYearRow {
	M1: number;
	M2: number;
	M3: number;
	M4: number;
	M5: number;
	M6: number;
	M7: number;
	M8: number;
	TOTAL: number;
}

export const SANIDAD_BUDGET_SERIE: Record<
	SanidadBudgetScenarioKey,
	Record<string, SanidadBudgetYearRow>
> = {
	Bajo: {
		'2027': {
			M1: 109.38,
			M2: 176.32,
			M3: 14.25,
			M4: 13.61,
			M5: 18.03,
			M6: 61.3,
			M7: 60.64,
			M8: 82.18,
			TOTAL: 535.71
		},
		'2028': {
			M1: 199.13,
			M2: 230.88,
			M3: 37.13,
			M4: 34.33,
			M5: 45.38,
			M6: 123.62,
			M7: 118.06,
			M8: 87.55,
			TOTAL: 876.09
		},
		'2029': {
			M1: 308.43,
			M2: 263.05,
			M3: 68.63,
			M4: 62.25,
			M5: 82.09,
			M6: 186.67,
			M7: 194.97,
			M8: 92.92,
			TOTAL: 1259.02
		},
		'2030': {
			M1: 401.76,
			M2: 206.59,
			M3: 96.55,
			M4: 90.57,
			M5: 119.19,
			M6: 250.53,
			M7: 272.44,
			M8: 144.38,
			TOTAL: 1582.01
		},
		'2031': {
			M1: 381.75,
			M2: 107.24,
			M3: 106.63,
			M4: 119.29,
			M5: 156.65,
			M6: 315.22,
			M7: 327.46,
			M8: 67.56,
			TOTAL: 1581.8
		},
		'2032': {
			M1: 384.47,
			M2: 107.24,
			M3: 112.51,
			M4: 141.09,
			M5: 184.99,
			M6: 316.76,
			M7: 386.3,
			M8: 67.56,
			TOTAL: 1700.92
		},
		'2033': {
			M1: 387.19,
			M2: 107.24,
			M3: 113.35,
			M4: 141.83,
			M5: 185.69,
			M6: 318.31,
			M7: 387.36,
			M8: 67.56,
			TOTAL: 1708.52
		},
		'2034': {
			M1: 389.91,
			M2: 107.24,
			M3: 113.35,
			M4: 142.58,
			M5: 186.39,
			M6: 319.85,
			M7: 388.41,
			M8: 67.56,
			TOTAL: 1715.28
		},
		'2035': {
			M1: 391.72,
			M2: 107.24,
			M3: 113.35,
			M4: 143.08,
			M5: 186.85,
			M6: 320.87,
			M7: 389.11,
			M8: 67.56,
			TOTAL: 1719.79
		},
		'2036': {
			M1: 393.54,
			M2: 107.24,
			M3: 113.35,
			M4: 143.58,
			M5: 187.32,
			M6: 321.9,
			M7: 389.82,
			M8: 67.56,
			TOTAL: 1724.3
		}
	},
	Central: {
		'2027': {
			M1: 188.89,
			M2: 345.21,
			M3: 32,
			M4: 26.34,
			M5: 36.18,
			M6: 103.37,
			M7: 112.12,
			M8: 158.12,
			TOTAL: 1002.22
		},
		'2028': {
			M1: 346.63,
			M2: 481.22,
			M3: 84.1,
			M4: 66.42,
			M5: 91.04,
			M6: 208.44,
			M7: 219.1,
			M8: 167.6,
			TOTAL: 1664.54
		},
		'2029': {
			M1: 538.56,
			M2: 592.82,
			M3: 156.3,
			M4: 120.37,
			M5: 164.74,
			M6: 314.71,
			M7: 362.48,
			M8: 177.09,
			TOTAL: 2427.06
		},
		'2030': {
			M1: 702.23,
			M2: 556.82,
			M3: 220.3,
			M4: 175.05,
			M5: 239.19,
			M6: 422.33,
			M7: 507.05,
			M8: 305.48,
			TOTAL: 3128.45
		},
		'2031': {
			M1: 668.83,
			M2: 372.01,
			M3: 244.1,
			M4: 230.45,
			M5: 314.41,
			M6: 531.32,
			M7: 610.65,
			M8: 156.85,
			TOTAL: 3128.62
		},
		'2032': {
			M1: 673.32,
			M2: 372.01,
			M3: 258.1,
			M4: 272.48,
			M5: 371.33,
			M6: 533.88,
			M7: 720.64,
			M8: 156.85,
			TOTAL: 3358.6
		},
		'2033': {
			M1: 677.81,
			M2: 372.01,
			M3: 260.2,
			M4: 273.84,
			M5: 372.76,
			M6: 536.43,
			M7: 722.87,
			M8: 156.85,
			TOTAL: 3372.77
		},
		'2034': {
			M1: 682.3,
			M2: 372.01,
			M3: 260.2,
			M4: 275.2,
			M5: 374.19,
			M6: 538.99,
			M7: 725.1,
			M8: 156.85,
			TOTAL: 3384.84
		},
		'2035': {
			M1: 685.3,
			M2: 372.01,
			M3: 260.2,
			M4: 276.11,
			M5: 375.14,
			M6: 540.69,
			M7: 726.58,
			M8: 156.85,
			TOTAL: 3392.89
		},
		'2036': {
			M1: 688.3,
			M2: 372.01,
			M3: 260.2,
			M4: 277.02,
			M5: 376.1,
			M6: 542.39,
			M7: 728.07,
			M8: 156.85,
			TOTAL: 3400.94
		}
	},
	Alto: {
		'2027': {
			M1: 283.26,
			M2: 471.23,
			M3: 56.25,
			M4: 41.91,
			M5: 81.23,
			M6: 171.88,
			M7: 188.88,
			M8: 267.97,
			TOTAL: 1562.61
		},
		'2028': {
			M1: 525.31,
			M2: 696.75,
			M3: 144.07,
			M4: 105.62,
			M5: 204.52,
			M6: 346.51,
			M7: 370.32,
			M8: 283.36,
			TOTAL: 2676.47
		},
		'2029': {
			M1: 819.7,
			M2: 915.54,
			M3: 263.47,
			M4: 191.33,
			M5: 370.24,
			M6: 523.07,
			M7: 613.53,
			M8: 298.76,
			TOTAL: 3995.63
		},
		'2030': {
			M1: 1070.55,
			M2: 968.27,
			M3: 370.05,
			M4: 278.13,
			M5: 537.82,
			M6: 701.83,
			M7: 858.79,
			M8: 566.73,
			TOTAL: 5352.16
		},
		'2031': {
			M1: 1023.07,
			M2: 729.29,
			M3: 407.57,
			M4: 366,
			M5: 707.26,
			M6: 882.8,
			M7: 1035.81,
			M8: 314.15,
			TOTAL: 5465.94
		},
		'2032': {
			M1: 1029.71,
			M2: 729.29,
			M3: 429.69,
			M4: 432.61,
			M5: 835.57,
			M6: 886.93,
			M7: 1222.46,
			M8: 314.15,
			TOTAL: 5880.41
		},
		'2033': {
			M1: 1036.36,
			M2: 729.29,
			M3: 433.05,
			M4: 434.63,
			M5: 839.07,
			M6: 891.06,
			M7: 1226.32,
			M8: 314.15,
			TOTAL: 5903.93
		},
		'2034': {
			M1: 1043.01,
			M2: 729.29,
			M3: 433.05,
			M4: 436.66,
			M5: 842.56,
			M6: 895.2,
			M7: 1230.18,
			M8: 314.15,
			TOTAL: 5924.09
		},
		'2035': {
			M1: 1047.45,
			M2: 729.29,
			M3: 433.05,
			M4: 438.01,
			M5: 844.9,
			M6: 897.95,
			M7: 1232.76,
			M8: 314.15,
			TOTAL: 5937.54
		},
		'2036': {
			M1: 1051.88,
			M2: 729.29,
			M3: 433.05,
			M4: 439.36,
			M5: 847.23,
			M6: 900.71,
			M7: 1235.33,
			M8: 314.15,
			TOTAL: 5950.99
		}
	}
};

export interface SanidadM2ExtraYear {
	extraordinario: number;
	recurrente: number;
}

export const SANIDAD_M2_EXTRA: Record<
	SanidadBudgetScenarioKey,
	Record<string, SanidadM2ExtraYear>
> = {
	Bajo: {
		'2027': { extraordinario: 165.59, recurrente: 10.72 },
		'2028': { extraordinario: 198.71, recurrente: 32.17 },
		'2029': { extraordinario: 198.71, recurrente: 64.34 },
		'2030': { extraordinario: 99.36, recurrente: 107.24 },
		'2031': { extraordinario: 0, recurrente: 107.24 },
		'2032': { extraordinario: 0, recurrente: 107.24 },
		'2033': { extraordinario: 0, recurrente: 107.24 },
		'2034': { extraordinario: 0, recurrente: 107.24 },
		'2035': { extraordinario: 0, recurrente: 107.24 },
		'2036': { extraordinario: 0, recurrente: 107.24 }
	},
	Central: {
		'2027': { extraordinario: 308.01, recurrente: 37.2 },
		'2028': { extraordinario: 369.61, recurrente: 111.6 },
		'2029': { extraordinario: 369.61, recurrente: 223.21 },
		'2030': { extraordinario: 184.81, recurrente: 372.01 },
		'2031': { extraordinario: 0, recurrente: 372.01 },
		'2032': { extraordinario: 0, recurrente: 372.01 },
		'2033': { extraordinario: 0, recurrente: 372.01 },
		'2034': { extraordinario: 0, recurrente: 372.01 },
		'2035': { extraordinario: 0, recurrente: 372.01 },
		'2036': { extraordinario: 0, recurrente: 372.01 }
	},
	Alto: {
		'2027': { extraordinario: 398.3, recurrente: 72.93 },
		'2028': { extraordinario: 477.96, recurrente: 218.79 },
		'2029': { extraordinario: 477.96, recurrente: 437.57 },
		'2030': { extraordinario: 238.98, recurrente: 729.29 },
		'2031': { extraordinario: 0, recurrente: 729.29 },
		'2032': { extraordinario: 0, recurrente: 729.29 },
		'2033': { extraordinario: 0, recurrente: 729.29 },
		'2034': { extraordinario: 0, recurrente: 729.29 },
		'2035': { extraordinario: 0, recurrente: 729.29 },
		'2036': { extraordinario: 0, recurrente: 729.29 }
	}
};

/** Coste total del vaciado del atasco heredado de M2 (2027-2030), por escenario — no se repite después de 2030. */
export const SANIDAD_M2_BACKLOG_TOTAL: Record<SanidadBudgetScenarioKey, number> = {
	Bajo: 662.37,
	Central: 1232.05,
	Alto: 1593.22
};

export interface SanidadBudgetComponent {
	nombre: string;
	tipo: 'Recurrente' | 'Deducción';
	valor: number;
}

/** Principales recursos que explican el coste de cada medida en 2032, escenario central. */
export const SANIDAD_BUDGET_COMPONENTS: Record<SanidadMeasureId, SanidadBudgetComponent[]> = {
	M1: [
		{ nombre: 'Personal multiprofesional', tipo: 'Recurrente', valor: 461.53 },
		{ nombre: 'Diagnóstico y actividad', tipo: 'Recurrente', valor: 260.5 },
		{ nombre: 'Mantenimiento', tipo: 'Recurrente', valor: 26.29 },
		{ nombre: 'Descuento programas existentes', tipo: 'Deducción', valor: -75 }
	],
	M2: [
		{ nombre: 'Reserva estructural', tipo: 'Recurrente', valor: 308.01 },
		{ nombre: 'Coordinación y transparencia', tipo: 'Recurrente', valor: 54 },
		{ nombre: 'Alternativa pública y desplazamientos', tipo: 'Recurrente', valor: 10 }
	],
	M3: [
		{ nombre: 'Plazas FSE adicionales activas', tipo: 'Recurrente', valor: 130.1 },
		{ nombre: 'Incentivos difícil cobertura', tipo: 'Recurrente', valor: 100 },
		{ nombre: 'Homologación y evaluación', tipo: 'Recurrente', valor: 18 },
		{ nombre: 'Planificación, REPS y transparencia', tipo: 'Recurrente', valor: 10 }
	],
	M4: [
		{ nombre: 'Red comunitaria multidisciplinar', tipo: 'Recurrente', valor: 205.63 },
		{ nombre: 'Espacios, grupos y equipamiento', tipo: 'Recurrente', valor: 30.84 },
		{ nombre: 'Crisis, infancia, adicciones y continuidad', tipo: 'Recurrente', valor: 75 },
		{ nombre: 'Descuento Plan Salud Mental vigente', tipo: 'Deducción', valor: -39 }
	],
	M5: [
		{ nombre: 'Equipos de atención en casa', tipo: 'Recurrente', valor: 92.19 },
		{ nombre: 'Telemonitorización con alternativa', tipo: 'Recurrente', valor: 156.3 },
		{ nombre: 'Plan único y coordinación', tipo: 'Recurrente', valor: 65.13 },
		{ nombre: 'Apoyo y respiro a cuidadores', tipo: 'Recurrente', valor: 50 },
		{ nombre: 'Completar equipos paliativos', tipo: 'Recurrente', valor: 7.71 }
	],
	M6: [
		{ nombre: 'Equipos territoriales de salud pública', tipo: 'Recurrente', valor: 79.05 },
		{ nombre: 'Programas comunitarios de prevención', tipo: 'Recurrente', valor: 260.5 },
		{ nombre: 'Vacunación y captación activa', tipo: 'Recurrente', valor: 104.2 },
		{ nombre: 'Escuela, comunidad y clima', tipo: 'Recurrente', valor: 65.13 },
		{ nombre: 'Evaluación y cribados', tipo: 'Recurrente', valor: 50 },
		{ nombre: 'Descuento programas solapados', tipo: 'Deducción', valor: -25 }
	],
	M7: [
		{ nombre: 'Cobertura bucodental adicional', tipo: 'Recurrente', valor: 420.64 },
		{ nombre: 'Unidades móviles - operación', tipo: 'Recurrente', valor: 30 },
		{ nombre: 'Transporte sanitario y ayudas', tipo: 'Recurrente', valor: 25 },
		{ nombre: 'Redes territoriales compartidas', tipo: 'Recurrente', valor: 90 },
		{ nombre: 'Fondo de cohesión ajustado', tipo: 'Recurrente', valor: 150 },
		{ nombre: 'Evaluación de ampliación óptica', tipo: 'Recurrente', valor: 5 }
	],
	M8: [
		{ nombre: 'Operación, seguridad y mantenimiento', tipo: 'Recurrente', valor: 118.9 },
		{ nombre: 'Canal no digital', tipo: 'Recurrente', valor: 12.94 },
		{ nombre: 'Registro IA, auditorías y cuadro público', tipo: 'Recurrente', valor: 25 }
	]
};

export interface SanidadBudgetBand {
	bajo: number;
	central: number;
	alto: number;
}

/** Banda de escenarios en 2032 (M€/año) por medida. */
export const SANIDAD_BUDGET_BANDA_2032: Record<SanidadMeasureId, SanidadBudgetBand> = {
	M1: { bajo: 384.47, central: 673.32, alto: 1029.71 },
	M2: { bajo: 107.24, central: 372.01, alto: 729.29 },
	M3: { bajo: 112.51, central: 258.1, alto: 429.69 },
	M4: { bajo: 141.09, central: 272.48, alto: 432.61 },
	M5: { bajo: 184.99, central: 371.33, alto: 835.57 },
	M6: { bajo: 316.76, central: 533.88, alto: 886.93 },
	M7: { bajo: 386.3, central: 720.64, alto: 1222.46 },
	M8: { bajo: 67.56, central: 156.85, alto: 314.15 }
};

/** Coste total del plan en 2032 (M€/año), por escenario. */
export const SANIDAD_BUDGET_TOTALES_2032: Record<SanidadBudgetScenarioKey, number> = {
	Bajo: 1700.92,
	Central: 3358.6,
	Alto: 5880.41
};

/** Gasto incremental acumulado 2027-2036 (M€), por escenario. */
export const SANIDAD_BUDGET_ACUMULADOS: Record<SanidadBudgetScenarioKey, number> = {
	Bajo: 14403.44,
	Central: 28260.92,
	Alto: 48649.76
};

export interface SanidadBudgetMeasureMeta {
	id: SanidadMeasureId;
	nombre: string;
	corto: string;
}

export const SANIDAD_BUDGET_MEASURES: SanidadBudgetMeasureMeta[] = [
	{
		id: 'M1',
		nombre: 'Atención Primaria que vuelva a resolver',
		corto:
			'MFyC y enfermería adicionales, triaje, módulos multiprofesionales y actividad diagnóstica.'
	},
	{
		id: 'M2',
		nombre: 'Garantía nacional frente a las listas de espera',
		corto:
			'Reserva estructural, coordinación común, transparencia y alternativa pública. El backlog no se repite aquí.'
	},
	{
		id: 'M3',
		nombre: 'Pacto de profesionales sanitarios 2027–2036',
		corto:
			'Plazas FSE adicionales sobre la oferta oficial, incentivos de difícil cobertura y homologación.'
	},
	{
		id: 'M4',
		nombre: 'Salud mental accesible, comunitaria y basada en derechos',
		corto:
			'Psicología clínica, psiquiatría, enfermería de salud mental y equipos de crisis e infancia.'
	},
	{
		id: 'M5',
		nombre: 'Envejecimiento, cronicidad y atención en casa',
		corto: 'Equipos domiciliarios, telemonitorización, plan único y apoyo a cuidadores.'
	},
	{
		id: 'M6',
		nombre: 'Prevenir antes de llegar tarde',
		corto: 'Equipos territoriales de salud pública, prevención comunitaria y captación vacunal.'
	},
	{
		id: 'M7',
		nombre: 'Misma protección, independientemente del código postal',
		corto: 'Cobertura bucodental adicional, unidades móviles, transporte y fondo de cohesión.'
	},
	{
		id: 'M8',
		nombre: 'Información útil, privacidad y cuentas claras',
		corto: 'Interoperabilidad, canal no digital, registro de IA, auditorías y cuadro público.'
	}
];

export interface SanidadBudgetScenarioMeta {
	key: SanidadBudgetScenarioKey;
	label: string;
	/** Token de color del proyecto (p. ej. "brand-700"), nunca un hexadecimal suelto. */
	colorToken: string;
	desc: string;
}

export const SANIDAD_BUDGET_SCENARIOS: SanidadBudgetScenarioMeta[] = [
	{ key: 'Bajo', label: 'Bajo', colorToken: 'brand-300', desc: 'Cobertura prudente' },
	{ key: 'Central', label: 'Central', colorToken: 'brand-700', desc: 'Escenario recomendado' },
	{ key: 'Alto', label: 'Alto', colorToken: 'accent-500', desc: 'Cobertura amplia' }
];

/** Un color distinto por medida para el modo "por medidas" del gráfico y la leyenda, mismo criterio tonal que el artifact de referencia (verde oscuro a claro, luego naranja). */
export const SANIDAD_MEASURE_COLOR_TOKENS: Record<SanidadMeasureId, string> = {
	M1: 'brand-900',
	M2: 'brand-800',
	M3: 'brand-700',
	M4: 'brand-600',
	M5: 'brand-500',
	M6: 'brand-300',
	M7: 'accent-500',
	M8: 'accent-400'
};
