import { describe, expect, it } from 'vitest';
import { assertOwnership, slugify, rowToEvent, OwnershipError } from './eventsService';

/**
 * Estas pruebas cubren la lógica pura de `eventsService.ts` (sin red): la
 * comprobación de propiedad y el mapeo de filas de Supabase al tipo
 * `Event`. La verificación real de que las políticas RLS de Postgres
 * bloquean a un usuario editando la convocatoria de otro (incluso llamando
 * directamente a la API, no solo desde la UI) se hizo en vivo contra el
 * proyecto de Supabase — ver el informe de pruebas de la Fase 14.
 */

describe('eventsService — assertOwnership', () => {
	it('no lanza si la cuenta es la propietaria', () => {
		expect(() => assertOwnership({ createdByUserId: 'user-a' }, 'user-a')).not.toThrow();
	});

	it('lanza OwnershipError si la cuenta no es la propietaria, aunque conozca el id', () => {
		expect(() => assertOwnership({ createdByUserId: 'user-a' }, 'user-b')).toThrow(OwnershipError);
	});
});

describe('eventsService — slugify', () => {
	it('normaliza acentos, espacios y mayúsculas', () => {
		expect(slugify('Concentración Vecinal, Día 1')).toBe('concentracion-vecinal-dia-1');
	});

	it('recorta guiones sobrantes al principio y al final', () => {
		expect(slugify('  ¡Marcha!  ')).toBe('marcha');
	});
});

describe('eventsService — rowToEvent', () => {
	it('convierte snake_case de la fila de Postgres a camelCase de Event, con los contadores de asistencia dados', () => {
		const row = {
			id: 'evt-1',
			slug: 'marcha-1',
			title: 'Marcha',
			description: 'Descripción',
			objective: 'Objetivo',
			category: 'marcha',
			themes: ['vivienda'],
			custom_theme_label: null,
			status: 'published',
			status_note: null,
			start_at: '2026-09-01T18:00:00.000Z',
			end_at: null,
			duration_minutes: 60,
			meeting_point: {
				point: { lat: 0, lng: 0 },
				label: 'Plaza',
				address: 'Calle 1',
				city: 'Madrid',
				province: 'Madrid'
			},
			route: null,
			organizer_id: 'org-1',
			created_by_user_id: 'user-1',
			verification: { level: 'none' },
			prior_communication: 'unknown',
			rules: ['Norma 1'],
			peaceful_declaration: true,
			cover_image_url: null,
			archived: false,
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-02T00:00:00.000Z'
		};

		const event = rowToEvent(row, { going: 3, interested: 5, isEstimate: true });

		expect(event.organizerId).toBe('org-1');
		expect(event.createdByUserId).toBe('user-1');
		expect(event.customThemeLabel).toBeUndefined();
		expect(event.attendance).toEqual({ going: 3, interested: 5, isEstimate: true });
	});
});
