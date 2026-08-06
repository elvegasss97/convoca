/**
 * Datos y lógica del calendario interactivo del Plan Sanidad 2036.
 *
 * Transcrito literalmente del artifact de referencia aprobado
 * (calendario_sanidad_2036(3).html) — ninguna cifra, hito ni regla de
 * resoluciones ha sido recalculada, simplificada ni reinterpretada.
 * Fuente original de los datos: Presupuesto_CONVOCA_Sanidad_2036.xlsx
 * (pestañas Calendario y Serie) y Memoria_Presupuesto_CONVOCA_Sanidad_2036.md.
 * Rampas y costes anuales proceden directamente del libro de cálculo.
 * Todas las cifras son gasto incremental frente al escenario sin plan, en
 * euros constantes de 2026.
 */

export type SanidadCalendarMeasureId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8';
export type SanidadCalendarMilestoneType =
	'marcha' | 'ampliacion' | 'garantia' | 'evaluacion' | 'consolidacion';
export type SanidadCalendarMilestoneStatus = 'starts' | 'continues' | 'ends';

export const SANIDAD_CALENDAR_YEARS = [
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
export type SanidadCalendarYear = (typeof SANIDAD_CALENDAR_YEARS)[number];

export interface SanidadCalendarData {
	years: readonly string[];
	ramps: Record<SanidadCalendarMeasureId, Record<string, number>>;
	backlogAbsorption: Record<string, number>;
	central: {
		total: Record<string, number>;
		byMeasure: Record<SanidadCalendarMeasureId, Record<string, number>>;
	};
}

export const CAL: SanidadCalendarData = {
	years: SANIDAD_CALENDAR_YEARS,
	ramps: {
		M1: {
			'2027': 0.2,
			'2028': 0.45,
			'2029': 0.75,
			'2030': 1.0,
			'2031': 1.0,
			'2032': 1.0,
			'2033': 1.0,
			'2034': 1.0,
			'2035': 1.0,
			'2036': 1.0
		},
		M2: {
			'2027': 0.1,
			'2028': 0.3,
			'2029': 0.6,
			'2030': 1.0,
			'2031': 1.0,
			'2032': 1.0,
			'2033': 1.0,
			'2034': 1.0,
			'2035': 1.0,
			'2036': 1.0
		},
		M3: {
			'2027': 0.25,
			'2028': 0.5,
			'2029': 0.75,
			'2030': 1.0,
			'2031': 1.0,
			'2032': 1.0,
			'2033': 1.0,
			'2034': 1.0,
			'2035': 1.0,
			'2036': 1.0
		},
		M4: {
			'2027': 0.1,
			'2028': 0.25,
			'2029': 0.45,
			'2030': 0.65,
			'2031': 0.85,
			'2032': 1.0,
			'2033': 1.0,
			'2034': 1.0,
			'2035': 1.0,
			'2036': 1.0
		},
		M5: {
			'2027': 0.1,
			'2028': 0.25,
			'2029': 0.45,
			'2030': 0.65,
			'2031': 0.85,
			'2032': 1.0,
			'2033': 1.0,
			'2034': 1.0,
			'2035': 1.0,
			'2036': 1.0
		},
		M6: {
			'2027': 0.2,
			'2028': 0.4,
			'2029': 0.6,
			'2030': 0.8,
			'2031': 1.0,
			'2032': 1.0,
			'2033': 1.0,
			'2034': 1.0,
			'2035': 1.0,
			'2036': 1.0
		},
		M7: {
			'2027': 0.15,
			'2028': 0.3,
			'2029': 0.5,
			'2030': 0.7,
			'2031': 0.85,
			'2032': 1.0,
			'2033': 1.0,
			'2034': 1.0,
			'2035': 1.0,
			'2036': 1.0
		},
		M8: {
			'2027': 0.25,
			'2028': 0.5,
			'2029': 0.75,
			'2030': 1.0,
			'2031': 1.0,
			'2032': 1.0,
			'2033': 1.0,
			'2034': 1.0,
			'2035': 1.0,
			'2036': 1.0
		}
	},
	backlogAbsorption: {
		'2027': 0.25,
		'2028': 0.3,
		'2029': 0.3,
		'2030': 0.15,
		'2031': 0.0,
		'2032': 0.0,
		'2033': 0.0,
		'2034': 0.0,
		'2035': 0.0,
		'2036': 0.0
	},
	central: {
		total: {
			'2027': 1002.2209767152915,
			'2028': 1664.5440518691048,
			'2029': 2427.056864653606,
			'2030': 3128.449368669538,
			'2031': 3128.6202681434206,
			'2032': 3358.5976807800994,
			'2033': 3372.765621350149,
			'2034': 3384.8371713246033,
			'2035': 3392.8868765322413,
			'2036': 3400.9381859196155
		},
		byMeasure: {
			M1: {
				'2027': 188.88810021680413,
				'2028': 346.6258006356038,
				'2029': 538.5564003630051,
				'2030': 702.2277523856123,
				'2031': 668.8312850061584,
				'2032': 673.3184436933727,
				'2033': 677.809211784991,
				'2034': 682.3035892810133,
				'2035': 685.301846169697,
				'2036': 688.3017072381159
			},
			M2: {
				'2027': 345.21368338166707,
				'2028': 481.2186591568187,
				'2029': 592.8223909881824,
				'2030': 556.8199031006067,
				'2031': 372.01243943787915,
				'2032': 372.01243943787915,
				'2033': 372.01243943787915,
				'2034': 372.01243943787915,
				'2035': 372.01243943787915,
				'2036': 372.01243943787915
			},
			M3: {
				'2027': 32.0,
				'2028': 84.1,
				'2029': 156.3,
				'2030': 220.3,
				'2031': 244.1,
				'2032': 258.1,
				'2033': 260.2,
				'2034': 260.2,
				'2035': 260.2,
				'2036': 260.2
			},
			M4: {
				'2027': 26.34003568164023,
				'2028': 66.41745536382214,
				'2029': 120.36842692487888,
				'2030': 175.04562717037925,
				'2031': 230.4490561003232,
				'2032': 272.4782153719473,
				'2033': 273.839894155279,
				'2034': 275.20157293861075,
				'2035': 276.10935879416525,
				'2036': 277.01714464971985
			},
			M5: {
				'2027': 36.1789008974,
				'2028': 91.0434373595,
				'2029': 164.73669381414,
				'2030': 239.19306721725997,
				'2031': 314.41255756886,
				'2032': 371.32797082999997,
				'2033': 372.7588151084,
				'2034': 374.1896593868,
				'2035': 375.1435555724,
				'2036': 376.097451758
			},
			M6: {
				'2027': 103.36865851778,
				'2028': 208.44076331336,
				'2029': 314.7052805034,
				'2030': 422.33255471568003,
				'2031': 531.3225859502,
				'2032': 533.8777553668999,
				'2033': 536.4329247836,
				'2034': 538.9880942003,
				'2035': 540.6915404781,
				'2036': 542.3949867558999
			},
			M7: {
				'2027': 112.115974,
				'2028': 219.09668799999997,
				'2029': 362.48079999999993,
				'2030': 507.05396799999994,
				'2031': 610.6458479999999,
				'2032': 720.63636,
				'2033': 722.8658399999999,
				'2034': 725.09532,
				'2035': 726.58164,
				'2036': 728.0679600000001
			},
			M8: {
				'2027': 158.11562401999998,
				'2028': 167.60124804,
				'2029': 177.08687206,
				'2030': 305.47649608,
				'2031': 156.84649608,
				'2032': 156.84649608,
				'2033': 156.84649608,
				'2034': 156.84649608,
				'2035': 156.84649608,
				'2036': 156.84649608
			}
		}
	}
};

export interface SanidadCalendarPhase {
	id: string;
	key: string;
	years: number[];
	icon: string;
	nombre: string;
	desc: string;
}

export const PHASES: SanidadCalendarPhase[] = [
	{
		id: 'p1',
		key: 'f1',
		years: [2027, 2028, 2029],
		icon: '▶',
		nombre: 'Rescate y reglas comunes',
		desc: 'Medición homogénea de esperas y plantillas; refuerzo de Atención Primaria y salud mental; estabilidad profesional; auditoría de la cartera común; línea base pública de indicadores.'
	},
	{
		id: 'p2',
		key: 'f2',
		years: [2030, 2031, 2032],
		icon: '◆',
		nombre: 'Garantías e igualdad',
		desc: 'Respuesta inicial en 48 horas para al menos el 90%; garantías de espera con alternativa pública; extensión de salud mental comunitaria y atención domiciliaria; ampliación bucodental y redes rurales; información clínica esencial accesible.'
	},
	{
		id: 'p3',
		key: 'f3',
		years: [2033, 2034, 2035, 2036],
		icon: '✓',
		nombre: 'Consolidación y corrección',
		desc: 'Cobertura general de cronicidad compleja; evaluación de resultados y desigualdades; revisión de prestaciones; corrección o retirada de medidas que no hayan funcionado.'
	}
];

export function phaseOfYear(y: string | number): SanidadCalendarPhase | undefined {
	const yearNum = typeof y === 'string' ? parseInt(y) : y;
	return PHASES.find((p) => p.years.includes(yearNum));
}

export interface SanidadCalendarMilestone {
	y1: number;
	y2: number;
	tipo: SanidadCalendarMilestoneType;
	texto: string;
}

/** Hitos por medida — transcritos literalmente del calendario oficial del plan. */
export const MILESTONES: Record<SanidadCalendarMeasureId, SanidadCalendarMilestone[]> = {
	M1: [
		{
			y1: 2027,
			y2: 2027,
			tipo: 'marcha',
			texto: 'Modelo común y línea base de Atención Primaria.'
		},
		{
			y1: 2028,
			y2: 2029,
			tipo: 'ampliacion',
			texto: 'Implantación prioritaria en las zonas con peor acceso.'
		},
		{
			y1: 2030,
			y2: 2030,
			tipo: 'garantia',
			texto: 'Objetivo del 90% de respuestas clínicas en 48 horas.'
		},
		{ y1: 2031, y2: 2036, tipo: 'evaluacion', texto: 'Revisión de resultados.' }
	],
	M2: [
		{
			y1: 2027,
			y2: 2027,
			tipo: 'marcha',
			texto: 'Norma de medición y bandas clínicas comunes.'
		},
		{ y1: 2028, y2: 2028, tipo: 'ampliacion', texto: 'Panel público y derecho de información.' },
		{
			y1: 2029,
			y2: 2036,
			tipo: 'ampliacion',
			texto: 'Derivación entre centros, disponible desde 2029.'
		},
		{
			y1: 2032,
			y2: 2032,
			tipo: 'garantia',
			texto: 'Cumplimiento completo de las garantías de espera acordadas.'
		}
	],
	M3: [
		{ y1: 2027, y2: 2027, tipo: 'marcha', texto: 'Registro y proyección común de profesionales.' },
		{
			y1: 2028,
			y2: 2028,
			tipo: 'ampliacion',
			texto: 'Primer paquete de estabilidad e incentivos.'
		},
		{ y1: 2028, y2: 2036, tipo: 'ampliacion', texto: 'Ajustes formativos anuales desde 2028.' },
		{ y1: 2031, y2: 2031, tipo: 'evaluacion', texto: 'Revisión estructural.' },
		{ y1: 2034, y2: 2034, tipo: 'evaluacion', texto: 'Revisión estructural.' }
	],
	M4: [
		{ y1: 2027, y2: 2028, tipo: 'marcha', texto: 'Refuerzo de crisis y continuidad asistencial.' },
		{ y1: 2028, y2: 2030, tipo: 'ampliacion', texto: 'Equipos comunitarios prioritarios.' },
		{
			y1: 2032,
			y2: 2032,
			tipo: 'garantia',
			texto: 'Cobertura territorial progresiva completada.'
		},
		{ y1: 2033, y2: 2036, tipo: 'consolidacion', texto: 'Consolidación y evaluación.' }
	],
	M5: [
		{ y1: 2027, y2: 2027, tipo: 'marcha', texto: 'Definición del modelo y grupos prioritarios.' },
		{
			y1: 2028,
			y2: 2030,
			tipo: 'ampliacion',
			texto: 'Despliegue en las áreas con mayor envejecimiento.'
		},
		{ y1: 2033, y2: 2033, tipo: 'garantia', texto: 'Cobertura general de la población compleja.' }
	],
	M6: [
		{ y1: 2027, y2: 2027, tipo: 'marcha', texto: 'Financiación y tablero básico de indicadores.' },
		{ y1: 2028, y2: 2028, tipo: 'ampliacion', texto: 'Planes territoriales de prevención.' },
		{
			y1: 2029,
			y2: 2036,
			tipo: 'evaluacion',
			texto: 'Evaluación bienal y revisión de la cartera preventiva.'
		}
	],
	M7: [
		{ y1: 2027, y2: 2027, tipo: 'marcha', texto: 'Auditoría de la cartera de servicios.' },
		{ y1: 2027, y2: 2030, tipo: 'ampliacion', texto: 'Refuerzo rural y bucodental.' },
		{ y1: 2029, y2: 2031, tipo: 'evaluacion', texto: 'Evaluación y posible incorporación óptica.' },
		{
			y1: 2031,
			y2: 2034,
			tipo: 'consolidacion',
			texto: 'Revisión de cohesión territorial y extensión.'
		}
	],
	M8: [
		{ y1: 2027, y2: 2027, tipo: 'marcha', texto: 'Catálogo y estándares comunes de información.' },
		{
			y1: 2028,
			y2: 2030,
			tipo: 'ampliacion',
			texto: 'Trazabilidad y panel ciudadano progresivos.'
		},
		{
			y1: 2030,
			y2: 2030,
			tipo: 'garantia',
			texto: 'Interoperabilidad clínica esencial completa.'
		},
		{ y1: 2031, y2: 2036, tipo: 'consolidacion', texto: 'Mejora continua.' }
	]
};

export const VERIFY: Record<SanidadCalendarMeasureId, string> = {
	M1: 'Que al menos el 90% de las consultas urgentes de Atención Primaria reciban respuesta clínica en 48 horas — objetivo fijado para 2030.',
	M2: 'Que las garantías de espera acordadas se cumplan por completo — objetivo fijado para 2032.',
	M3: 'Que las revisiones estructurales de 2031 y 2034 confirmen que la oferta adicional cubre las necesidades detectadas de profesionales.',
	M4: 'Que la cobertura territorial progresiva de salud mental esté completa en 2032, y que la consolidación 2033–2036 confirme que se sostiene.',
	M5: 'Que la cobertura general de la población con cronicidad compleja esté completa en 2033.',
	M6: 'Que la evaluación bienal desde 2029 confirme mejoras reales de salud pública, no solo actividad registrada.',
	M7: 'Que la evaluación de 2029–2031 determine si procede incorporar la vía óptica, y que la revisión de 2034 confirme que se ha reducido la desigualdad territorial.',
	M8: 'Que la interoperabilidad clínica esencial esté completa en 2030 y se mantenga con mejora continua hasta 2036.'
};

export const TIPO_LABEL: Record<SanidadCalendarMilestoneType, string> = {
	marcha: 'Puesta en marcha',
	ampliacion: 'Ampliación',
	garantia: 'Garantía',
	evaluacion: 'Evaluación',
	consolidacion: 'Consolidación'
};

export const STATUS_LABEL: Record<SanidadCalendarMilestoneStatus, string> = {
	starts: 'Comienza este año',
	continues: 'Continúa',
	ends: 'Finaliza este año'
};

/**
 * Formato monetario único, basado en Intl.NumberFormat('es-ES'): punto de
 * miles, coma decimal, y como máximo `decimals` decimales (sin ceros de
 * relleno cuando el valor es exacto). Idéntico al del artifact de
 * referencia — useGrouping:true (no 'auto') es lo que evita que números de
 * 4 cifras como 3359 pierdan el separador de millar.
 */
export function formatMoney(n: number, decimals = 0): string {
	return new Intl.NumberFormat('es-ES', {
		minimumFractionDigits: 0,
		maximumFractionDigits: decimals,
		useGrouping: true
	}).format(n);
}
export function fmt(n: number): string {
	return formatMoney(n, 0);
}
export function fmt1(n: number): string {
	return formatMoney(n, 1);
}
export function pct(n: number): string {
	return Math.round(n * 100) + '%';
}

export interface ResolvedMeasureYear {
	mid: SanidadCalendarMeasureId;
	year: number;
	principal: SanidadCalendarMilestone;
	principalStatus: SanidadCalendarMilestoneStatus;
	closure: boolean;
	finalYear: number;
	secondary: (SanidadCalendarMilestone & { status: SanidadCalendarMilestoneStatus })[];
}

/**
 * FUNCIÓN CENTRALIZADA — resuelve, para una medida y un año, la etapa
 * principal, su estado ese año, las actuaciones secundarias activas por
 * rango y si la planificación documentada ha concluido.
 *
 * Reglas:
 * 1. La etapa principal es siempre la del último hito cuyo y1 <= año.
 *    Como el conjunto de hitos elegibles solo crece al avanzar el año,
 *    la etapa principal nunca retrocede.
 * 2. Si el año cae fuera del rango [y1,y2] del hito principal (hueco
 *    entre dos hitos, p. ej. M4/M5 en 2031), la etapa principal sigue
 *    vigente por persistencia — se informa como "Continúa".
 * 3. El cierre real se calcula con el mayor y2 de TODOS los hitos de la
 *    medida (no el último elemento del array), así una actuación larga
 *    (p. ej. M2 2029–2036 o M3 2028–2036) impide marcar la medida como
 *    cerrada mientras siga dentro de ese rango.
 * 4. Los demás hitos cuyo rango cubre el año (solapados con el principal)
 *    se listan como actuaciones secundarias que continúan, comienzan o
 *    finalizan ese año — nunca sustituyen a la principal.
 *
 * Puerto literal de resolveMeasureYear() del artifact de referencia: no
 * simplificar ni reinterpretar esta lógica.
 */
export function resolveMeasureYear(
	mid: SanidadCalendarMeasureId,
	year: string | number
): ResolvedMeasureYear {
	const y = typeof year === 'string' ? parseInt(year) : year;
	const list = MILESTONES[mid]; // orden cronológico de inicio (y1)

	// Etapa principal: último hito con y1 <= año (nunca retrocede)
	let principal: SanidadCalendarMilestone | null = null;
	list.forEach((ms) => {
		if (ms.y1 <= y && (!principal || ms.y1 >= principal.y1)) principal = ms;
	});
	if (!principal) principal = list[0];
	const resolvedPrincipal: SanidadCalendarMilestone = principal;

	// Cierre real: por el mayor y2 de TODOS los hitos, no el último del array
	const finalYear = Math.max(...list.map((ms) => ms.y2));
	const closure = y > finalYear;

	// Estado del hito principal este año
	let principalStatus: SanidadCalendarMilestoneStatus;
	if (resolvedPrincipal.y1 === y) principalStatus = 'starts';
	else if (resolvedPrincipal.y1 <= y && resolvedPrincipal.y2 === y) principalStatus = 'ends';
	else principalStatus = 'continues'; // cubre el año, o persiste tras su rango explícito

	// Actuaciones secundarias: cualquier otro hito cuyo rango cubra el año
	const secondary = list
		.filter((ms) => ms !== resolvedPrincipal && ms.y1 <= y && ms.y2 >= y)
		.map((ms) => {
			let status: SanidadCalendarMilestoneStatus;
			if (ms.y1 === y) status = 'starts';
			else if (ms.y2 === y) status = 'ends';
			else status = 'continues';
			return { ...ms, status };
		});

	return {
		mid,
		year: y,
		principal: resolvedPrincipal,
		principalStatus,
		closure,
		finalYear,
		secondary
	};
}

/** Envoltorio de compatibilidad: misma forma que antes ({...hito, closure}), usado donde solo hace falta la etapa principal (ficha, vista "Todas"). */
export function currentStage(
	mid: SanidadCalendarMeasureId,
	year: string | number
): SanidadCalendarMilestone & { closure: boolean } {
	const r = resolveMeasureYear(mid, year);
	return { ...r.principal, closure: r.closure };
}

export interface YearActiveMilestone {
	mid: SanidadCalendarMeasureId;
	tipo: SanidadCalendarMilestoneType;
	texto: string;
	status: SanidadCalendarMilestoneStatus;
	isPrincipal: boolean;
	closure?: boolean;
	finalYear?: number;
}

/**
 * Actuaciones activas de TODAS las medidas para un año, construidas a
 * partir de resolveMeasureYear(): la etapa principal de cada medida
 * siempre aparece (marcada como tal), y cualquier actuación secundaria
 * que solape con ella se añade a continuación — sin duplicados y sin
 * contradecir la etapa principal (p. ej. M2 desde 2032 nunca vuelve a
 * mostrarse como "Ampliación").
 */
export function yearActiveMilestones(
	measureIds: SanidadCalendarMeasureId[],
	year: string | number
): YearActiveMilestone[] {
	const y = typeof year === 'string' ? parseInt(year) : year;
	const items: YearActiveMilestone[] = [];
	measureIds.forEach((mid) => {
		const r = resolveMeasureYear(mid, y);
		items.push({
			mid,
			tipo: r.principal.tipo,
			texto: r.principal.texto,
			status: r.principalStatus,
			isPrincipal: true,
			closure: r.closure,
			finalYear: r.finalYear
		});
		r.secondary.forEach((ms) => {
			items.push({ mid, tipo: ms.tipo, texto: ms.texto, status: ms.status, isPrincipal: false });
		});
	});
	return items;
}

export interface NextHitoInfo {
	label: string;
	ms: SanidadCalendarMilestone;
	closure: boolean;
}

/**
 * Devuelve el hito de referencia respecto a un año: nunca uno ya pasado.
 * - Si algo arranca justo ese año -> "Hito de este año".
 * - Si hay algo posterior -> "Próximo hito" (el más cercano).
 * - Si no queda nada posterior -> cierre del plan, con la última actuación real.
 */
export function nextHitoInfo(
	mid: SanidadCalendarMeasureId,
	fromYear: string | number
): NextHitoInfo {
	const list = MILESTONES[mid];
	const fy = typeof fromYear === 'string' ? parseInt(fromYear) : fromYear;

	const startingNow = list.filter((ms) => ms.y1 === fy);
	if (startingNow.length) {
		const preferred =
			startingNow.find((ms) => ms.tipo === 'garantia') || startingNow[startingNow.length - 1];
		return { label: 'Hito de este año', ms: preferred, closure: false };
	}

	const future = list.filter((ms) => ms.y1 > fy).sort((a, b) => a.y1 - b.y1);
	if (future.length) {
		return { label: 'Próximo hito', ms: future[0], closure: false };
	}

	const ongoing = list.filter((ms) => ms.y1 <= fy && ms.y2 >= fy);
	const ref = ongoing.length ? ongoing[ongoing.length - 1] : list[list.length - 1];
	return { label: 'Hasta el cierre del plan (2036)', ms: ref, closure: true };
}
