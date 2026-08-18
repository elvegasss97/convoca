import { describe, expect, it } from 'vitest';
import { filterByQuery, normalizeForSearch } from './textSearch';

describe('normalizeForSearch', () => {
	it('pasa a minúsculas', () => {
		expect(normalizeForSearch('MADRID')).toBe('madrid');
	});

	it('elimina tildes', () => {
		expect(normalizeForSearch('Alcalá')).toBe('alcala');
		expect(normalizeForSearch('Ávila')).toBe('avila');
	});

	it('pliega la ñ a n', () => {
		expect(normalizeForSearch('Muñoz')).toBe('munoz');
	});

	it('deja intactas las cadenas sin diacríticos', () => {
		expect(normalizeForSearch('Zaragoza')).toBe('zaragoza');
	});

	it('permite comparar dos formas equivalentes de un mismo nombre', () => {
		expect(normalizeForSearch('São Paulo')).toBe(normalizeForSearch('sao paulo'));
	});
});

describe('filterByQuery', () => {
	const provinces = ['Cádiz', 'Cáceres', 'Castellón', 'A Coruña', 'Álava', 'Alicante'];
	const identity = (s: string) => s;

	it('devuelve vacío para una búsqueda vacía o solo espacios', () => {
		expect(filterByQuery(provinces, '', identity)).toEqual([]);
		expect(filterByQuery(provinces, '   ', identity)).toEqual([]);
	});

	it('busca provincias sin distinguir tildes ni mayúsculas', () => {
		expect(filterByQuery(provinces, 'CADIZ', identity)).toEqual(['Cádiz']);
		expect(filterByQuery(provinces, 'alava', identity)).toEqual(['Álava']);
		expect(filterByQuery(provinces, 'coruna', identity)).toEqual(['A Coruña']);
	});

	it('prioriza los textos que EMPIEZAN por la búsqueda sobre los que solo la contienen', () => {
		const results = filterByQuery(provinces, 'ca', identity);
		// "Cádiz", "Cáceres" y "Castellón" empiezan por "ca"; "Alicante" solo la contiene ("ali-CA-nte").
		const startIndexes = ['Cádiz', 'Cáceres', 'Castellón'].map((p) => results.indexOf(p));
		const containsIndex = results.indexOf('Alicante');
		expect(Math.max(...startIndexes)).toBeLessThan(containsIndex);
	});

	it('respeta el límite de resultados', () => {
		expect(filterByQuery(provinces, 'a', identity, 2)).toHaveLength(2);
	});

	it('funciona con objetos usando el extractor de texto', () => {
		const items = [{ name: 'Zaragoza' }, { name: 'Zamora' }];
		expect(filterByQuery(items, 'zar', (i) => i.name)).toEqual([{ name: 'Zaragoza' }]);
	});
});
