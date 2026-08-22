import { describe, expect, it } from 'vitest';
import { resolvePriorCommunicationRegime } from './priorCommunicationAuthority';

describe('resolvePriorCommunicationRegime', () => {
	it('detecta Cataluña por provincia', () => {
		expect(resolvePriorCommunicationRegime('Barcelona', undefined)).toBe('catalunya');
		expect(resolvePriorCommunicationRegime('Provincia de Girona', undefined)).toBe('catalunya');
		expect(resolvePriorCommunicationRegime('Lleida', undefined)).toBe('catalunya');
	});

	it('detecta País Vasco por provincia', () => {
		expect(resolvePriorCommunicationRegime('Bizkaia', undefined)).toBe('pais_vasco');
		expect(resolvePriorCommunicationRegime('Álava', undefined)).toBe('pais_vasco');
		expect(resolvePriorCommunicationRegime('Gipuzkoa', undefined)).toBe('pais_vasco');
	});

	it('cae en general para el resto de provincias, incluida Navarra', () => {
		expect(resolvePriorCommunicationRegime('Madrid', undefined)).toBe('general');
		expect(resolvePriorCommunicationRegime('Sevilla', undefined)).toBe('general');
		expect(resolvePriorCommunicationRegime('Navarra', undefined)).toBe('general');
	});

	it('cae en general cuando no hay texto reconocible', () => {
		expect(resolvePriorCommunicationRegime('', undefined)).toBe('general');
		expect(resolvePriorCommunicationRegime(undefined, undefined)).toBe('general');
		expect(resolvePriorCommunicationRegime('Provincia desconocida', '')).toBe('general');
	});

	it('es insensible a mayúsculas y tildes', () => {
		expect(resolvePriorCommunicationRegime('BARCELONA', undefined)).toBe('catalunya');
		expect(resolvePriorCommunicationRegime('alava', undefined)).toBe('pais_vasco');
	});

	it('recurre a cityName cuando province viene vacío', () => {
		expect(resolvePriorCommunicationRegime(undefined, 'Bilbao')).toBe('pais_vasco');
		expect(resolvePriorCommunicationRegime('', 'Barcelona')).toBe('catalunya');
	});
});
