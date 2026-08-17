/**
 * Datos de transparencia metodológica por tema, para el bloque "Cómo se
 * elaboró este plan". Solo campos verificados manualmente contra el
 * repositorio y la base de datos en producción — nunca fechas o
 * afirmaciones de reproducibilidad inventadas.
 *
 * - sourcesCutoff: fecha de cierre de fuentes tal como aparece publicada
 *   hoy (Sanidad: prosa de SanidadPresupuesto.svelte; Ceuta: nota real en
 *   topic_versions). Vivienda no tiene ninguna fecha de cierre documentada
 *   todavía — se omite en vez de inventarla.
 * - reproducibleModel: solo presente cuando existe de verdad un archivo
 *   descargable en static/descargas/<slug>/. Vivienda no tiene ninguno.
 */

export interface TopicMethodologyInfo {
	sourcesCutoff?: string;
	reproducibleModel?: string;
}

export const TOPIC_METHODOLOGY: Record<string, TopicMethodologyInfo> = {
	'plan-sanidad-2036': {
		sourcesCutoff: '5 de agosto de 2026',
		reproducibleModel:
			'El modelo económico, el libro de cálculo (Excel) y la memoria metodológica de este plan son descargables y reproducibles.'
	},
	'vivienda-plan-vivienda-2036': {},
	'plan-ceuta-2026': {
		sourcesCutoff: '14 de agosto de 2026',
		reproducibleModel:
			'El modelo económico (libro de cálculo) y el borrador completo de este plan son descargables.'
	}
};
