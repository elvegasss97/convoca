/**
 * Lógica pura (sin `localStorage`, sin Svelte) del borrador local de "Tú
 * eliges el próximo bloque": mismo patrón que `sanidadListeningDraft.ts`
 * (versión, expiración, validación completa antes de confiar en lo leído
 * del navegador), pero mucho más simple — un solo campo, la opción
 * elegida, en vez de un formulario de varios pasos. Vive aparte de
 * `NextBlockVoteFlow.svelte` para poder probarse con tests unitarios
 * normales.
 */
import { NEXT_BLOCK_VOTE_OPTIONS } from '$lib/data/nextBlockVoteOptions';
import type { NextBlockVoteOptionCode } from '$lib/types';

export const NEXT_BLOCK_VOTE_DRAFT_VERSION = 1;
// Una semana: suficiente para volver y confirmar en varias sesiones sin
// acumular borradores indefinidamente en el navegador.
export const NEXT_BLOCK_VOTE_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface NextBlockVoteDraftPayload {
	version: number;
	optionCode: NextBlockVoteOptionCode;
	savedAt: number;
}

const VALID_OPTION_CODES = NEXT_BLOCK_VOTE_OPTIONS.map((o) => o.code);

/**
 * Validación completa antes de confiar en cualquier dato leído de
 * `localStorage`: un borrador corrupto, manipulado a mano, o de una
 * versión anterior nunca debe usarse tal cual.
 */
export function isValidNextBlockVoteDraftPayload(x: unknown): x is NextBlockVoteDraftPayload {
	if (!x || typeof x !== 'object') return false;
	const p = x as Record<string, unknown>;
	return (
		p.version === NEXT_BLOCK_VOTE_DRAFT_VERSION &&
		typeof p.savedAt === 'number' &&
		typeof p.optionCode === 'string' &&
		VALID_OPTION_CODES.includes(p.optionCode as NextBlockVoteOptionCode)
	);
}

export function isNextBlockVoteDraftExpired(
	payload: NextBlockVoteDraftPayload,
	now: number = Date.now()
): boolean {
	return now - payload.savedAt > NEXT_BLOCK_VOTE_DRAFT_TTL_MS;
}
