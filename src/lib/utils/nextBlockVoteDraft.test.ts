import { describe, expect, it } from 'vitest';
import {
	isNextBlockVoteDraftExpired,
	isValidNextBlockVoteDraftPayload,
	NEXT_BLOCK_VOTE_DRAFT_VERSION
} from './nextBlockVoteDraft';

describe('isValidNextBlockVoteDraftPayload', () => {
	it('acepta un borrador correcto', () => {
		const payload = {
			version: NEXT_BLOCK_VOTE_DRAFT_VERSION,
			optionCode: 'coste_vida',
			savedAt: Date.now()
		};
		expect(isValidNextBlockVoteDraftPayload(payload)).toBe(true);
	});

	it('rechaza una versión antigua o desconocida', () => {
		const payload = { version: 0, optionCode: 'coste_vida', savedAt: Date.now() };
		expect(isValidNextBlockVoteDraftPayload(payload)).toBe(false);
	});

	it('rechaza un código de opción que no existe en el vocabulario fijo', () => {
		const payload = {
			version: NEXT_BLOCK_VOTE_DRAFT_VERSION,
			optionCode: 'opcion_inventada',
			savedAt: Date.now()
		};
		expect(isValidNextBlockVoteDraftPayload(payload)).toBe(false);
	});

	it('rechaza JSON manipulado sin la forma esperada', () => {
		expect(isValidNextBlockVoteDraftPayload({ foo: 'bar' })).toBe(false);
	});

	it('rechaza un valor que no es un objeto', () => {
		expect(isValidNextBlockVoteDraftPayload('no-es-un-objeto')).toBe(false);
		expect(isValidNextBlockVoteDraftPayload(null)).toBe(false);
		expect(isValidNextBlockVoteDraftPayload(undefined)).toBe(false);
	});

	it('rechaza si falta savedAt', () => {
		const payload = { version: NEXT_BLOCK_VOTE_DRAFT_VERSION, optionCode: 'educacion' };
		expect(isValidNextBlockVoteDraftPayload(payload)).toBe(false);
	});
});

describe('isNextBlockVoteDraftExpired', () => {
	it('no caduca un borrador reciente', () => {
		const payload = {
			version: NEXT_BLOCK_VOTE_DRAFT_VERSION,
			optionCode: 'educacion' as const,
			savedAt: Date.now()
		};
		expect(isNextBlockVoteDraftExpired(payload)).toBe(false);
	});

	it('caduca un borrador de hace más de una semana', () => {
		const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
		const payload = {
			version: NEXT_BLOCK_VOTE_DRAFT_VERSION,
			optionCode: 'educacion' as const,
			savedAt: eightDaysAgo
		};
		expect(isNextBlockVoteDraftExpired(payload)).toBe(true);
	});
});
