import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { municipalityById, searchMunicipalities, type Municipality } from './municipios';

// Se lee el catálogo real generado (static/data/municipios.json) en vez de
// hacer fetch: es el mismo fichero que sirve la app, así que estas pruebas
// también actúan como comprobación de que la generación desde el INE
// (scripts/data/generate-municipios.py) sigue produciendo un catálogo
// completo y correcto — sin red, rápido, igual que el resto de tests.
let catalog: Municipality[];

beforeAll(() => {
	const path = fileURLToPath(new URL('../../../static/data/municipios.json', import.meta.url));
	const rows = JSON.parse(readFileSync(path, 'utf-8')) as [string, string, string][];
	catalog = rows.map(([ineCode, name, provinceCode]) => ({ ineCode, name, provinceCode }));
});

describe('catálogo de municipios', () => {
	it('contiene muchos más de los 12 municipios mock anteriores', () => {
		expect(catalog.length).toBeGreaterThan(8000);
	});

	it('cada fila tiene código INE de 5 dígitos', () => {
		expect(catalog.every((m) => /^\d{5}$/.test(m.ineCode))).toBe(true);
	});

	it('los códigos INE son únicos', () => {
		expect(new Set(catalog.map((m) => m.ineCode)).size).toBe(catalog.length);
	});
});

describe('searchMunicipalities', () => {
	it('devuelve vacío para una búsqueda vacía o solo espacios', () => {
		expect(searchMunicipalities(catalog, '')).toEqual([]);
		expect(searchMunicipalities(catalog, '   ')).toEqual([]);
	});

	it('encuentra un municipio pequeño que no estaba en el mock de 12 ciudades', () => {
		const results = searchMunicipalities(catalog, 'Cabrejas del Pinar');
		expect(results.some((m) => m.name === 'Cabrejas del Pinar')).toBe(true);
	});

	it('encuentra un municipio con tilde escribiendo la tilde', () => {
		const results = searchMunicipalities(catalog, 'Íscar');
		expect(results.some((m) => m.name === 'Íscar')).toBe(true);
	});

	it('encuentra un municipio con tilde escribiendo SIN la tilde', () => {
		const results = searchMunicipalities(catalog, 'Iscar');
		expect(results.some((m) => m.name === 'Íscar')).toBe(true);
	});

	it('ignora mayúsculas/minúsculas', () => {
		const results = searchMunicipalities(catalog, 'ZARAGOZA');
		expect(results.some((m) => m.name === 'Zaragoza')).toBe(true);
	});

	it('un nombre repetido en distintas provincias devuelve todas las coincidencias', () => {
		const results = searchMunicipalities(catalog, 'Moya');
		const provinces = new Set(results.filter((m) => m.name === 'Moya').map((m) => m.provinceCode));
		expect(provinces.size).toBeGreaterThan(1);
	});

	it('prioriza los nombres que EMPIEZAN por la búsqueda sobre los que solo la contienen', () => {
		const results = searchMunicipalities(catalog, 'Alcal');
		const firstContains = results.findIndex((m) => !m.name.toLowerCase().startsWith('alcal'));
		const lastStarts = results
			.map((m) => m.name.toLowerCase().startsWith('alcal'))
			.lastIndexOf(true);
		if (firstContains !== -1 && lastStarts !== -1) {
			expect(lastStarts).toBeLessThan(firstContains);
		}
	});

	it('respeta el límite de resultados', () => {
		const results = searchMunicipalities(catalog, 'a', 10);
		expect(results.length).toBeLessThanOrEqual(10);
	});
});

describe('municipalityById', () => {
	it('encuentra un municipio por su código INE exacto', () => {
		const found = municipalityById(catalog, '42045');
		expect(found?.name).toBe('Cabrejas del Pinar');
	});

	it('devuelve undefined para un código que no existe', () => {
		expect(municipalityById(catalog, '99999')).toBeUndefined();
	});
});
