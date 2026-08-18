import { describe, expect, it } from 'vitest';
import {
	communityNameVariants,
	resetScopeOnTypeChange,
	scopeIsMunicipio,
	scopeNeedsValue,
	scopeUsesSearchCombobox,
	unifiedCommunityName
} from './territoryScope';

describe('scopeNeedsValue', () => {
	it('nacional y multiple no necesitan valor', () => {
		expect(scopeNeedsValue('nacional')).toBe(false);
		expect(scopeNeedsValue('multiple')).toBe(false);
	});

	it('comunidad_autonoma, provincia y municipio sí necesitan valor', () => {
		expect(scopeNeedsValue('comunidad_autonoma')).toBe(true);
		expect(scopeNeedsValue('provincia')).toBe(true);
		expect(scopeNeedsValue('municipio')).toBe(true);
	});
});

describe('scopeIsMunicipio', () => {
	it('identifica el ámbito municipio', () => {
		expect(scopeIsMunicipio('municipio')).toBe(true);
		expect(scopeIsMunicipio('provincia')).toBe(false);
	});
});

describe('scopeUsesSearchCombobox', () => {
	it('municipio y provincia usan combobox de búsqueda', () => {
		expect(scopeUsesSearchCombobox('municipio')).toBe(true);
		expect(scopeUsesSearchCombobox('provincia')).toBe(true);
	});

	it('comunidad_autonoma sigue siendo un <select> simple', () => {
		expect(scopeUsesSearchCombobox('comunidad_autonoma')).toBe(false);
	});
});

describe('resetScopeOnTypeChange', () => {
	const firstValueFor = (type: string) =>
		type === 'provincia' ? 'Zaragoza' : type === 'comunidad_autonoma' ? 'Aragón' : undefined;

	it('cambiar a nacional limpia valor y código de municipio', () => {
		expect(resetScopeOnTypeChange('nacional', firstValueFor)).toEqual({
			scopeValue: undefined,
			municipalityCode: undefined
		});
	});

	it('cambiar a multiple limpia valor y código de municipio', () => {
		expect(resetScopeOnTypeChange('multiple', firstValueFor)).toEqual({
			scopeValue: undefined,
			municipalityCode: undefined
		});
	});

	it('cambiar a municipio no preselecciona ningún valor (hay que buscar)', () => {
		expect(resetScopeOnTypeChange('municipio', firstValueFor)).toEqual({
			scopeValue: undefined,
			municipalityCode: undefined
		});
	});

	it('cambiar a provincia tampoco preselecciona (también es un combobox de búsqueda)', () => {
		expect(resetScopeOnTypeChange('provincia', firstValueFor)).toEqual({
			scopeValue: undefined,
			municipalityCode: undefined
		});
	});

	it('cambiar a comunidad_autonoma preselecciona la primera opción y limpia el código de municipio', () => {
		expect(resetScopeOnTypeChange('comunidad_autonoma', firstValueFor)).toEqual({
			scopeValue: 'Aragón',
			municipalityCode: undefined
		});
	});
});

describe('unifiedCommunityName', () => {
	it('unifica "Islas Baleares" a "Illes Balears"', () => {
		expect(unifiedCommunityName('Islas Baleares')).toBe('Illes Balears');
	});

	it('deja el resto de nombres sin cambios', () => {
		expect(unifiedCommunityName('Aragón')).toBe('Aragón');
		expect(unifiedCommunityName('Ciudad de Ceuta')).toBe('Ciudad de Ceuta');
	});
});

describe('communityNameVariants', () => {
	it('el nombre unificado ("Illes Balears") incluye también el antiguo ("Islas Baleares")', () => {
		const variants = communityNameVariants('Illes Balears');
		expect(variants).toContain('Illes Balears');
		expect(variants).toContain('Islas Baleares');
	});

	it('el nombre antiguo ("Islas Baleares") incluye también el unificado ("Illes Balears")', () => {
		const variants = communityNameVariants('Islas Baleares');
		expect(variants).toContain('Illes Balears');
		expect(variants).toContain('Islas Baleares');
	});

	it('una comunidad sin alias conocido devuelve solo su propio nombre', () => {
		expect(communityNameVariants('Cataluña')).toEqual(['Cataluña']);
	});

	it('consistencia: el resultado de unifiedCommunityName() siempre está entre sus propios communityNameVariants()', () => {
		const original = 'Islas Baleares';
		const unified = unifiedCommunityName(original);
		expect(communityNameVariants(unified)).toContain(unified);
		expect(communityNameVariants(original)).toContain(unified);
	});
});
