// Datos transcritos literalmente del artifact aprobado "Bloque introductorio"
// de la home (basado exclusivamente en Base_Home_CONVOCA.md). Los `href` de
// cada acción apuntan a rutas reales del repositorio, verificadas antes de
// conectarlas — no son slugs inventados.

export type HomeStageId =
	'escuchar' | 'priorizar' | 'disenar' | 'decidir' | 'actuar' | 'comprobar' | 'corregir';

export type HomeStageStatus = 'disponible' | 'desarrollo';

export interface HomeStageAction {
	label: string;
	href: string;
}

export interface HomeStage {
	id: HomeStageId;
	num: number;
	nombre: string;
	icono: string;
	resumen: string;
	herramienta: string;
	estado: HomeStageStatus;
	estadoNota: string;
	accion: HomeStageAction | null;
}

export const STAGES: HomeStage[] = [
	{
		id: 'escuchar',
		num: 1,
		nombre: 'Escuchar',
		icono: '◉',
		resumen:
			'La ciudadanía señala qué problema existe, cómo le afecta, dónde ocurre, qué situaciones se repiten y qué información falta.',
		herramienta: 'Pulso Ciudadano · escucha abierta',
		estado: 'disponible',
		estadoNota:
			'Disponible en el ámbito nacional. Una futura aplicación municipal todavía no existe.',
		accion: { label: 'Señalar un problema', href: '/pulso' }
	},
	{
		id: 'priorizar',
		num: 2,
		nombre: 'Priorizar',
		icono: '⇅',
		resumen:
			'Las preocupaciones pueden ordenarse de forma comprensible según señales como apoyo, recurrencia, urgencia, alcance, impacto y territorio.',
		herramienta: 'Criterios de ordenación ciudadana',
		estado: 'desarrollo',
		estadoNota:
			'CONVOCA todavía no cuenta con un algoritmo definitivo y plenamente operativo de priorización automática.',
		accion: null
	},
	{
		id: 'disenar',
		num: 3,
		nombre: 'Diseñar',
		icono: '✎',
		resumen:
			'Los problemas priorizados se transforman en planes concretos: diagnóstico, medidas, coste, calendario, riesgos, salvaguardas, fuentes, comprobación, participación y vía institucional.',
		herramienta: 'Plan de Vivienda 2036 · Plan de Sanidad 2036',
		estado: 'disponible',
		estadoNota:
			'Dos planes completos ya trabajados como ejemplo real. La generación automatizada de nuevos planes sigue en desarrollo.',
		accion: { label: 'Revisar una propuesta', href: '/pulso/soluciones' }
	},
	{
		id: 'decidir',
		num: 4,
		nombre: 'Decidir',
		icono: '⚖',
		resumen:
			'La ciudadanía puede apoyar una medida, rechazarla, debatirla, proponer alternativas o buscar una versión con mayor consenso — no solo aceptar o rechazar un paquete completo.',
		herramienta: 'Participación por medidas',
		estado: 'disponible',
		estadoNota:
			'Disponible como participación por medidas. Todavía no es un sistema definitivo de decisión vinculante ni de consenso automático.',
		accion: { label: 'Participar en una medida', href: '/pulso/soluciones' }
	},
	{
		id: 'actuar',
		num: 5,
		nombre: 'Actuar',
		icono: '▶',
		resumen:
			'CONVOCA permite localizar y crear convocatorias, consultar su lugar y fecha y acceder a grupos de coordinación cuando el organizador facilita el enlace.',
		herramienta: 'Convocatorias y coordinación ciudadana',
		estado: 'disponible',
		estadoNota:
			'Explorar y crear convocatorias ya está disponible. La conexión sistemática con firmas, expedientes y vías institucionales sigue en desarrollo.',
		accion: { label: 'Crear una convocatoria', href: '/crear' }
	},
	{
		id: 'comprobar',
		num: 6,
		nombre: 'Comprobar',
		icono: '✓',
		resumen:
			'Qué se ejecutó, cuánto se gastó, qué calendario se cumplió, qué resultados se obtuvieron, qué efectos adversos aparecieron y qué debe corregirse o retirarse.',
		herramienta: 'Coste, calendario, riesgos y comprobación del Plan Sanidad 2036',
		estado: 'disponible',
		estadoNota:
			'Ya desarrollado visualmente en el Plan Sanidad 2036. Un panel público de resultados generalizado a todos los planes sigue en desarrollo.',
		accion: {
			label: 'Ver comprobación del Plan Sanidad',
			href: '/pulso/soluciones/plan-sanidad-2036'
		}
	}
];

export const RETURN_STAGE: HomeStage = {
	id: 'corregir',
	num: 7,
	nombre: 'Corregir y volver a escuchar',
	icono: '↺',
	resumen:
		'El proceso no termina al comprobar resultados. Se corrigen medidas, se retiran las ineficaces, se incorporan nuevas aportaciones, se vuelve a escuchar y se actualiza el plan.',
	herramienta: 'Cierre del ciclo hacia una nueva escucha',
	estado: 'desarrollo',
	estadoNota:
		'La conexión completa entre escucha, propuesta, decisión, movilización y evaluación todavía está en desarrollo.',
	accion: null
};

export const ALL_STAGES: HomeStage[] = [...STAGES, RETURN_STAGE];

export type HomeExampleId = 'sanidad' | 'vivienda' | 'convocatorias';

export interface HomeExample {
	id: HomeExampleId;
	nombre: string;
	problema: string;
	solucion: string;
	puntos: string[];
	accion: HomeStageAction;
}

export const EXAMPLES: HomeExample[] = [
	{
		id: 'sanidad',
		nombre: 'Sanidad',
		problema: 'Esperas, falta de capacidad, desigualdad y fragmentación en la atención sanitaria.',
		solucion: 'Plan de Sanidad 2036',
		puntos: [
			'8 medidas concretas, de M1 a M8',
			'Coste incremental: 3.359 M€/año en 2032 (escenario central)',
			'Calendario de despliegue 2027–2036',
			'Riesgos, salvaguardas y comprobación documentados',
			'Participación abierta por medida'
		],
		accion: { label: 'Ver Plan de Sanidad 2036', href: '/pulso/soluciones/plan-sanidad-2036' }
	},
	{
		id: 'vivienda',
		nombre: 'Vivienda',
		problema: 'Dificultad de acceso a la vivienda.',
		solucion: 'Plan de Vivienda 2036',
		puntos: [
			'Medidas concretas frente al problema de acceso',
			'Hoja de ruta de implantación',
			'Participación ciudadana abierta'
		],
		accion: {
			label: 'Ver Plan de Vivienda 2036',
			href: '/pulso/soluciones/vivienda-plan-vivienda-2036'
		}
	},
	{
		id: 'convocatorias',
		nombre: 'Convocatorias',
		problema: 'Necesidad de organizar o sumarse a una movilización concreta.',
		solucion: 'Mapa y listado de convocatorias',
		puntos: [
			'Localizar una convocatoria por lugar y fecha',
			'Participar o crear una convocatoria',
			'Enlace a grupos de coordinación cuando el organizador lo facilite'
		],
		accion: { label: 'Ver convocatorias activas', href: '/descubrir' }
	}
];

export const STATUS_LABEL: Record<HomeStageStatus, string> = {
	disponible: 'Disponible ahora',
	desarrollo: 'En desarrollo'
};
