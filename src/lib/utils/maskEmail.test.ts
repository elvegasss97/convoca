import { describe, expect, it } from 'vitest';
import { maskEmail } from './maskEmail';

describe('maskEmail', () => {
	it('conserva los dos primeros caracteres del nombre local y del dominio', () => {
		expect(maskEmail('organizadora@gmail.com')).toBe('or**********@g****.com');
	});

	it('nombres locales de 1-2 caracteres muestran solo el primero', () => {
		expect(maskEmail('ab@example.com')).toBe('a*@e******.com');
	});

	it('sin arroba, devuelve el valor original en vez de romper', () => {
		expect(maskEmail('no-es-un-correo')).toBe('no-es-un-correo');
	});
});
