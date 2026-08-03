/**
 * Lógica pura (sin `localStorage`, sin Svelte) del borrador local de
 * "Escucha abierta sobre sanidad": forma del formulario, comparación por
 * contenido y validación completa de lo que se restaura desde el
 * navegador. Vive aparte de `SanidadListeningFlow.svelte` precisamente
 * para poder probarse con tests unitarios normales.
 */
import type { ListeningSurveyAreaType } from '$lib/types';

export const SANIDAD_LISTENING_DRAFT_VERSION = 2;
// Una semana: suficiente para retomar la escucha en varias sesiones sin
// acumular borradores indefinidamente en el navegador.
export const SANIDAD_LISTENING_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const SANIDAD_LISTENING_PROBLEMS_MAX = 3;
export const SANIDAD_LISTENING_MEASURES_MAX = 3;
export const SANIDAD_LISTENING_AREA_TYPES: ListeningSurveyAreaType[] = [
	'rural',
	'ciudad_mediana',
	'gran_area_urbana',
	'prefiere_no_responder'
];

export interface SanidadListeningFormState {
	problems: string[];
	otherProblemText: string;
	mainCause: string | undefined;
	prioritizedMeasureIds: string[];
	commitmentMostUrgentId: string | undefined;
	commitmentMostDifficultId: string | undefined;
	missingImprovement: string;
	community: string;
	areaType: ListeningSurveyAreaType | '';
}

export interface SanidadListeningDraftPayload {
	version: number;
	form: SanidadListeningFormState;
	step: number;
	pendingAutoSubmit: boolean;
	savedAt: number;
}

/** Vocabulario válido en el momento de validar: se pasa siempre desde fuera
 * (nunca importado como constante fija aquí) porque medidas/compromisos se
 * leen en vivo del tema real y pueden variar. */
export interface SanidadListeningValidationContext {
	problemCodes: string[];
	causeCodes: string[];
	measureIds: string[];
	commitmentIds: string[];
	communityNames: string[];
}

export function emptySanidadListeningForm(): SanidadListeningFormState {
	return {
		problems: [],
		otherProblemText: '',
		mainCause: undefined,
		prioritizedMeasureIds: [],
		commitmentMostUrgentId: undefined,
		commitmentMostDifficultId: undefined,
		missingImprovement: '',
		community: '',
		areaType: ''
	};
}

/**
 * Comparación por contenido (no por identidad) para saber si el borrador
 * local y una respuesta ya guardada dicen lo mismo. El orden de `problems`
 * no importa (es un conjunto); el de `prioritizedMeasureIds` sí (es una
 * prioridad).
 */
export function sanidadListeningFormsEqual(
	a: SanidadListeningFormState,
	b: SanidadListeningFormState
): boolean {
	const sortedA = [...a.problems].sort();
	const sortedB = [...b.problems].sort();
	return (
		JSON.stringify(sortedA) === JSON.stringify(sortedB) &&
		a.otherProblemText === b.otherProblemText &&
		a.mainCause === b.mainCause &&
		JSON.stringify(a.prioritizedMeasureIds) === JSON.stringify(b.prioritizedMeasureIds) &&
		a.commitmentMostUrgentId === b.commitmentMostUrgentId &&
		a.commitmentMostDifficultId === b.commitmentMostDifficultId &&
		a.missingImprovement === b.missingImprovement &&
		a.community === b.community &&
		a.areaType === b.areaType
	);
}

/**
 * Validación completa antes de confiar en cualquier dato leído de
 * `localStorage`: un borrador corrupto, manipulado a mano, o de una
 * versión anterior del formulario nunca debe usarse tal cual.
 */
export function isValidSanidadListeningFormState(
	x: unknown,
	ctx: SanidadListeningValidationContext
): x is SanidadListeningFormState {
	if (!x || typeof x !== 'object') return false;
	const f = x as Record<string, unknown>;

	if (!Array.isArray(f.problems) || f.problems.length > SANIDAD_LISTENING_PROBLEMS_MAX)
		return false;
	if (!f.problems.every((p) => typeof p === 'string' && ctx.problemCodes.includes(p))) return false;
	if (new Set(f.problems).size !== f.problems.length) return false;

	if (typeof f.otherProblemText !== 'string' || f.otherProblemText.length > 150) return false;

	if (
		f.mainCause !== undefined &&
		(typeof f.mainCause !== 'string' || !ctx.causeCodes.includes(f.mainCause))
	)
		return false;

	if (
		!Array.isArray(f.prioritizedMeasureIds) ||
		f.prioritizedMeasureIds.length > SANIDAD_LISTENING_MEASURES_MAX
	)
		return false;
	if (!f.prioritizedMeasureIds.every((id) => typeof id === 'string')) return false;
	if (new Set(f.prioritizedMeasureIds).size !== f.prioritizedMeasureIds.length) return false;
	if (
		ctx.measureIds.length > 0 &&
		!f.prioritizedMeasureIds.every((id) => ctx.measureIds.includes(id))
	)
		return false;

	if (f.commitmentMostUrgentId !== undefined) {
		if (typeof f.commitmentMostUrgentId !== 'string') return false;
		if (ctx.commitmentIds.length > 0 && !ctx.commitmentIds.includes(f.commitmentMostUrgentId))
			return false;
	}
	if (f.commitmentMostDifficultId !== undefined) {
		if (typeof f.commitmentMostDifficultId !== 'string') return false;
		if (ctx.commitmentIds.length > 0 && !ctx.commitmentIds.includes(f.commitmentMostDifficultId))
			return false;
	}

	if (typeof f.missingImprovement !== 'string' || f.missingImprovement.length > 1000) return false;

	if (typeof f.community !== 'string') return false;
	if (f.community !== '' && !ctx.communityNames.includes(f.community)) return false;

	if (
		f.areaType !== '' &&
		!SANIDAD_LISTENING_AREA_TYPES.includes(f.areaType as ListeningSurveyAreaType)
	)
		return false;

	return true;
}

/** Valida la envoltura completa del borrador (versión, paso, marca de tiempo, forma). */
export function isValidSanidadListeningDraftPayload(
	x: unknown,
	ctx: SanidadListeningValidationContext
): x is SanidadListeningDraftPayload {
	if (!x || typeof x !== 'object') return false;
	const p = x as Record<string, unknown>;
	return (
		p.version === SANIDAD_LISTENING_DRAFT_VERSION &&
		typeof p.savedAt === 'number' &&
		typeof p.step === 'number' &&
		p.step >= 0 &&
		p.step <= 7 &&
		typeof p.pendingAutoSubmit === 'boolean' &&
		isValidSanidadListeningFormState(p.form, ctx)
	);
}

export function isSanidadListeningDraftExpired(
	payload: SanidadListeningDraftPayload,
	now: number = Date.now()
): boolean {
	return now - payload.savedAt > SANIDAD_LISTENING_DRAFT_TTL_MS;
}
