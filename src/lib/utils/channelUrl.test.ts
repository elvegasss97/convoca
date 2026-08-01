import { describe, expect, it } from 'vitest';
import { validateChannelUrl } from './channelUrl';

describe('validateChannelUrl — whatsapp', () => {
	it('acepta un enlace real de grupo de WhatsApp', () => {
		expect(validateChannelUrl('https://chat.whatsapp.com/ABC123XYZ', 'whatsapp').valid).toBe(true);
	});

	it('acepta whatsapp.com sin subdominio', () => {
		expect(validateChannelUrl('https://whatsapp.com/algo', 'whatsapp').valid).toBe(true);
	});

	it('rechaza un dominio que imita a WhatsApp con un sufijo añadido', () => {
		const result = validateChannelUrl('https://chat.whatsapp.com.attacker.net/ABC', 'whatsapp');
		expect(result.valid).toBe(false);
	});

	it('rechaza un dominio parecido pero distinto (typosquatting)', () => {
		expect(validateChannelUrl('https://chat-whatsapp.com/ABC', 'whatsapp').valid).toBe(false);
	});

	it('rechaza whatsapp por http (no https)', () => {
		expect(validateChannelUrl('http://chat.whatsapp.com/ABC', 'whatsapp').valid).toBe(false);
	});
});

describe('validateChannelUrl — telegram', () => {
	it('acepta un enlace real de t.me', () => {
		expect(validateChannelUrl('https://t.me/convocaavisos', 'telegram').valid).toBe(true);
	});

	it('acepta telegram.me', () => {
		expect(validateChannelUrl('https://telegram.me/convocaavisos', 'telegram').valid).toBe(true);
	});

	it('rechaza un dominio que imita a Telegram con un sufijo añadido', () => {
		expect(validateChannelUrl('https://t.me.attacker.net/x', 'telegram').valid).toBe(false);
	});
});

describe('validateChannelUrl — esquemas peligrosos', () => {
	it('rechaza javascript:', () => {
		expect(validateChannelUrl('javascript:alert(1)', 'other').valid).toBe(false);
	});

	it('rechaza data:', () => {
		expect(validateChannelUrl('data:text/html,<script>alert(1)</script>', 'other').valid).toBe(
			false
		);
	});

	it('rechaza vbscript:', () => {
		expect(validateChannelUrl('vbscript:msgbox(1)', 'other').valid).toBe(false);
	});

	it('rechaza file:', () => {
		expect(validateChannelUrl('file:///etc/passwd', 'other').valid).toBe(false);
	});
});

describe('validateChannelUrl — reglas generales', () => {
	it('rechaza una cadena vacía', () => {
		expect(validateChannelUrl('', 'other').valid).toBe(false);
	});

	it('rechaza texto que no es una URL', () => {
		expect(validateChannelUrl('no es una url', 'other').valid).toBe(false);
	});

	it('rechaza HTML embebido en la URL', () => {
		expect(validateChannelUrl('https://example.com/<script>alert(1)</script>', 'other').valid).toBe(
			false
		);
	});

	it('rechaza una URL demasiado larga', () => {
		const longUrl = 'https://example.com/' + 'a'.repeat(500);
		expect(validateChannelUrl(longUrl, 'other').valid).toBe(false);
	});

	it('acepta cualquier https válido para plataforma "other"', () => {
		expect(validateChannelUrl('https://miorganizacion.example/coordinacion', 'other').valid).toBe(
			true
		);
	});
});
