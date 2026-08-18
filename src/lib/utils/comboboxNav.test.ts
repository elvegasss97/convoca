import { describe, expect, it } from 'vitest';
import { nextActiveIndex } from './comboboxNav';

describe('nextActiveIndex', () => {
	it('sin resultados, no hay índice activo posible', () => {
		expect(nextActiveIndex(-1, 'ArrowDown', 0)).toBe(-1);
		expect(nextActiveIndex(0, 'ArrowDown', 0)).toBe(-1);
	});

	it('ArrowDown desde ninguno seleccionado activa el primero', () => {
		expect(nextActiveIndex(-1, 'ArrowDown', 5)).toBe(0);
	});

	it('ArrowDown avanza al siguiente', () => {
		expect(nextActiveIndex(0, 'ArrowDown', 5)).toBe(1);
		expect(nextActiveIndex(3, 'ArrowDown', 5)).toBe(4);
	});

	it('ArrowDown en el último vuelve circularmente al primero', () => {
		expect(nextActiveIndex(4, 'ArrowDown', 5)).toBe(0);
	});

	it('ArrowUp desde ninguno seleccionado activa el último', () => {
		expect(nextActiveIndex(-1, 'ArrowUp', 5)).toBe(4);
	});

	it('ArrowUp retrocede al anterior', () => {
		expect(nextActiveIndex(3, 'ArrowUp', 5)).toBe(2);
	});

	it('ArrowUp en el primero vuelve circularmente al último', () => {
		expect(nextActiveIndex(0, 'ArrowUp', 5)).toBe(4);
	});

	it('Home siempre activa el primero', () => {
		expect(nextActiveIndex(3, 'Home', 5)).toBe(0);
	});

	it('End siempre activa el último', () => {
		expect(nextActiveIndex(0, 'End', 5)).toBe(4);
	});

	it('con un único resultado, ArrowDown y ArrowUp se quedan en él', () => {
		expect(nextActiveIndex(-1, 'ArrowDown', 1)).toBe(0);
		expect(nextActiveIndex(0, 'ArrowDown', 1)).toBe(0);
		expect(nextActiveIndex(0, 'ArrowUp', 1)).toBe(0);
	});
});
