/**
 * Vocabulario fijo de "Escucha abierta sobre sanidad": los doce problemas
 * del paso 1 y las diez causas del paso 2. Contenido fijo de esta fase,
 * no gestionado desde el panel de administración — igual que
 * `viviendaListeningOptions.ts` para la escucha de vivienda.
 *
 * A diferencia de las medidas y los compromisos (que se leen en vivo de
 * `topic_measures`/`topic_commitments` para mostrar siempre el nombre
 * vigente), estos dos listados son categorías de diagnóstico propias de
 * esta escucha, sin equivalente en el contenido del plan.
 */

export interface ListeningSurveyOption {
	code: string;
	label: string;
}

export const SANIDAD_LISTENING_PROBLEMS: ListeningSurveyOption[] = [
	{ code: 'primaria_dificil_acceso', label: 'Conseguir atención en Atención Primaria' },
	{ code: 'esperas_especialistas_pruebas', label: 'Esperas para especialistas y pruebas' },
	{ code: 'esperas_operaciones', label: 'Esperas para operaciones' },
	{
		code: 'falta_continuidad',
		label: 'Falta de continuidad: tener que empezar de cero en cada consulta'
	},
	{ code: 'acceso_salud_mental', label: 'Acceso a salud mental' },
	{ code: 'falta_profesionales', label: 'Falta o mala distribución de profesionales' },
	{ code: 'atencion_rural', label: 'Atención sanitaria en zonas rurales' },
	{ code: 'coordinacion_social', label: 'Coordinación entre sanidad y servicios sociales' },
	{ code: 'prevencion_bucodental', label: 'Prevención y salud bucodental' },
	{ code: 'diferencias_territoriales', label: 'Diferencias entre territorios' },
	{ code: 'falta_informacion', label: 'Falta de información y transparencia' },
	{ code: 'otro', label: 'Otro problema' }
];

export const SANIDAD_LISTENING_CAUSES: ListeningSurveyOption[] = [
	{ code: 'faltan_profesionales', label: 'Faltan profesionales' },
	{ code: 'mala_distribucion', label: 'Los profesionales están mal distribuidos' },
	{
		code: 'temporalidad',
		label: 'La temporalidad dificulta mantener equipos estables'
	},
	{ code: 'problemas_organizacion', label: 'Hay problemas de organización y coordinación' },
	{
		code: 'diferencias_comunidades',
		label: 'Las comunidades ofrecen niveles de acceso muy diferentes'
	},
	{ code: 'faltan_recursos', label: 'Faltan recursos o financiación estable' },
	{
		code: 'derechos_sin_capacidad',
		label: 'Se anuncian derechos sin capacidad suficiente para cumplirlos'
	},
	{ code: 'no_se_mide_corrige', label: 'No se mide ni se corrige lo que no funciona' },
	{ code: 'otra_causa', label: 'Otra causa' },
	{ code: 'sin_informacion', label: 'No tengo información suficiente para responder' }
];

export function listeningProblemLabel(code: string): string {
	return SANIDAD_LISTENING_PROBLEMS.find((o) => o.code === code)?.label ?? code;
}

export function listeningCauseLabel(code: string): string {
	return SANIDAD_LISTENING_CAUSES.find((o) => o.code === code)?.label ?? code;
}
