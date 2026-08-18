/**
 * Lógica pura del bloque "Qué requiere atención" y del recuento total de
 * "Resumen" (Centro de Operaciones). Aparte de `+page.svelte` para poder
 * probarse sin montar Svelte — mismo criterio que el resto de `$lib/utils`.
 * Solo decide qué mostrar/sumar a partir de recuentos ya autorizados
 * (cargados por `+page.ts` bajo RLS+aal2) — nunca decide qué datos se
 * pueden leer.
 */

export type OperationsTabKey =
	| 'resumen'
	| 'pendientes'
	| 'reportadas'
	| 'documentacion'
	| 'pulso'
	| 'vozAbierta'
	| 'temas'
	| 'registro';

export interface AttentionItem {
	key: OperationsTabKey;
	label: string;
	count: number;
	tone: 'warning' | 'critical';
}

export interface ModerationQueueCounts {
	openVoicePending: number;
	eventsReported: number;
	channelsReported: number;
	eventsPending: number;
	documentsPending: number;
	proposalsPending: number;
	alternativesPending: number;
}

function plural(count: number, singular: string, pluralForm: string): string {
	return count === 1 ? singular : pluralForm;
}

/**
 * Una entrada por cola con al menos un elemento pendiente, en el mismo
 * orden en que aparecen las secciones en la navegación (Escucha ciudadana
 * → Convocatorias → Planificación). Vacío = nada requiere atención ahora
 * mismo (la interfaz debe mostrar un estado positivo, no un hueco).
 */
export function buildAttentionItems(counts: ModerationQueueCounts): AttentionItem[] {
	const items: AttentionItem[] = [];

	if (counts.openVoicePending > 0) {
		items.push({
			key: 'vozAbierta',
			label: `${counts.openVoicePending} aportación${plural(counts.openVoicePending, '', 'es')} de Voz abierta pendiente${plural(counts.openVoicePending, '', 's')} de revisión`,
			count: counts.openVoicePending,
			tone: 'warning'
		});
	}
	if (counts.eventsReported > 0) {
		items.push({
			key: 'reportadas',
			label: `${counts.eventsReported} convocatoria${plural(counts.eventsReported, '', 's')} con reportes abiertos`,
			count: counts.eventsReported,
			tone: 'critical'
		});
	}
	if (counts.channelsReported > 0) {
		items.push({
			key: 'reportadas',
			label: `${counts.channelsReported} canal${plural(counts.channelsReported, '', 'es')} de comunicación reportado${plural(counts.channelsReported, '', 's')}`,
			count: counts.channelsReported,
			tone: 'critical'
		});
	}
	if (counts.eventsPending > 0) {
		items.push({
			key: 'pendientes',
			label: `${counts.eventsPending} convocatoria${plural(counts.eventsPending, '', 's')} pendiente${plural(counts.eventsPending, '', 's')} de revisión`,
			count: counts.eventsPending,
			tone: 'warning'
		});
	}
	if (counts.documentsPending > 0) {
		items.push({
			key: 'documentacion',
			label: `${counts.documentsPending} documento${plural(counts.documentsPending, '', 's')} pendiente${plural(counts.documentsPending, '', 's')} de verificación`,
			count: counts.documentsPending,
			tone: 'warning'
		});
	}
	if (counts.proposalsPending > 0) {
		items.push({
			key: 'pulso',
			label: `${counts.proposalsPending} propuesta${plural(counts.proposalsPending, '', 's')} ciudadana${plural(counts.proposalsPending, '', 's')} pendiente${plural(counts.proposalsPending, '', 's')}`,
			count: counts.proposalsPending,
			tone: 'warning'
		});
	}
	if (counts.alternativesPending > 0) {
		items.push({
			key: 'temas',
			label: `${counts.alternativesPending} alternativa${plural(counts.alternativesPending, '', 's')} de medida pendiente${plural(counts.alternativesPending, '', 's')}`,
			count: counts.alternativesPending,
			tone: 'warning'
		});
	}

	return items;
}

/** Suma de todas las colas de moderación — la tarjeta "Elementos pendientes de moderación". */
export function totalPendingModerationItems(counts: ModerationQueueCounts): number {
	return (
		counts.eventsPending +
		counts.documentsPending +
		counts.openVoicePending +
		counts.proposalsPending +
		counts.alternativesPending
	);
}
