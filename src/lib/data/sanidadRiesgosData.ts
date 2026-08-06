// Datos transcritos literalmente de Base_Riesgos_Comprobacion_Plan_Sanidad_2036.md
// (vía el artifact riesgos_sanidad_2036). Las categorías visuales y las
// relaciones riesgo↔medida son organización editorial basada en su
// contenido, pensada para facilitar la navegación — no son contenido
// literal de la fuente ni una clasificación oficial.

export type SanidadRiesgoCategoriaId =
	| 'capacidad'
	| 'datos'
	| 'gobernanza'
	| 'profesionales'
	| 'equidad'
	| 'financiacion';

export interface SanidadRiesgoCategoria {
	nombre: string;
	icon: string;
}

export const CATEGORIES: Record<SanidadRiesgoCategoriaId, SanidadRiesgoCategoria> = {
	capacidad: { nombre: 'Capacidad', icon: '▲' },
	datos: { nombre: 'Integridad de los datos', icon: '◆' },
	gobernanza: { nombre: 'Gobernanza', icon: '■' },
	profesionales: { nombre: 'Profesionales', icon: '●' },
	equidad: { nombre: 'Equidad y acceso', icon: '◐' },
	financiacion: { nombre: 'Financiación y evaluación', icon: '▣' }
};

export type SanidadRiesgoMeasureId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8';

export interface SanidadRiesgo {
	id: string;
	categoria: SanidadRiesgoCategoriaId;
	riesgo: string;
	respuesta: string;
	medidas: SanidadRiesgoMeasureId[];
}

export const RISKS: SanidadRiesgo[] = [
	{
		id: 'r1',
		categoria: 'capacidad',
		riesgo: 'Prometer plazos sin personal',
		respuesta:
			'Implantación gradual, memoria de plantilla y financiación antes de activar cada garantía.',
		medidas: ['M1', 'M2']
	},
	{
		id: 'r2',
		categoria: 'datos',
		riesgo: 'Maquillar listas de espera',
		respuesta:
			'Definiciones comunes, percentiles, auditoría y seguimiento desde la indicación clínica.',
		medidas: ['M2']
	},
	{
		id: 'r3',
		categoria: 'gobernanza',
		riesgo: 'Invadir competencias autonómicas',
		respuesta:
			'Pacto en el Consejo Interterritorial, legislación básica limitada y ejecución territorial.',
		medidas: ['M5', 'M6', 'M7']
	},
	{
		id: 'r4',
		categoria: 'profesionales',
		riesgo: 'Contratar mucho sin retener',
		respuesta: 'Estabilidad, condiciones, carrera, equipos y evaluación de permanencia.',
		medidas: ['M3']
	},
	{
		id: 'r5',
		categoria: 'equidad',
		riesgo: 'Usar lo digital como barrera',
		respuesta: 'Alternativas presenciales y telefónicas, accesibilidad y medición de brecha digital.',
		medidas: ['M8']
	},
	{
		id: 'r6',
		categoria: 'equidad',
		riesgo: 'Convertir la atención domiciliaria en carga familiar',
		respuesta: 'Equipos profesionales, derecho a apoyos y evaluación de carga del cuidador.',
		medidas: ['M5']
	},
	{
		id: 'r7',
		categoria: 'capacidad',
		riesgo: 'Crear prestaciones sin capacidad',
		respuesta: 'Memoria económica, profesionales y calendario antes del anuncio.',
		medidas: ['M7']
	},
	{
		id: 'r8',
		categoria: 'gobernanza',
		riesgo: 'Privatización estructural por la vía de urgencia',
		respuesta:
			'Contingencias temporales, contratos transparentes y obligación de desarrollar capacidad pública.',
		medidas: ['M2']
	},
	{
		id: 'r9',
		categoria: 'financiacion',
		riesgo: 'Gastar más sin saber qué funciona',
		respuesta: 'Evaluación externa bienal y obligación de corregir o retirar medidas ineficaces.',
		medidas: []
	}
];

export interface SanidadRiesgoMedida {
	id: SanidadRiesgoMeasureId;
	nombre: string;
	comprobar: string[];
	salvaguarda: string;
	limitacion: string[];
	noExito: string[];
}

export const MEASURES: SanidadRiesgoMedida[] = [
	{
		id: 'M1',
		nombre: 'Atención Primaria que vuelva a resolver',
		comprobar: [
			'Tiempo hasta la valoración clínica.',
			'Resolución sin derivación evitable.',
			'Continuidad con el mismo equipo.',
			'Urgencias por problemas resolubles en Atención Primaria.',
			'Hospitalizaciones evitables.',
			'Experiencia del paciente.',
			'Diferencias por territorio y nivel socioeconómico.'
		],
		salvaguarda:
			'No se podrá cumplir el indicador mediante respuestas automáticas, citas administrativas sin valoración clínica ni consultas remotas impuestas.',
		limitacion: [
			'Falta una estimación causal nacional que convierta cupos y equipos en el objetivo del 90 % de respuestas en 48 horas. La relación debe validarse mediante pilotos y medición de demanda resuelta, continuidad, ausencias y modalidad de respuesta.'
		],
		noExito: [
			'gastar el presupuesto',
			'alcanzar el 100 % de despliegue presupuestario',
			'responder con mensajes automáticos',
			'imponer atención remota',
			'aumentar actividad sin mejorar resultados'
		]
	},
	{
		id: 'M2',
		nombre: 'Garantía nacional frente a las listas de espera',
		comprobar: [
			'Mediana y percentiles de espera, no solo media.',
			'Porcentaje fuera de garantía.',
			'Demora por prioridad y especialidad.',
			'Cancelaciones.',
			'Deterioro clínico durante la espera.',
			'Derivaciones ofrecidas y aceptadas.',
			'Gasto extraordinario.',
			'Actividad concertada.'
		],
		salvaguarda:
			'Se auditarán cambios artificiales de prioridad, exclusiones de listas y reinicios del contador. Reducir la cifra administrativa sin reducir la espera real se considerará incumplimiento.',
		limitacion: [
			'No existe desglose nacional completo por intervención del resto del backlog.',
			'Las consultas externas y pruebas diagnósticas no son estimables todavía con definiciones y cortes nacionales comparables.',
			'El coste del resto del backlog utiliza un coste medio proxy, por lo que es una de las hipótesis más sensibles del presupuesto.',
			'El vaciado inicial del backlog es puntual y se ejecuta entre 2027 y 2030; no debe tratarse como gasto recurrente de 2032.'
		],
		noExito: [
			'gastar el presupuesto',
			'alcanzar el 100 % de despliegue presupuestario',
			'reducir listas mediante cambios administrativos',
			'contratar contingencias privadas como sustitución permanente de capacidad pública'
		]
	},
	{
		id: 'M3',
		nombre: 'Pacto de profesionales sanitarios 2027–2036',
		comprobar: [
			'Vacantes sin cubrir.',
			'Temporalidad.',
			'Rotación.',
			'Tiempo de cobertura.',
			'Profesionales por población ajustada.',
			'Abandono.',
			'Absentismo.',
			'Bienestar laboral.',
			'Capacidad docente.',
			'Distribución rural y urbana.'
		],
		salvaguarda:
			'No se financiarán incentivos aislados sin evaluar permanencia. El número de plazas creadas no contará como éxito si no se cubren o si deterioran la formación.',
		limitacion: [
			'La oferta FSE de 2027 todavía no cuenta con desglose oficial por especialidad en la fuente publicada. Las cohortes adicionales del escenario central son decisiones de política editables, no datos oficiales.'
		],
		noExito: [
			'gastar el presupuesto',
			'alcanzar el 100 % de despliegue presupuestario',
			'crear plazas que no se cubren'
		]
	},
	{
		id: 'M4',
		nombre: 'Salud mental accesible, comunitaria y basada en derechos',
		comprobar: [
			'Tiempo a primera valoración.',
			'Continuidad a 7 y 30 días tras una crisis.',
			'Abandono.',
			'Reingresos.',
			'Suicidio e intentos.',
			'Acceso a psicoterapia cuando esté indicada.',
			'Recuperación y experiencia comunicadas por pacientes.',
			'Uso de contenciones.',
			'Desigualdad territorial.'
		],
		salvaguarda:
			'Ningún objetivo cuantitativo justificará intervenciones forzosas, diagnósticos apresurados o sustitución de atención clínica por aplicaciones.',
		limitacion: [
			'El registro nacional no permite reconstruir con la precisión deseada la vinculación pública de todos los especialistas en Psicología Clínica y Enfermería de Salud Mental.'
		],
		noExito: ['gastar el presupuesto', 'alcanzar el 100 % de despliegue presupuestario']
	},
	{
		id: 'M5',
		nombre: 'Envejecimiento, cronicidad y atención en casa',
		comprobar: [
			'Ingresos y reingresos evitables.',
			'Urgencias.',
			'Días en casa.',
			'Continuidad tras el alta.',
			'Polimedicación de riesgo.',
			'Acceso a paliativos y rehabilitación.',
			'Carga y experiencia del cuidador.',
			'Calidad de vida comunicada por el paciente.'
		],
		salvaguarda:
			'La atención domiciliaria será una opción asistencial, no una forma de retirar camas o trasladar trabajo clínico gratuito a las familias.',
		limitacion: [
			'Varios módulos de cobertura son decisiones explícitas de política. Antes de convertirlos en compromiso normativo deben acordarse con las comunidades autónomas y validarse mediante pilotos.'
		],
		noExito: [
			'gastar el presupuesto',
			'alcanzar el 100 % de despliegue presupuestario',
			'trasladar cuidados a familias'
		]
	},
	{
		id: 'M6',
		nombre: 'Prevenir antes de llegar tarde',
		comprobar: [
			'Cobertura efectiva ajustada por riesgo.',
			'Mortalidad y enfermedad evitables.',
			'Tabaquismo y consumo de riesgo.',
			'Vacunación.',
			'Participación en cribados.',
			'Impactos adversos.',
			'Brechas sociales y territoriales.'
		],
		salvaguarda:
			'La prevención no culpabilizará al individuo ni sustituirá medidas sobre condiciones laborales, vivienda, educación, pobreza o medioambiente.',
		limitacion: [
			'Los módulos territoriales y de cobertura son decisiones explícitas. Deben acordarse y validarse antes de convertirse en compromiso normativo.'
		],
		noExito: ['gastar el presupuesto', 'alcanzar el 100 % de despliegue presupuestario']
	},
	{
		id: 'M7',
		nombre: 'Misma protección, independientemente del código postal',
		comprobar: [
			'Cobertura real por prestación.',
			'Necesidades no atendidas por coste.',
			'Tiempos y distancias de acceso.',
			'Transporte.',
			'Salud bucodental y visual.',
			'Brechas por renta, discapacidad, edad, ruralidad y comunidad autónoma.'
		],
		salvaguarda:
			'No se anunciará una nueva prestación sin memoria económica, profesionales disponibles y calendario real de implantación.',
		limitacion: [
			'Las coberturas adicionales, unidades móviles, ayudas y redes territoriales son decisiones explícitas de alcance. Deben acordarse con las comunidades y validarse mediante pilotos.'
		],
		noExito: [
			'gastar el presupuesto',
			'alcanzar el 100 % de despliegue presupuestario',
			'ampliar prestaciones sin capacidad real'
		]
	},
	{
		id: 'M8',
		nombre: 'Información útil, privacidad y cuentas claras',
		comprobar: [
			'Tipos de documentos interoperables.',
			'Uso y accesibilidad.',
			'Duplicación de pruebas.',
			'Incidentes de seguridad.',
			'Reclamaciones.',
			'Calidad y puntualidad de datos.',
			'Auditorías algorítmicas.',
			'Brecha digital.'
		],
		salvaguarda:
			'Los datos clínicos no se venderán ni se reutilizarán para decisiones comerciales. La IA no sustituirá la responsabilidad profesional ni limitará derechos sin revisión humana.',
		limitacion: [
			'Los módulos digitales y operativos son decisiones explícitas de cobertura. La inversión debe distinguirse del mantenimiento y no debe crear una plataforma paralela que añada fragmentación.'
		],
		noExito: [
			'gastar el presupuesto',
			'alcanzar el 100 % de despliegue presupuestario',
			'publicar muchos datos sin metodología ni comparabilidad',
			'utilizar IA sin auditoría, revisión humana y responsabilidad profesional'
		]
	}
];

export const INDICATORS: string[] = [
	'Solicitudes de Atención Primaria valoradas en 48 horas.',
	'Continuidad con el equipo de referencia.',
	'Espera por prioridad en consulta, prueba y cirugía.',
	'Personas fuera de garantía y alternativa ofrecida.',
	'Vacantes, temporalidad y rotación de profesionales.',
	'Acceso y continuidad en salud mental.',
	'Hospitalizaciones y reingresos evitables.',
	'Cobertura efectiva de cartera común y salud bucodental.',
	'Diferencias rurales, sociales y territoriales.',
	'Ejecución presupuestaria y resultados comunicados por pacientes.'
];

export const META_REQS: { label: string }[] = [
	{ label: 'Metodología' },
	{ label: 'Fecha de actualización' },
	{ label: 'Limitaciones' },
	{ label: 'Comparabilidad territorial' },
	{ label: 'Evaluación externa (mín. cada 2 años)' }
];

export const CORRECTIONS: { ic: string; txt: string }[] = [
	{ ic: '!', txt: 'Incumplimientos' },
	{ ic: '⚠', txt: 'Efectos adversos' },
	{ ic: '⇌', txt: 'Desigualdad' },
	{ ic: '▢', txt: 'Falta de capacidad' },
	{ ic: '∅', txt: 'Ausencia de resultados' },
	{ ic: '↻', txt: 'Evaluación externa bienal' },
	{ ic: '✕', txt: 'Corrección o retirada de medidas ineficaces' }
];

export function measuresForRisk(rid: string): SanidadRiesgoMeasureId[] {
	return RISKS.find((r) => r.id === rid)?.medidas ?? [];
}

export function risksForMeasure(mid: SanidadRiesgoMeasureId): SanidadRiesgo[] {
	return RISKS.filter((r) => r.medidas.includes(mid));
}

export function measureById(mid: SanidadRiesgoMeasureId): SanidadRiesgoMedida | undefined {
	return MEASURES.find((m) => m.id === mid);
}
