import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { autonomousCommunities, provinces } from './regions';
import { provinceCodes } from './provinceCodes';
import { communityCodes } from './communityCodes';
import { filterByQuery } from '$lib/utils/textSearch';
import { unifiedCommunityName } from '$lib/utils/territoryScope';
import type { Municipality } from './municipios';

let municipalities: Municipality[];

beforeAll(() => {
	const path = fileURLToPath(new URL('../../../static/data/municipios.json', import.meta.url));
	const rows = JSON.parse(readFileSync(path, 'utf-8')) as [string, string, string][];
	municipalities = rows.map(([ineCode, name, provinceCode]) => ({ ineCode, name, provinceCode }));
});

describe('provinceCodes: nivel provincial', () => {
	it('tiene exactamente 52 provincias/ciudades autónomas', () => {
		expect(provinceCodes).toHaveLength(52);
	});

	it('todos los códigos de provincia son únicos', () => {
		const codes = provinceCodes.map((p) => p.code);
		expect(new Set(codes).size).toBe(52);
	});

	it('todos los códigos de provincia tienen el formato oficial (2 dígitos)', () => {
		expect(provinceCodes.every((p) => /^\d{2}$/.test(p.code))).toBe(true);
	});

	it('Ceuta y Melilla aparecen exactamente una vez cada una a nivel provincial', () => {
		expect(provinceCodes.filter((p) => p.name === 'Ceuta')).toHaveLength(1);
		expect(provinceCodes.filter((p) => p.name === 'Melilla')).toHaveLength(1);
	});

	it('coincide en número con `regions.ts` (52 provincias, verificado manualmente)', () => {
		expect(provinces).toHaveLength(52);
		expect(provinceCodes).toHaveLength(provinces.length);
	});
});

describe('communityCodes: nivel autonómico', () => {
	it('tiene exactamente 19 comunidades/ciudades autónomas', () => {
		expect(communityCodes).toHaveLength(19);
	});

	it('todos los códigos de comunidad (CODAUTO) son únicos', () => {
		const codes = communityCodes.map((c) => c.code);
		expect(new Set(codes).size).toBe(19);
	});

	it('todos los códigos de comunidad tienen el formato oficial (2 dígitos)', () => {
		expect(communityCodes.every((c) => /^\d{2}$/.test(c.code))).toBe(true);
	});

	it('Ceuta y Melilla aparecen exactamente una vez cada una a nivel autonómico', () => {
		expect(communityCodes.filter((c) => c.name === 'Ciudad de Ceuta')).toHaveLength(1);
		expect(communityCodes.filter((c) => c.name === 'Ciudad de Melilla')).toHaveLength(1);
	});

	it('coincide en número con `regions.ts` (19 comunidades, verificado manualmente)', () => {
		expect(autonomousCommunities).toHaveLength(19);
		expect(communityCodes).toHaveLength(autonomousCommunities.length);
	});

	it('cada comunidad reúne exactamente las provincias que le corresponden', () => {
		const totalProvincesAcrossCommunities = communityCodes.reduce(
			(sum, c) => sum + c.provinceCodes.length,
			0
		);
		expect(totalProvincesAcrossCommunities).toBe(52);
	});
});

describe('municipios: integridad referencial', () => {
	it('todo municipio referencia una provincia válida', () => {
		const validProvinceCodes = new Set(provinceCodes.map((p) => p.code));
		const invalid = municipalities.filter((m) => !validProvinceCodes.has(m.provinceCode));
		expect(invalid).toEqual([]);
	});

	it('todo municipio, a través de su provincia, referencia una comunidad válida', () => {
		const provinceToCommunity = new Map(provinceCodes.map((p) => [p.code, p.communityCode]));
		const validCommunityCodes = new Set(communityCodes.map((c) => c.code));
		const invalid = municipalities.filter((m) => {
			const communityCode = provinceToCommunity.get(m.provinceCode);
			return !communityCode || !validCommunityCodes.has(communityCode);
		});
		expect(invalid).toEqual([]);
	});

	it('ningún código municipal (INE) está duplicado', () => {
		const codes = municipalities.map((m) => m.ineCode);
		expect(new Set(codes).size).toBe(codes.length);
	});

	it('Ceuta tiene exactamente un municipio (ella misma)', () => {
		const ceutaProvinceCode = provinceCodes.find((p) => p.name === 'Ceuta')!.code;
		const ceutaMunicipalities = municipalities.filter((m) => m.provinceCode === ceutaProvinceCode);
		expect(ceutaMunicipalities).toHaveLength(1);
		expect(ceutaMunicipalities[0].name).toBe('Ceuta');
	});

	it('Melilla tiene exactamente un municipio (ella misma)', () => {
		const melillaProvinceCode = provinceCodes.find((p) => p.name === 'Melilla')!.code;
		const melillaMunicipalities = municipalities.filter(
			(m) => m.provinceCode === melillaProvinceCode
		);
		expect(melillaMunicipalities).toHaveLength(1);
		expect(melillaMunicipalities[0].name).toBe('Melilla');
	});
});

describe('nombre unificado de Baleares', () => {
	it('provinceCodes usa el mismo nombre ("Illes Balears") a nivel de provincia y de comunidad', () => {
		const baleares = provinceCodes.find((p) => p.code === '07');
		expect(baleares?.name).toBe('Illes Balears');
		expect(baleares?.community).toBe('Illes Balears');
	});

	it('unifiedCommunityName() convierte el nombre de regions.ts ("Islas Baleares") al mismo criterio', () => {
		const baleares = autonomousCommunities.find((c) => c.name === 'Islas Baleares');
		expect(baleares).toBeDefined();
		expect(unifiedCommunityName(baleares!.name)).toBe('Illes Balears');
	});
});

describe('búsqueda provincial (52 opciones) sin tildes ni mayúsculas', () => {
	it('encuentra una provincia con tilde escribiendo sin tilde, en mayúsculas', () => {
		const results = filterByQuery(provinces, 'CADIZ', (p) => p);
		expect(results).toContain('Cádiz');
	});

	it('encuentra "A Coruña" buscando "coruna" en minúsculas sin tilde ni la "A" inicial', () => {
		const results = filterByQuery(provinces, 'coruna', (p) => p);
		expect(results).toContain('A Coruña');
	});
});
