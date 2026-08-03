import { describe, expect, it } from 'vitest';
import {
	emptySanidadListeningForm,
	isSanidadListeningDraftExpired,
	isValidSanidadListeningDraftPayload,
	isValidSanidadListeningFormState,
	sanidadListeningFormsEqual,
	SANIDAD_LISTENING_DRAFT_VERSION,
	type SanidadListeningFormState,
	type SanidadListeningValidationContext
} from './sanidadListeningDraft';

const ctx: SanidadListeningValidationContext = {
	problemCodes: ['primaria_dificil_acceso', 'otro'],
	causeCodes: ['faltan_profesionales'],
	measureIds: ['medida-1', 'medida-2'],
	commitmentIds: ['compromiso-1', 'compromiso-2'],
	communityNames: ['Cataluña', 'Madrid']
};

function validForm(overrides: Partial<SanidadListeningFormState> = {}): SanidadListeningFormState {
	return {
		...emptySanidadListeningForm(),
		problems: ['primaria_dificil_acceso'],
		mainCause: 'faltan_profesionales',
		prioritizedMeasureIds: ['medida-1'],
		commitmentMostUrgentId: 'compromiso-1',
		commitmentMostDifficultId: 'compromiso-2',
		...overrides
	};
}

describe('isValidSanidadListeningFormState', () => {
	it('acepta un formulario correcto', () => {
		expect(isValidSanidadListeningFormState(validForm(), ctx)).toBe(true);
	});

	it('rechaza más de tres problemas seleccionados', () => {
		const form = validForm({ problems: ['primaria_dificil_acceso', 'otro', 'x', 'y'] });
		expect(isValidSanidadListeningFormState(form, ctx)).toBe(false);
	});

	it('rechaza un código de problema que no existe en el vocabulario', () => {
		const form = validForm({ problems: ['codigo_inventado'] });
		expect(isValidSanidadListeningFormState(form, ctx)).toBe(false);
	});

	it('rechaza problemas duplicados', () => {
		const form = validForm({ problems: ['primaria_dificil_acceso', 'primaria_dificil_acceso'] });
		expect(isValidSanidadListeningFormState(form, ctx)).toBe(false);
	});

	it('rechaza más de tres medidas priorizadas', () => {
		const form = validForm({ prioritizedMeasureIds: ['medida-1', 'medida-2', 'x', 'y'] });
		expect(isValidSanidadListeningFormState(form, ctx)).toBe(false);
	});

	it('rechaza un id de medida que no pertenece al plan vigente', () => {
		const form = validForm({ prioritizedMeasureIds: ['medida-inventada'] });
		expect(isValidSanidadListeningFormState(form, ctx)).toBe(false);
	});

	it('rechaza un id de compromiso que no existe', () => {
		const form = validForm({ commitmentMostUrgentId: 'compromiso-inventado' });
		expect(isValidSanidadListeningFormState(form, ctx)).toBe(false);
	});

	it('rechaza texto libre por encima del límite de caracteres', () => {
		const form = validForm({ missingImprovement: 'a'.repeat(1001) });
		expect(isValidSanidadListeningFormState(form, ctx)).toBe(false);
	});

	it('rechaza una comunidad autónoma que no existe', () => {
		const form = validForm({ community: 'Comunidad Inventada' });
		expect(isValidSanidadListeningFormState(form, ctx)).toBe(false);
	});

	it('acepta un formulario vacío (todo opcional sin responder)', () => {
		expect(isValidSanidadListeningFormState(emptySanidadListeningForm(), ctx)).toBe(true);
	});

	it('rechaza un valor que no es un objeto', () => {
		expect(isValidSanidadListeningFormState('no-es-un-objeto', ctx)).toBe(false);
		expect(isValidSanidadListeningFormState(null, ctx)).toBe(false);
		expect(isValidSanidadListeningFormState(undefined, ctx)).toBe(false);
	});
});

describe('isValidSanidadListeningDraftPayload', () => {
	it('acepta una envoltura de borrador completa y correcta', () => {
		const payload = {
			version: SANIDAD_LISTENING_DRAFT_VERSION,
			form: validForm(),
			step: 3,
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidSanidadListeningDraftPayload(payload, ctx)).toBe(true);
	});

	it('rechaza una versión antigua o desconocida', () => {
		const payload = {
			version: 1,
			form: validForm(),
			step: 3,
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidSanidadListeningDraftPayload(payload, ctx)).toBe(false);
	});

	it('rechaza un paso fuera de rango', () => {
		const payload = {
			version: SANIDAD_LISTENING_DRAFT_VERSION,
			form: validForm(),
			step: 99,
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidSanidadListeningDraftPayload(payload, ctx)).toBe(false);
	});

	it('rechaza JSON manipulado sin la forma esperada', () => {
		expect(isValidSanidadListeningDraftPayload({ foo: 'bar' }, ctx)).toBe(false);
	});
});

describe('isSanidadListeningDraftExpired', () => {
	it('no caduca un borrador reciente', () => {
		const payload = {
			version: SANIDAD_LISTENING_DRAFT_VERSION,
			form: validForm(),
			step: 1,
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isSanidadListeningDraftExpired(payload)).toBe(false);
	});

	it('caduca un borrador de hace más de una semana', () => {
		const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
		const payload = {
			version: SANIDAD_LISTENING_DRAFT_VERSION,
			form: validForm(),
			step: 1,
			pendingAutoSubmit: false,
			savedAt: eightDaysAgo
		};
		expect(isSanidadListeningDraftExpired(payload)).toBe(true);
	});
});

describe('sanidadListeningFormsEqual', () => {
	it('son iguales dos formularios idénticos', () => {
		expect(sanidadListeningFormsEqual(validForm(), validForm())).toBe(true);
	});

	it('el orden de "problems" no importa', () => {
		const a = validForm({ problems: ['primaria_dificil_acceso', 'otro'] });
		const b = validForm({ problems: ['otro', 'primaria_dificil_acceso'] });
		expect(sanidadListeningFormsEqual(a, b)).toBe(true);
	});

	it('el orden de "prioritizedMeasureIds" sí importa (es una prioridad)', () => {
		const a = validForm({ prioritizedMeasureIds: ['medida-1', 'medida-2'] });
		const b = validForm({ prioritizedMeasureIds: ['medida-2', 'medida-1'] });
		expect(sanidadListeningFormsEqual(a, b)).toBe(false);
	});

	it('detecta una diferencia en el texto de mejora que falta', () => {
		const a = validForm({ missingImprovement: 'Falta X' });
		const b = validForm({ missingImprovement: 'Falta Y' });
		expect(sanidadListeningFormsEqual(a, b)).toBe(false);
	});

	it('detecta una diferencia en el contexto territorial', () => {
		const a = validForm({ community: 'Cataluña' });
		const b = validForm({ community: 'Madrid' });
		expect(sanidadListeningFormsEqual(a, b)).toBe(false);
	});
});
