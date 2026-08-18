import { describe, expect, it } from 'vitest';
import {
	emptyOpenVoiceForm,
	isOpenVoiceContentMeaningful,
	isOpenVoiceDraftExpired,
	isValidOpenVoiceDraftPayload,
	isValidOpenVoiceFormState,
	OPEN_VOICE_CONTENT_MAX_LENGTH,
	OPEN_VOICE_DRAFT_VERSION,
	type OpenVoiceFormState
} from './openVoiceDraft';

function validForm(overrides: Partial<OpenVoiceFormState> = {}): OpenVoiceFormState {
	return {
		...emptyOpenVoiceForm(),
		content: 'a'.repeat(50),
		...overrides
	};
}

describe('isValidOpenVoiceFormState', () => {
	it('acepta un formulario correcto con ámbito nacional', () => {
		expect(isValidOpenVoiceFormState(validForm())).toBe(true);
	});

	it('acepta un formulario vacío (borrador recién empezado)', () => {
		expect(isValidOpenVoiceFormState(emptyOpenVoiceForm())).toBe(true);
	});

	it('conserva un texto de al menos 20.000 caracteres sin truncar', () => {
		const longContent = 'x'.repeat(20000);
		const form = validForm({ content: longContent });
		expect(isValidOpenVoiceFormState(form)).toBe(true);
		expect((form as OpenVoiceFormState).content.length).toBe(20000);
	});

	it('conserva saltos de línea y párrafos múltiples', () => {
		const content = 'Primer párrafo.\n\nSegundo párrafo con\nun salto simple.\n\nTercero.';
		const form = validForm({ content });
		expect(isValidOpenVoiceFormState(form)).toBe(true);
		expect((form as OpenVoiceFormState).content).toBe(content);
	});

	it('rechaza un texto por encima de la guarda técnica de longitud', () => {
		const form = validForm({ content: 'a'.repeat(OPEN_VOICE_CONTENT_MAX_LENGTH + 1) });
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('rechaza un scopeType que no existe en el vocabulario', () => {
		const form = { ...validForm(), scopeType: 'planeta' };
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('acepta el ámbito "multiple" (no se limita a un único lugar) sin scopeValue', () => {
		const form = validForm({ scopeType: 'multiple', scopeValue: undefined });
		expect(isValidOpenVoiceFormState(form)).toBe(true);
	});

	it('rechaza scopeValue presente cuando el ámbito es nacional', () => {
		const form = validForm({ scopeType: 'nacional', scopeValue: 'Madrid' });
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('rechaza scopeValue presente cuando el ámbito es "multiple"', () => {
		const form = validForm({ scopeType: 'multiple', scopeValue: 'Madrid' });
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('rechaza scopeValue ausente cuando el ámbito requiere uno', () => {
		const form = validForm({ scopeType: 'provincia', scopeValue: undefined });
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('acepta una comunidad autónoma real', () => {
		const form = validForm({ scopeType: 'comunidad_autonoma', scopeValue: 'Cataluña' });
		expect(isValidOpenVoiceFormState(form)).toBe(true);
	});

	it('acepta el nombre unificado de Baleares ("Illes Balears") a nivel de comunidad', () => {
		const form = validForm({ scopeType: 'comunidad_autonoma', scopeValue: 'Illes Balears' });
		expect(isValidOpenVoiceFormState(form)).toBe(true);
	});

	it('rechaza el nombre sin unificar ("Islas Baleares") a nivel de comunidad', () => {
		const form = validForm({ scopeType: 'comunidad_autonoma', scopeValue: 'Islas Baleares' });
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('rechaza una comunidad autónoma inventada', () => {
		const form = validForm({ scopeType: 'comunidad_autonoma', scopeValue: 'Comunidad Inventada' });
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('acepta una provincia real', () => {
		const form = validForm({ scopeType: 'provincia', scopeValue: 'Zaragoza' });
		expect(isValidOpenVoiceFormState(form)).toBe(true);
	});

	it('acepta un municipio con nombre y código INE de 5 dígitos', () => {
		const form = validForm({
			scopeType: 'municipio',
			scopeValue: 'Cabrejas del Pinar',
			municipalityCode: '42045'
		});
		expect(isValidOpenVoiceFormState(form)).toBe(true);
	});

	it('rechaza municipio con nombre pero sin código INE', () => {
		const form = validForm({
			scopeType: 'municipio',
			scopeValue: 'Cabrejas del Pinar',
			municipalityCode: undefined
		});
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('rechaza municipio con código INE pero sin nombre', () => {
		const form = validForm({
			scopeType: 'municipio',
			scopeValue: undefined,
			municipalityCode: '42045'
		});
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('rechaza un código de municipio con un formato inválido (no son 5 dígitos)', () => {
		const form = validForm({
			scopeType: 'municipio',
			scopeValue: 'Zaragoza',
			municipalityCode: 'abc'
		});
		expect(isValidOpenVoiceFormState(form)).toBe(false);
		const form2 = validForm({
			scopeType: 'municipio',
			scopeValue: 'Zaragoza',
			municipalityCode: '123'
		});
		expect(isValidOpenVoiceFormState(form2)).toBe(false);
	});

	it('rechaza municipalityCode presente en un ámbito que no es municipio', () => {
		const form = validForm({
			scopeType: 'provincia',
			scopeValue: 'Zaragoza',
			municipalityCode: '50297'
		});
		expect(isValidOpenVoiceFormState(form)).toBe(false);
	});

	it('rechaza un valor que no es un objeto', () => {
		expect(isValidOpenVoiceFormState('no-es-un-objeto')).toBe(false);
		expect(isValidOpenVoiceFormState(null)).toBe(false);
		expect(isValidOpenVoiceFormState(undefined)).toBe(false);
	});
});

describe('isOpenVoiceContentMeaningful', () => {
	it('rechaza contenido vacío', () => {
		expect(isOpenVoiceContentMeaningful('')).toBe(false);
	});

	it('rechaza contenido formado solo por espacios/saltos de línea', () => {
		expect(isOpenVoiceContentMeaningful('   \n\n   \t  ')).toBe(false);
	});

	it('rechaza un texto por debajo del mínimo significativo', () => {
		expect(isOpenVoiceContentMeaningful('muy corto')).toBe(false);
	});

	it('acepta un texto que alcanza el mínimo significativo', () => {
		expect(isOpenVoiceContentMeaningful('a'.repeat(20))).toBe(true);
	});
});

describe('isValidOpenVoiceDraftPayload', () => {
	it('acepta una envoltura de borrador completa y correcta', () => {
		const payload = {
			version: OPEN_VOICE_DRAFT_VERSION,
			form: validForm(),
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidOpenVoiceDraftPayload(payload)).toBe(true);
	});

	it('rechaza una versión antigua o desconocida', () => {
		const payload = {
			version: 0,
			form: validForm(),
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidOpenVoiceDraftPayload(payload)).toBe(false);
	});

	it('rechaza JSON manipulado sin la forma esperada', () => {
		expect(isValidOpenVoiceDraftPayload({ foo: 'bar' })).toBe(false);
	});

	it('recupera correctamente municipio, provincia y comunidad autónoma a través de la envoltura completa', () => {
		const municipioPayload = {
			version: OPEN_VOICE_DRAFT_VERSION,
			form: validForm({ scopeType: 'municipio', scopeValue: 'Íscar', municipalityCode: '47075' }),
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidOpenVoiceDraftPayload(municipioPayload)).toBe(true);
		expect((municipioPayload.form as OpenVoiceFormState).scopeValue).toBe('Íscar');
		expect((municipioPayload.form as OpenVoiceFormState).municipalityCode).toBe('47075');

		const provinciaPayload = {
			version: OPEN_VOICE_DRAFT_VERSION,
			form: validForm({ scopeType: 'provincia', scopeValue: 'Valladolid' }),
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidOpenVoiceDraftPayload(provinciaPayload)).toBe(true);

		const comunidadPayload = {
			version: OPEN_VOICE_DRAFT_VERSION,
			form: validForm({ scopeType: 'comunidad_autonoma', scopeValue: 'Castilla y León' }),
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidOpenVoiceDraftPayload(comunidadPayload)).toBe(true);
	});

	it('conserva un texto largo íntegro a través de la envoltura completa', () => {
		const longContent = 'párrafo largo\ncon saltos\n\n'.repeat(1000);
		const payload = {
			version: OPEN_VOICE_DRAFT_VERSION,
			form: validForm({ content: longContent }),
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isValidOpenVoiceDraftPayload(payload)).toBe(true);
		expect((payload.form as OpenVoiceFormState).content).toBe(longContent);
	});
});

describe('isOpenVoiceDraftExpired', () => {
	it('no caduca un borrador reciente', () => {
		const payload = {
			version: OPEN_VOICE_DRAFT_VERSION,
			form: validForm(),
			pendingAutoSubmit: false,
			savedAt: Date.now()
		};
		expect(isOpenVoiceDraftExpired(payload)).toBe(false);
	});

	it('caduca un borrador de hace más de una semana', () => {
		const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
		const payload = {
			version: OPEN_VOICE_DRAFT_VERSION,
			form: validForm(),
			pendingAutoSubmit: false,
			savedAt: eightDaysAgo
		};
		expect(isOpenVoiceDraftExpired(payload)).toBe(true);
	});
});
