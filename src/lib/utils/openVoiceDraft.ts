/**
 * Lógica pura (sin `localStorage`, sin Svelte) del borrador local de "Voz
 * abierta": forma del formulario y validación completa de lo que se
 * restaura desde el navegador. Vive aparte de `VozAbiertaFlow.svelte`
 * precisamente para poder probarse con tests unitarios normales — mismo
 * patrón que `sanidadListeningDraft.ts`, simplificado porque aquí no hay
 * pasos ni una respuesta única por ronda con la que pueda entrar en
 * conflicto (Voz abierta admite varias aportaciones por cuenta).
 */
import type { OpenVoiceScopeType } from '$lib/types';
import { autonomousCommunities, provinces } from '$lib/data/regions';
import { unifiedCommunityName } from '$lib/utils/territoryScope';

// v2: añade `municipalityCode` (código INE de 5 dígitos) junto al nombre del
// municipio, tras sustituir el desplegable de 12 ciudades mock por el
// buscador sobre el catálogo completo del INE (ver
// `$lib/data/municipios.ts`). Un borrador v1 antiguo que quedara en el
// navegador de alguien simplemente no valida y se ignora — no se intenta
// migrar (mismo criterio que sanidadListeningDraft.ts).
export const OPEN_VOICE_DRAFT_VERSION = 2;
// Una semana: suficiente para retomar una reflexión larga en varias
// sesiones sin acumular borradores indefinidamente en el navegador.
export const OPEN_VOICE_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
// Debe coincidir con el check `open_voice_contributions_content_max_length`
// de supabase/migrations/0047_voz_abierta.sql: guarda técnica generosa, no
// un límite editorial (por eso no se muestra ningún contador en la
// interfaz).
export const OPEN_VOICE_CONTENT_MAX_LENGTH = 100000;
// Debe coincidir con el check `open_voice_contributions_content_not_blank`
// de la misma migración.
export const OPEN_VOICE_CONTENT_MIN_LENGTH = 20;

export const OPEN_VOICE_SCOPE_TYPE_VALUES: OpenVoiceScopeType[] = [
	'nacional',
	'comunidad_autonoma',
	'provincia',
	'municipio',
	'multiple'
];

const INE_MUNICIPALITY_CODE_RE = /^\d{5}$/;

export interface OpenVoiceFormState {
	content: string;
	scopeType: OpenVoiceScopeType;
	scopeValue: string | undefined;
	/** Código INE del municipio (5 dígitos), solo cuando scopeType es 'municipio'. */
	municipalityCode: string | undefined;
}

export interface OpenVoiceDraftPayload {
	version: number;
	form: OpenVoiceFormState;
	pendingAutoSubmit: boolean;
	savedAt: number;
}

export function emptyOpenVoiceForm(): OpenVoiceFormState {
	return { content: '', scopeType: 'nacional', scopeValue: undefined, municipalityCode: undefined };
}

/** ¿Hay contenido real más allá de espacios en blanco, y con una extensión mínimamente significativa? */
export function isOpenVoiceContentMeaningful(content: string): boolean {
	return content.trim().length >= OPEN_VOICE_CONTENT_MIN_LENGTH;
}

/**
 * Validación del ámbito territorial de un borrador. Para comunidad_autonoma
 * y provincia se valida contra el catálogo estático completo (siempre en
 * memoria, ~70 filas). Para municipio NO se valida contra el catálogo
 * completo del INE aquí a propósito: son ~8.100 filas cargadas de forma
 * diferida (ver `$lib/data/municipios.ts`), y esta función es síncrona y se
 * usa antes del primer render — solo se comprueba la FORMA del código INE
 * (5 dígitos) y que el nombre no esté vacío. La validación de que el código
 * corresponde de verdad a un municipio real la hace el servidor (clave
 * foránea a `public.ine_municipalities`, ver la migración 0047) al enviar.
 */
function isValidScopeValueFor(
	type: OpenVoiceScopeType,
	value: string | undefined,
	municipalityCode: string | undefined
): boolean {
	if (type === 'nacional' || type === 'multiple')
		return value === undefined && municipalityCode === undefined;
	if (type === 'comunidad_autonoma')
		// TerritoryPicker unifica el nombre de Baleares (ver unifiedCommunityName)
		// antes de guardarlo en scopeValue, así que aquí se valida contra esa
		// misma transformación — no contra los nombres "en crudo" de regions.ts.
		return (
			municipalityCode === undefined &&
			value !== undefined &&
			autonomousCommunities.some((c) => unifiedCommunityName(c.name) === value)
		);
	if (type === 'provincia')
		return municipalityCode === undefined && value !== undefined && provinces.includes(value);
	if (type === 'municipio') {
		return (
			value !== undefined &&
			value.length > 0 &&
			value.length <= 200 &&
			municipalityCode !== undefined &&
			INE_MUNICIPALITY_CODE_RE.test(municipalityCode)
		);
	}
	return false;
}

/**
 * Validación completa antes de confiar en cualquier dato leído de
 * `localStorage`: un borrador corrupto, manipulado a mano, o de una versión
 * anterior del formulario nunca debe usarse tal cual.
 */
export function isValidOpenVoiceFormState(x: unknown): x is OpenVoiceFormState {
	if (!x || typeof x !== 'object') return false;
	const f = x as Record<string, unknown>;

	if (typeof f.content !== 'string' || f.content.length > OPEN_VOICE_CONTENT_MAX_LENGTH)
		return false;
	if (
		typeof f.scopeType !== 'string' ||
		!OPEN_VOICE_SCOPE_TYPE_VALUES.includes(f.scopeType as OpenVoiceScopeType)
	)
		return false;
	if (f.scopeValue !== undefined && typeof f.scopeValue !== 'string') return false;
	if (f.municipalityCode !== undefined && typeof f.municipalityCode !== 'string') return false;
	if (
		!isValidScopeValueFor(
			f.scopeType as OpenVoiceScopeType,
			f.scopeValue as string | undefined,
			f.municipalityCode as string | undefined
		)
	)
		return false;

	return true;
}

/** Valida la envoltura completa del borrador (versión, marca de tiempo, forma). */
export function isValidOpenVoiceDraftPayload(x: unknown): x is OpenVoiceDraftPayload {
	if (!x || typeof x !== 'object') return false;
	const p = x as Record<string, unknown>;
	return (
		p.version === OPEN_VOICE_DRAFT_VERSION &&
		typeof p.savedAt === 'number' &&
		typeof p.pendingAutoSubmit === 'boolean' &&
		isValidOpenVoiceFormState(p.form)
	);
}

export function isOpenVoiceDraftExpired(
	payload: OpenVoiceDraftPayload,
	now: number = Date.now()
): boolean {
	return now - payload.savedAt > OPEN_VOICE_DRAFT_TTL_MS;
}
