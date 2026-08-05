/**
 * Relaciones para el mapa visual interactivo de cada plan (Vivienda, Sanidad).
 *
 * Este archivo NUNCA duplica contenido: solo declara qué medida pertenece a
 * qué causa/eje/resultado y en qué estado está en cada fase del calendario.
 * Los textos (títulos, inversión, plazo, explicaciones) siempre se leen en
 * tiempo real desde `topic` / `measures` / `axes` / `timelinePhases`,
 * cargados por `+page.ts` desde Supabase.
 *
 * Modelo narrativo: PROBLEMA → CAUSAS → EJES DE RESPUESTA → MEDIDAS →
 * CALENDARIO → RESULTADOS. Las causas son el "por qué" (diagnóstico), los
 * ejes son la estrategia de respuesta del plan (antes etiquetados por error
 * como "causas"), las medidas son las actuaciones concretas.
 */

// El estado de una medida (MeasureState) y sus etiquetas viven en $lib/types
// y $lib/labels — misma fuente que usa la tabla topic_measure_phase_status
// (Calendario). Se reexportan aquí para no romper los imports existentes.
import type { MeasureState } from '$lib/types';
export type { MeasureState };
export { measureStateLabels } from '$lib/labels';

export interface PlanMapCause {
	id: string;
	label: string;
	description: string;
	/** Ejes de respuesta a los que alimenta esta causa (ids de PlanMapAxis). */
	axisIds: string[];
}

export interface PlanMapAxis {
	/** Vivienda: topic_measure_axes.id real (así el título se lee de `axes`, sin duplicarlo aquí). Sanidad: id sintético, no hay axes en BD. */
	id: string;
	/** Obligatorio solo cuando no hay un axis real en BD del que leer el título (Sanidad). */
	label?: string;
	description: string;
	/** Medidas directas: obligatorio para planes sin axisId real (Sanidad); para Vivienda se deriva de measure.axisId === axis.id. */
	measureIds?: string[];
}

export interface PlanMapResult {
	id: string;
	label: string;
	description: string;
	measureIds: string[];
	/** Prefijo de categoría dentro de topic.successIndicators (antes del " — "). */
	indicatorCategory?: string;
}

export interface PlanMapPhaseState {
	measureId: string;
	/** Índice (posición en el array) de topic_timeline_phases. */
	phaseIndex: number;
	state: MeasureState;
}

export interface PlanMapData {
	/** Frase-resumen breve del problema para la primera capa del mapa (no el problem_intro completo). */
	problemHeadline: string;
	causes: PlanMapCause[];
	axes: PlanMapAxis[];
	results: PlanMapResult[];
	phaseStates: PlanMapPhaseState[];
}

// ---------------------------------------------------------------------------
// Vivienda — Plan Vivienda 2036
// ---------------------------------------------------------------------------

const VIVIENDA_AXIS = {
	construir: 'f828ce1d-03c3-41ad-b794-80bdaa037c79', // EJE 1 — CONSTRUIR MÁS VIVIENDA
	alquiler: 'd17ec934-c3bf-4251-adfc-395549c23102', // EJE 2 — MEJORAR EL ALQUILER
	aprovechar: 'e05faa38-c796-45cf-98fa-cc968eca9520', // EJE 3 — APROVECHAR MEJOR LO QUE YA EXISTE
	proteger: '1345daee-62fc-46e6-afe2-74a4a7574d78' // EJE 4 — PROTEGER EL ACCESO A LA VIVIENDA
} as const;

const VIVIENDA_MEASURE = {
	parquePublico: 'f8aae7fb-b10e-4bc3-aa0f-392f40a2909f',
	construir: '75d63251-606a-4183-b15f-bd20483e7a7e',
	alquilerSeguro: '1dc4e177-62b2-4dce-bcdd-ed6e6326e45e',
	contencionPrecios: '83961c13-3549-4721-a621-a9fd6484c160',
	viviendaVacia: '69407eba-ce7a-485d-bdcb-f878cb287c99',
	pisosTuristicos: 'c9a35a5e-5219-41e8-afb2-f007dd84984a',
	ayudasJovenes: 'c7b13817-5499-49ef-9c2b-22cb5a975a8b',
	prevencionDesahucios: 'd152d8e4-efda-41a7-8ae3-bbffb74cff2e'
} as const;

export const viviendaMapData: PlanMapData = {
	problemHeadline:
		'España no tiene un único problema de vivienda: faltan viviendas donde hay demanda, sobran donde no la hay, el parque público es reducido y muchos hogares no pueden asumir el coste de vivir.',
	// Las 8 causas están tomadas literalmente de los 8 puntos numerados del
	// bloque "DIAGNÓSTICO: QUÉ ESTÁ PASANDO" en problem_intro. No son la
	// estrategia del plan (eso son los ejes): son el porqué del problema.
	causes: [
		{
			id: 'oferta-insuficiente',
			label: 'Oferta insuficiente en zonas tensionadas',
			description:
				'Se crean más hogares que viviendas en las grandes áreas urbanas, zonas turísticas y territorios con crecimiento demográfico.',
			axisIds: [VIVIENDA_AXIS.construir]
		},
		{
			id: 'precios',
			label: 'Los precios crecen más rápido que los ingresos',
			description:
				'Desde 2014 los precios de compraventa y alquiler han crecido más que la capacidad económica de muchos hogares, especialmente jóvenes y rentas bajas.',
			axisIds: [VIVIENDA_AXIS.alquiler, VIVIENDA_AXIS.proteger]
		},
		{
			id: 'alquiler-insuficiente',
			label: 'El alquiler ha crecido en peso pero no en oferta',
			description:
				'El alquiler gana importancia frente a otros países europeos, pero la oferta residencial no ha aumentado al mismo ritmo que la demanda en zonas tensionadas.',
			axisIds: [VIVIENDA_AXIS.alquiler]
		},
		{
			id: 'parque-reducido',
			label: 'El parque público es reducido y no se ha conservado',
			description:
				'España tiene un parque público pequeño frente a la media europea, y parte de la vivienda protegida construida en el pasado acabó vendiéndose como vivienda libre.',
			axisIds: [VIVIENDA_AXIS.construir]
		},
		{
			id: 'vivienda-vacia',
			label: 'La vivienda vacía no siempre coincide con la necesidad',
			description:
				'No toda vivienda estadísticamente vacía es habitable o está donde hace falta: puede estar en reforma, heredada o en zonas sin demanda.',
			axisIds: [VIVIENDA_AXIS.aprovechar]
		},
		{
			id: 'presion-turistica',
			label: 'Los pisos turísticos afectan de forma desigual al territorio',
			description:
				'Una vivienda turística en un municipio rural no tiene el mismo efecto que la concentración de alojamientos turísticos en un barrio tensionado.',
			axisIds: [VIVIENDA_AXIS.aprovechar]
		},
		{
			id: 'tramites-lentos',
			label: 'Los trámites y la falta de coordinación retrasan la oferta',
			description:
				'Construir depende de planeamiento, licencias, financiación y coordinación entre Estado, comunidades y ayuntamientos, lo que ralentiza la oferta nueva.',
			axisIds: [VIVIENDA_AXIS.construir]
		},
		{
			id: 'emergencias-tardias',
			label: 'Las emergencias residenciales se atienden demasiado tarde',
			description:
				'Muchas familias reciben ayuda solo cuando la deuda ya es alta o existe una orden de desahucio, en vez de intervenir antes.',
			axisIds: [VIVIENDA_AXIS.proteger]
		}
	],
	// Los 4 ejes son la estrategia de respuesta del plan (antes mal
	// etiquetados como "causas"). Para Vivienda coinciden con los 4 EJE de
	// topic_measure_axes: el título se lee de ahí, aquí solo añadimos una
	// descripción de qué resuelve cada eje.
	axes: [
		{
			id: VIVIENDA_AXIS.construir,
			description: 'Aumentar la oferta donde hace falta y crear un parque público permanente.'
		},
		{
			id: VIVIENDA_AXIS.alquiler,
			description:
				'Dar seguridad al inquilino y al propietario, y contener precios mientras llega nueva oferta.'
		},
		{
			id: VIVIENDA_AXIS.aprovechar,
			description:
				'Movilizar hacia uso residencial lo que ya existe: vivienda vacía y pisos turísticos.'
		},
		{
			id: VIVIENDA_AXIS.proteger,
			description:
				'Proteger a quien más lo necesita: jóvenes sin inflar precios, y emergencias atendidas a tiempo.'
		}
	],
	results: [
		{
			id: 'parque-publico',
			label: 'Parque público al 5 % en 2036',
			description:
				'Aproximar el parque público de vivienda al 5 % en 2036, con protección permanente frente a su venta posterior.',
			measureIds: [VIVIENDA_MEASURE.parquePublico],
			indicatorCategory: 'A. Parque público'
		},
		{
			id: 'mas-oferta',
			label: 'Más vivienda donde hace falta',
			description:
				'Reducir el desajuste entre los hogares que se crean y las viviendas que se terminan en las zonas con más demanda.',
			measureIds: [VIVIENDA_MEASURE.construir],
			indicatorCategory: 'B. Oferta de vivienda'
		},
		{
			id: 'alquiler-asequible',
			label: 'Alquiler más asequible y seguro',
			description:
				'Un alquiler más asequible y estable, con vivienda vacía y turística movilizada progresivamente hacia uso residencial.',
			measureIds: [
				VIVIENDA_MEASURE.alquilerSeguro,
				VIVIENDA_MEASURE.contencionPrecios,
				VIVIENDA_MEASURE.viviendaVacia,
				VIVIENDA_MEASURE.pisosTuristicos
			],
			indicatorCategory: 'C. Alquiler'
		},
		{
			id: 'acceso-justo',
			label: 'Acceso y emancipación más justos',
			description:
				'Que emanciparse o acceder a una vivienda no dependa solo de la renta familiar, una herencia o el municipio de nacimiento.',
			measureIds: [VIVIENDA_MEASURE.ayudasJovenes],
			indicatorCategory: 'D. Acceso y emancipación'
		},
		{
			id: 'menos-desahucios',
			label: 'Menos emergencias residenciales',
			description:
				'Menos familias llegan a un desahucio evitable gracias a la intervención temprana.',
			measureIds: [VIVIENDA_MEASURE.prevencionDesahucios],
			indicatorCategory: 'E. Prevención de desahucios'
		}
	],
	// Fases de Vivienda (posición en el array): 0 = Primeros 100 días,
	// 1 = 2027-2028, 2 = 2029-2031, 3 = 2032-2034, 4 = 2035-2036. El estado de
	// cada medida en cada fase está derivado literalmente de los años ya
	// escritos en measure.timeframe. Una medida solo aparece en la fase 0
	// cuando su propio plazo, o la lista de entregables de "Primeros 100
	// días" ya publicada, la menciona explícitamente — measures 4, 5, 6 y 7
	// no tienen entregable propio a 100 días y por eso no aparecen ahí.
	phaseStates: [
		// 1. Crear un parque público que nunca pueda venderse
		{ measureId: VIVIENDA_MEASURE.parquePublico, phaseIndex: 0, state: 'preparacion' },
		{ measureId: VIVIENDA_MEASURE.parquePublico, phaseIndex: 1, state: 'piloto' },
		{ measureId: VIVIENDA_MEASURE.parquePublico, phaseIndex: 2, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.parquePublico, phaseIndex: 3, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.parquePublico, phaseIndex: 4, state: 'consolidacion' },
		// 2. Construir mucho más donde realmente hace falta
		{ measureId: VIVIENDA_MEASURE.construir, phaseIndex: 0, state: 'preparacion' },
		{ measureId: VIVIENDA_MEASURE.construir, phaseIndex: 1, state: 'preparacion' },
		{ measureId: VIVIENDA_MEASURE.construir, phaseIndex: 2, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.construir, phaseIndex: 3, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.construir, phaseIndex: 4, state: 'consolidacion' },
		// 3. Un alquiler seguro para las dos partes
		{ measureId: VIVIENDA_MEASURE.alquilerSeguro, phaseIndex: 0, state: 'piloto' },
		{ measureId: VIVIENDA_MEASURE.alquilerSeguro, phaseIndex: 1, state: 'piloto' },
		{ measureId: VIVIENDA_MEASURE.alquilerSeguro, phaseIndex: 2, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.alquilerSeguro, phaseIndex: 3, state: 'consolidacion' },
		// 4. Contener precios mientras llega nueva oferta
		{ measureId: VIVIENDA_MEASURE.contencionPrecios, phaseIndex: 1, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.contencionPrecios, phaseIndex: 2, state: 'evaluacion' },
		{ measureId: VIVIENDA_MEASURE.contencionPrecios, phaseIndex: 3, state: 'evaluacion' },
		{ measureId: VIVIENDA_MEASURE.contencionPrecios, phaseIndex: 4, state: 'consolidacion' },
		// 5. Movilizar vivienda vacía
		{ measureId: VIVIENDA_MEASURE.viviendaVacia, phaseIndex: 1, state: 'piloto' },
		{ measureId: VIVIENDA_MEASURE.viviendaVacia, phaseIndex: 2, state: 'consolidacion' },
		// 6. Regular pisos turísticos barrio por barrio
		{ measureId: VIVIENDA_MEASURE.pisosTuristicos, phaseIndex: 1, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.pisosTuristicos, phaseIndex: 2, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.pisosTuristicos, phaseIndex: 3, state: 'evaluacion' },
		{ measureId: VIVIENDA_MEASURE.pisosTuristicos, phaseIndex: 4, state: 'evaluacion' },
		// 7. Ayudar a los jóvenes sin inflar precios
		{ measureId: VIVIENDA_MEASURE.ayudasJovenes, phaseIndex: 1, state: 'piloto' },
		{ measureId: VIVIENDA_MEASURE.ayudasJovenes, phaseIndex: 2, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.ayudasJovenes, phaseIndex: 3, state: 'consolidacion' },
		// 8. Evitar que una emergencia termine en desahucio
		{ measureId: VIVIENDA_MEASURE.prevencionDesahucios, phaseIndex: 0, state: 'piloto' },
		{ measureId: VIVIENDA_MEASURE.prevencionDesahucios, phaseIndex: 1, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.prevencionDesahucios, phaseIndex: 2, state: 'despliegue' },
		{ measureId: VIVIENDA_MEASURE.prevencionDesahucios, phaseIndex: 3, state: 'consolidacion' },
		{ measureId: VIVIENDA_MEASURE.prevencionDesahucios, phaseIndex: 4, state: 'evaluacion' }
	]
};

// ---------------------------------------------------------------------------
// Sanidad — Plan Sanidad 2036
// ---------------------------------------------------------------------------
//
// Revisado y validado (punto de control 3, 2026-08-05): causas tomadas
// literalmente del problem_intro, ejes de las 6 categorías porcentuales de
// budget_narrative, resultados de los 5 topic_commitments. phaseStates
// corregido tras contrastar cada medida contra su timeframe real: listas de
// espera (fase 1: despliegue→consolidación), y cronicidad/prevención/
// cohesión territorial/información y datos (fase 0: preparación→piloto, ya
// describían acciones concretas dentro de 2027-2029).

const SANIDAD_MEASURE = {
	atencionPrimaria: 'e8c3c0c5-aa16-4618-9f4d-5e5a0e4e329d',
	listasEspera: '1ebaa7a3-3ed5-462e-9768-ca954c073c52',
	pactoProfesionales: 'e8569cb9-91b8-4079-bdb9-ff44aabaa9f5',
	saludMental: 'd18d66e0-9f0b-4fc4-9559-2ba41254ac24',
	cronicidad: '4b35df1b-ffd0-4f14-a298-0dcd8d1d1070',
	prevencion: '2709d709-6285-43bd-8744-f57965be02b0',
	cohesionTerritorial: '6592b248-dcff-41f6-8867-863157b6da79',
	informacionDatos: 'b9fb296b-e12c-48b1-a170-c9a4909393dd'
} as const;

const SANIDAD_AXIS = {
	primariaProfesionales: 'sanidad-eje-primaria-profesionales',
	mentalCronicidad: 'sanidad-eje-mental-cronicidad',
	esperas: 'sanidad-eje-esperas',
	territorial: 'sanidad-eje-territorial',
	prevencion: 'sanidad-eje-prevencion',
	datos: 'sanidad-eje-datos'
} as const;

export const sanidadMapData: PlanMapData = {
	problemHeadline:
		'España no necesita elegir entre defender su sanidad pública o reconocer sus problemas: las esperas, la inestabilidad de las plantillas, las diferencias territoriales, el envejecimiento y la fragmentación de la información se alimentan entre sí.',
	// Las 5 causas están tomadas literalmente de la frase del problem_intro que
	// las nombra. Salud mental y Prevención no tienen una causa propia igual
	// de explícita en el texto (no se fuerza la relación).
	causes: [
		{
			id: 'esperas',
			label: 'Las esperas',
			description:
				'Listas de espera y falta de resolución en el primer contacto alargan la atención más allá de lo razonable.',
			axisIds: [SANIDAD_AXIS.esperas, SANIDAD_AXIS.primariaProfesionales]
		},
		{
			id: 'plantillas',
			label: 'Inestabilidad de las plantillas',
			description:
				'La temporalidad y la rotación de profesionales debilitan la continuidad asistencial.',
			axisIds: [SANIDAD_AXIS.primariaProfesionales]
		},
		{
			id: 'territorio',
			label: 'Diferencias territoriales',
			description: 'El lugar de residencia condiciona hoy el acceso efectivo a la sanidad pública.',
			axisIds: [SANIDAD_AXIS.territorial]
		},
		{
			id: 'envejecimiento',
			label: 'Envejecimiento',
			description:
				'Una población más envejecida exige atención a la cronicidad coordinada entre Primaria, hospital y servicios sociales.',
			axisIds: [SANIDAD_AXIS.mentalCronicidad]
		},
		{
			id: 'fragmentacion-datos',
			label: 'Fragmentación de la información',
			description:
				'Sin datos comparables entre administraciones no se puede rendir cuentas ni corregir lo que falla.',
			axisIds: [SANIDAD_AXIS.datos]
		}
	],
	// Los 6 ejes de respuesta están tomados de las 6 categorías porcentuales
	// ya existentes en budget_narrative (40/20/15/10/8/7 % del esfuerzo
	// adicional) — la misma agrupación ya usada para repartir la inversión.
	axes: [
		{
			id: SANIDAD_AXIS.primariaProfesionales,
			label: 'Atención Primaria y estabilidad profesional',
			description:
				'Resolver desde la puerta de entrada y estabilizar a los equipos que la sostienen.',
			measureIds: [SANIDAD_MEASURE.atencionPrimaria, SANIDAD_MEASURE.pactoProfesionales]
		},
		{
			id: SANIDAD_AXIS.mentalCronicidad,
			label: 'Salud mental, cronicidad y atención domiciliaria',
			description:
				'Redes comunitarias y equipos coordinados para la salud mental y el envejecimiento.',
			measureIds: [SANIDAD_MEASURE.saludMental, SANIDAD_MEASURE.cronicidad]
		},
		{
			id: SANIDAD_AXIS.esperas,
			label: 'Capacidad y garantías de espera',
			description:
				'Medir las esperas con una vara común y ofrecer alternativa cuando se incumplan.',
			measureIds: [SANIDAD_MEASURE.listasEspera]
		},
		{
			id: SANIDAD_AXIS.territorial,
			label: 'Cohesión territorial',
			description: 'Que la cartera de servicios y el acceso rural no dependan del código postal.',
			measureIds: [SANIDAD_MEASURE.cohesionTerritorial]
		},
		{
			id: SANIDAD_AXIS.prevencion,
			label: 'Prevención y salud pública',
			description: 'Financiación estable para anticiparse en vez de solo tratar.',
			measureIds: [SANIDAD_MEASURE.prevencion]
		},
		{
			id: SANIDAD_AXIS.datos,
			label: 'Interoperabilidad y datos',
			description: 'Información clínica y cuentas públicas comparables entre administraciones.',
			measureIds: [SANIDAD_MEASURE.informacionDatos]
		}
	],
	// Los 5 resultados son literalmente los "cinco compromisos" ya existentes
	// del plan (topic_commitments). Las medidas relacionadas se derivan de la
	// propia descripción de cada compromiso (p. ej. "Los mismos derechos,
	// vivas donde vivas" menciona explícitamente prevención, salud mental y
	// atención rural).
	results: [
		{
			id: 'respuesta-48h',
			label: 'Respuesta inicial en 48 horas',
			description:
				'Toda persona debe recibir una valoración clínica real y una respuesta adecuada en un máximo de 48 horas.',
			measureIds: [SANIDAD_MEASURE.atencionPrimaria],
			indicatorCategory: 'Acceso'
		},
		{
			id: 'esperas-transparentes',
			label: 'Esperas transparentes y con alternativa',
			description:
				'Cada persona debe conocer el estado de su derivación, cuánto tiempo lleva esperando y qué alternativas públicas existen si se incumplen los plazos.',
			measureIds: [SANIDAD_MEASURE.listasEspera],
			indicatorCategory: 'Listas de espera'
		},
		{
			id: 'equipo-continuidad',
			label: 'Un equipo que conozca tu caso',
			description:
				'La atención debe organizarse alrededor de equipos estables que den continuidad al paciente, sin empezar de cero en cada consulta.',
			measureIds: [SANIDAD_MEASURE.pactoProfesionales, SANIDAD_MEASURE.cronicidad],
			indicatorCategory: 'Continuidad'
		},
		{
			id: 'mismos-derechos',
			label: 'Los mismos derechos, vivas donde vivas',
			description:
				'El lugar de residencia no debe determinar el acceso efectivo a tratamientos, prevención, salud mental, atención rural o prestaciones sanitarias esenciales.',
			measureIds: [
				SANIDAD_MEASURE.saludMental,
				SANIDAD_MEASURE.prevencion,
				SANIDAD_MEASURE.cohesionTerritorial
			],
			indicatorCategory: 'Equidad territorial'
		},
		{
			id: 'cuentas-publicas',
			label: 'Cuentas públicas',
			description:
				'Las administraciones deben publicar resultados comparables sobre esperas, personal, acceso y calidad, explicar los incumplimientos y aplicar medidas correctoras.',
			measureIds: [SANIDAD_MEASURE.informacionDatos],
			indicatorCategory: 'Cuentas públicas'
		}
	],
	// Fases de Sanidad (posición en el array): 0 = 2027-2029, 1 = 2030-2032,
	// 2 = 2033-2036. Estado derivado de los años ya escritos en
	// measure.timeframe.
	phaseStates: [
		// 1. Atención Primaria
		{ measureId: SANIDAD_MEASURE.atencionPrimaria, phaseIndex: 0, state: 'piloto' },
		{ measureId: SANIDAD_MEASURE.atencionPrimaria, phaseIndex: 1, state: 'despliegue' },
		{ measureId: SANIDAD_MEASURE.atencionPrimaria, phaseIndex: 2, state: 'consolidacion' },
		// 2. Listas de espera
		{ measureId: SANIDAD_MEASURE.listasEspera, phaseIndex: 0, state: 'preparacion' },
		{ measureId: SANIDAD_MEASURE.listasEspera, phaseIndex: 1, state: 'consolidacion' },
		// 3. Pacto profesionales
		{ measureId: SANIDAD_MEASURE.pactoProfesionales, phaseIndex: 0, state: 'preparacion' },
		{ measureId: SANIDAD_MEASURE.pactoProfesionales, phaseIndex: 1, state: 'despliegue' },
		{ measureId: SANIDAD_MEASURE.pactoProfesionales, phaseIndex: 2, state: 'consolidacion' },
		// 4. Salud mental
		{ measureId: SANIDAD_MEASURE.saludMental, phaseIndex: 0, state: 'piloto' },
		{ measureId: SANIDAD_MEASURE.saludMental, phaseIndex: 1, state: 'despliegue' },
		{ measureId: SANIDAD_MEASURE.saludMental, phaseIndex: 2, state: 'consolidacion' },
		// 5. Cronicidad
		{ measureId: SANIDAD_MEASURE.cronicidad, phaseIndex: 0, state: 'piloto' },
		{ measureId: SANIDAD_MEASURE.cronicidad, phaseIndex: 1, state: 'despliegue' },
		{ measureId: SANIDAD_MEASURE.cronicidad, phaseIndex: 2, state: 'consolidacion' },
		// 6. Prevención
		{ measureId: SANIDAD_MEASURE.prevencion, phaseIndex: 0, state: 'piloto' },
		{ measureId: SANIDAD_MEASURE.prevencion, phaseIndex: 1, state: 'evaluacion' },
		{ measureId: SANIDAD_MEASURE.prevencion, phaseIndex: 2, state: 'evaluacion' },
		// 7. Cohesión territorial
		{ measureId: SANIDAD_MEASURE.cohesionTerritorial, phaseIndex: 0, state: 'piloto' },
		{ measureId: SANIDAD_MEASURE.cohesionTerritorial, phaseIndex: 1, state: 'despliegue' },
		{ measureId: SANIDAD_MEASURE.cohesionTerritorial, phaseIndex: 2, state: 'evaluacion' },
		// 8. Información y datos
		{ measureId: SANIDAD_MEASURE.informacionDatos, phaseIndex: 0, state: 'piloto' },
		{ measureId: SANIDAD_MEASURE.informacionDatos, phaseIndex: 1, state: 'despliegue' },
		{ measureId: SANIDAD_MEASURE.informacionDatos, phaseIndex: 2, state: 'consolidacion' }
	]
};
