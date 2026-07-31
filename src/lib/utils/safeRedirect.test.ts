import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safeRedirect';

describe('safeRedirect', () => {
	it('acepta una ruta interna normal', () => {
		expect(safeRedirect('/organizador', '/')).toBe('/organizador');
	});

	it('acepta una ruta interna con query string', () => {
		expect(safeRedirect('/crear?paso=2', '/')).toBe('/crear?paso=2');
	});

	it('rechaza una URL absoluta externa', () => {
		expect(safeRedirect('https://evil.example/phishing', '/organizador')).toBe('/organizador');
	});

	it('rechaza una URL protocol-relative ("//evil.com")', () => {
		expect(safeRedirect('//evil.example', '/organizador')).toBe('/organizador');
	});

	it('rechaza rutas con backslash (algunos navegadores lo normalizan a "/")', () => {
		expect(safeRedirect('/\\evil.example', '/organizador')).toBe('/organizador');
	});

	it('usa el valor por defecto si no se indica ningún destino', () => {
		expect(safeRedirect(null, '/organizador')).toBe('/organizador');
		expect(safeRedirect(undefined, '/organizador')).toBe('/organizador');
		expect(safeRedirect('', '/organizador')).toBe('/organizador');
	});
});
