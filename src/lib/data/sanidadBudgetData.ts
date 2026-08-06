/**
 * Datos del presupuesto interactivo del Plan Sanidad 2036.
 *
 * Fuente: Presupuesto_CONVOCA_Sanidad_2036.xlsx, cierre 5 de agosto de 2026
 * (y Memoria_Presupuesto_CONVOCA_Sanidad_2036.md). Transcrito literalmente del
 * artifact de referencia aprobado (presupuesto_sanidad_2036.html) — ninguna
 * cifra ha sido recalculada, interpolada ni inventada. Todavía no existe una
 * fuente estructurada en Supabase para el presupuesto de Sanidad (a diferencia
 * de Vivienda, que sí tiene topic_budget_lines/scenarios/timeline): mientras no
 * se migre, estas constantes tipadas son la fuente real que consume la página.
 * Todas las cifras son gasto incremental frente al escenario sin plan, en euros
 * constantes de 2026.
 */

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
			M1: 109.4,
			M2: 176.3,
			M3: 14.2,
			M4: 13.6,
			M5: 18,
			M6: 61.3,
			M7: 60.6,
			M8: 82.2,
			TOTAL: 535.7
		},
		'2028': {
			M1: 199.1,
			M2: 230.9,
			M3: 37.1,
			M4: 34.3,
			M5: 45.4,
			M6: 123.6,
			M7: 118.1,
			M8: 87.6,
			TOTAL: 876.1
		},
		'2029': {
			M1: 308.4,
			M2: 263.1,
			M3: 68.6,
			M4: 62.3,
			M5: 82.1,
			M6: 186.7,
			M7: 195,
			M8: 92.9,
			TOTAL: 1259
		},
		'2030': {
			M1: 401.8,
			M2: 206.6,
			M3: 96.5,
			M4: 90.6,
			M5: 119.2,
			M6: 250.5,
			M7: 272.4,
			M8: 144.4,
			TOTAL: 1582
		},
		'2031': {
			M1: 381.8,
			M2: 107.2,
			M3: 106.6,
			M4: 119.3,
			M5: 156.6,
			M6: 315.2,
			M7: 327.5,
			M8: 67.6,
			TOTAL: 1581.8
		},
		'2032': {
			M1: 384.5,
			M2: 107.2,
			M3: 112.5,
			M4: 141.1,
			M5: 185,
			M6: 316.8,
			M7: 386.3,
			M8: 67.6,
			TOTAL: 1700.9
		},
		'2033': {
			M1: 387.2,
			M2: 107.2,
			M3: 113.3,
			M4: 141.8,
			M5: 185.7,
			M6: 318.3,
			M7: 387.4,
			M8: 67.6,
			TOTAL: 1708.5
		},
		'2034': {
			M1: 389.9,
			M2: 107.2,
			M3: 113.3,
			M4: 142.6,
			M5: 186.4,
			M6: 319.8,
			M7: 388.4,
			M8: 67.6,
			TOTAL: 1715.3
		},
		'2035': {
			M1: 391.7,
			M2: 107.2,
			M3: 113.3,
			M4: 143.1,
			M5: 186.9,
			M6: 320.9,
			M7: 389.1,
			M8: 67.6,
			TOTAL: 1719.8
		},
		'2036': {
			M1: 393.5,
			M2: 107.2,
			M3: 113.3,
			M4: 143.6,
			M5: 187.3,
			M6: 321.9,
			M7: 389.8,
			M8: 67.6,
			TOTAL: 1724.3
		}
	},
	Central: {
		'2027': {
			M1: 188.9,
			M2: 345.2,
			M3: 32,
			M4: 26.3,
			M5: 36.2,
			M6: 103.4,
			M7: 112.1,
			M8: 158.1,
			TOTAL: 1002.2
		},
		'2028': {
			M1: 346.6,
			M2: 481.2,
			M3: 84.1,
			M4: 66.4,
			M5: 91,
			M6: 208.4,
			M7: 219.1,
			M8: 167.6,
			TOTAL: 1664.5
		},
		'2029': {
			M1: 538.6,
			M2: 592.8,
			M3: 156.3,
			M4: 120.4,
			M5: 164.7,
			M6: 314.7,
			M7: 362.5,
			M8: 177.1,
			TOTAL: 2427.1
		},
		'2030': {
			M1: 702.2,
			M2: 556.8,
			M3: 220.3,
			M4: 175,
			M5: 239.2,
			M6: 422.3,
			M7: 507.1,
			M8: 305.5,
			TOTAL: 3128.4
		},
		'2031': {
			M1: 668.8,
			M2: 372,
			M3: 244.1,
			M4: 230.4,
			M5: 314.4,
			M6: 531.3,
			M7: 610.6,
			M8: 156.8,
			TOTAL: 3128.6
		},
		'2032': {
			M1: 673.3,
			M2: 372,
			M3: 258.1,
			M4: 272.5,
			M5: 371.3,
			M6: 533.9,
			M7: 720.6,
			M8: 156.8,
			TOTAL: 3358.6
		},
		'2033': {
			M1: 677.8,
			M2: 372,
			M3: 260.2,
			M4: 273.8,
			M5: 372.8,
			M6: 536.4,
			M7: 722.9,
			M8: 156.8,
			TOTAL: 3372.8
		},
		'2034': {
			M1: 682.3,
			M2: 372,
			M3: 260.2,
			M4: 275.2,
			M5: 374.2,
			M6: 539,
			M7: 725.1,
			M8: 156.8,
			TOTAL: 3384.8
		},
		'2035': {
			M1: 685.3,
			M2: 372,
			M3: 260.2,
			M4: 276.1,
			M5: 375.1,
			M6: 540.7,
			M7: 726.6,
			M8: 156.8,
			TOTAL: 3392.9
		},
		'2036': {
			M1: 688.3,
			M2: 372,
			M3: 260.2,
			M4: 277,
			M5: 376.1,
			M6: 542.4,
			M7: 728.1,
			M8: 156.8,
			TOTAL: 3400.9
		}
	},
	Alto: {
		'2027': {
			M1: 283.3,
			M2: 471.2,
			M3: 56.2,
			M4: 41.9,
			M5: 81.2,
			M6: 171.9,
			M7: 188.9,
			M8: 268,
			TOTAL: 1562.6
		},
		'2028': {
			M1: 525.3,
			M2: 696.8,
			M3: 144.1,
			M4: 105.6,
			M5: 204.5,
			M6: 346.5,
			M7: 370.3,
			M8: 283.4,
			TOTAL: 2676.5
		},
		'2029': {
			M1: 819.7,
			M2: 915.5,
			M3: 263.5,
			M4: 191.3,
			M5: 370.2,
			M6: 523.1,
			M7: 613.5,
			M8: 298.8,
			TOTAL: 3995.6
		},
		'2030': {
			M1: 1070.5,
			M2: 968.3,
			M3: 370.1,
			M4: 278.1,
			M5: 537.8,
			M6: 701.8,
			M7: 858.8,
			M8: 566.7,
			TOTAL: 5352.2
		},
		'2031': {
			M1: 1023.1,
			M2: 729.3,
			M3: 407.6,
			M4: 366,
			M5: 707.3,
			M6: 882.8,
			M7: 1035.8,
			M8: 314.1,
			TOTAL: 5465.9
		},
		'2032': {
			M1: 1029.7,
			M2: 729.3,
			M3: 429.7,
			M4: 432.6,
			M5: 835.6,
			M6: 886.9,
			M7: 1222.5,
			M8: 314.1,
			TOTAL: 5880.4
		},
		'2033': {
			M1: 1036.4,
			M2: 729.3,
			M3: 433.1,
			M4: 434.6,
			M5: 839.1,
			M6: 891.1,
			M7: 1226.3,
			M8: 314.1,
			TOTAL: 5903.9
		},
		'2034': {
			M1: 1043,
			M2: 729.3,
			M3: 433.1,
			M4: 436.7,
			M5: 842.6,
			M6: 895.2,
			M7: 1230.2,
			M8: 314.1,
			TOTAL: 5924.1
		},
		'2035': {
			M1: 1047.4,
			M2: 729.3,
			M3: 433.1,
			M4: 438,
			M5: 844.9,
			M6: 898,
			M7: 1232.8,
			M8: 314.1,
			TOTAL: 5937.5
		},
		'2036': {
			M1: 1051.9,
			M2: 729.3,
			M3: 433.1,
			M4: 439.4,
			M5: 847.2,
			M6: 900.7,
			M7: 1235.3,
			M8: 314.1,
			TOTAL: 5951
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
		'2027': { extraordinario: 165.6, recurrente: 10.7 },
		'2028': { extraordinario: 198.7, recurrente: 32.2 },
		'2029': { extraordinario: 198.7, recurrente: 64.3 },
		'2030': { extraordinario: 99.4, recurrente: 107.2 },
		'2031': { extraordinario: 0, recurrente: 107.2 },
		'2032': { extraordinario: 0, recurrente: 107.2 },
		'2033': { extraordinario: 0, recurrente: 107.2 },
		'2034': { extraordinario: 0, recurrente: 107.2 },
		'2035': { extraordinario: 0, recurrente: 107.2 },
		'2036': { extraordinario: 0, recurrente: 107.2 }
	},
	Central: {
		'2027': { extraordinario: 308, recurrente: 37.2 },
		'2028': { extraordinario: 369.6, recurrente: 111.6 },
		'2029': { extraordinario: 369.6, recurrente: 223.2 },
		'2030': { extraordinario: 184.8, recurrente: 372 },
		'2031': { extraordinario: 0, recurrente: 372 },
		'2032': { extraordinario: 0, recurrente: 372 },
		'2033': { extraordinario: 0, recurrente: 372 },
		'2034': { extraordinario: 0, recurrente: 372 },
		'2035': { extraordinario: 0, recurrente: 372 },
		'2036': { extraordinario: 0, recurrente: 372 }
	},
	Alto: {
		'2027': { extraordinario: 398.3, recurrente: 72.9 },
		'2028': { extraordinario: 478, recurrente: 218.8 },
		'2029': { extraordinario: 478, recurrente: 437.6 },
		'2030': { extraordinario: 239, recurrente: 729.3 },
		'2031': { extraordinario: 0, recurrente: 729.3 },
		'2032': { extraordinario: 0, recurrente: 729.3 },
		'2033': { extraordinario: 0, recurrente: 729.3 },
		'2034': { extraordinario: 0, recurrente: 729.3 },
		'2035': { extraordinario: 0, recurrente: 729.3 },
		'2036': { extraordinario: 0, recurrente: 729.3 }
	}
};

/** Coste total del vaciado del atasco heredado de M2 (2027-2030), por escenario — no se repite después de 2030. */
export const SANIDAD_M2_BACKLOG_TOTAL: Record<SanidadBudgetScenarioKey, number> = {
	Bajo: 662.4,
	Central: 1232,
	Alto: 1593.2
};

export interface SanidadBudgetComponent {
	nombre: string;
	tipo: 'Recurrente' | 'Deducción';
	valor: number;
}

/** Principales recursos que explican el coste de cada medida en 2032, escenario central. */
export const SANIDAD_BUDGET_COMPONENTS: Record<SanidadMeasureId, SanidadBudgetComponent[]> = {
	M1: [
		{ nombre: 'Personal multiprofesional', tipo: 'Recurrente', valor: 461.5 },
		{ nombre: 'Diagnóstico y actividad', tipo: 'Recurrente', valor: 260.5 },
		{ nombre: 'Mantenimiento', tipo: 'Recurrente', valor: 26.3 },
		{ nombre: 'Descuento programas existentes', tipo: 'Deducción', valor: -75 }
	],
	M2: [
		{ nombre: 'Reserva estructural', tipo: 'Recurrente', valor: 308 },
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
		{ nombre: 'Red comunitaria multidisciplinar', tipo: 'Recurrente', valor: 205.6 },
		{ nombre: 'Espacios, grupos y equipamiento', tipo: 'Recurrente', valor: 30.8 },
		{ nombre: 'Crisis, infancia, adicciones y continuidad', tipo: 'Recurrente', valor: 75 },
		{ nombre: 'Descuento Plan Salud Mental vigente', tipo: 'Deducción', valor: -39 }
	],
	M5: [
		{ nombre: 'Equipos de atención en casa', tipo: 'Recurrente', valor: 92.2 },
		{ nombre: 'Telemonitorización con alternativa', tipo: 'Recurrente', valor: 156.3 },
		{ nombre: 'Plan único y coordinación', tipo: 'Recurrente', valor: 65.1 },
		{ nombre: 'Apoyo y respiro a cuidadores', tipo: 'Recurrente', valor: 50 },
		{ nombre: 'Completar equipos paliativos', tipo: 'Recurrente', valor: 7.7 }
	],
	M6: [
		{ nombre: 'Equipos territoriales de salud pública', tipo: 'Recurrente', valor: 79 },
		{ nombre: 'Programas comunitarios de prevención', tipo: 'Recurrente', valor: 260.5 },
		{ nombre: 'Vacunación y captación activa', tipo: 'Recurrente', valor: 104.2 },
		{ nombre: 'Escuela, comunidad y clima', tipo: 'Recurrente', valor: 65.1 },
		{ nombre: 'Evaluación y cribados', tipo: 'Recurrente', valor: 50 },
		{ nombre: 'Descuento programas solapados', tipo: 'Deducción', valor: -25 }
	],
	M7: [
		{ nombre: 'Cobertura bucodental adicional', tipo: 'Recurrente', valor: 420.6 },
		{ nombre: 'Unidades móviles - operación', tipo: 'Recurrente', valor: 30 },
		{ nombre: 'Transporte sanitario y ayudas', tipo: 'Recurrente', valor: 25 },
		{ nombre: 'Redes territoriales compartidas', tipo: 'Recurrente', valor: 90 },
		{ nombre: 'Fondo de cohesión ajustado', tipo: 'Recurrente', valor: 150 },
		{ nombre: 'Evaluación de ampliación óptica', tipo: 'Recurrente', valor: 5 }
	],
	M8: [
		{ nombre: 'Operación, seguridad y mantenimiento', tipo: 'Recurrente', valor: 118.9 },
		{ nombre: 'Canal no digital', tipo: 'Recurrente', valor: 12.9 },
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
	M1: { bajo: 384.5, central: 673.3, alto: 1029.7 },
	M2: { bajo: 107.2, central: 372, alto: 729.3 },
	M3: { bajo: 112.5, central: 258.1, alto: 429.7 },
	M4: { bajo: 141.1, central: 272.5, alto: 432.6 },
	M5: { bajo: 185, central: 371.3, alto: 835.6 },
	M6: { bajo: 316.8, central: 533.9, alto: 886.9 },
	M7: { bajo: 386.3, central: 720.6, alto: 1222.5 },
	M8: { bajo: 67.6, central: 156.8, alto: 314.1 }
};

/** Coste total del plan en 2032 (M€/año), por escenario. */
export const SANIDAD_BUDGET_TOTALES_2032: Record<SanidadBudgetScenarioKey, number> = {
	Bajo: 1700.9,
	Central: 3358.6,
	Alto: 5880.4
};

/** Gasto incremental acumulado 2027-2036 (M€), por escenario. */
export const SANIDAD_BUDGET_ACUMULADOS: Record<SanidadBudgetScenarioKey, number> = {
	Bajo: 14403.4,
	Central: 28260.9,
	Alto: 48649.8
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
