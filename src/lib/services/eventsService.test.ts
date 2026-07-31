import { describe, expect, it } from 'vitest';
import {
	createEvent,
	getEvent,
	listPublicEvents,
	OwnershipError,
	updateEventAsOwner,
	type NewEventInput
} from './eventsService';

/**
 * Estas pruebas cubren la única capa de autorización/visibilidad que existe
 * hoy (comprobaciones en el servicio mock, sin backend). Sirven como
 * especificación de comportamiento a reproducir con políticas RLS reales en
 * Supabase (Fase 4): mismos casos, mismo resultado esperado, pero aplicados
 * en la base de datos en vez de en este array en memoria.
 */

function baseInput(overrides: Partial<NewEventInput> = {}): NewEventInput {
	return {
		title: 'Concentración de prueba',
		description: 'Descripción de prueba',
		objective: 'Objetivo de prueba',
		category: 'concentracion',
		themes: ['vivienda'],
		startAt: '2026-09-01T18:00:00.000Z',
		meetingPoint: {
			point: { lat: 40.4168, lng: -3.7038 },
			label: 'Plaza Mayor',
			address: 'Plaza Mayor, 1',
			city: 'Madrid',
			province: 'Madrid'
		},
		organizerId: 'org-test-1',
		createdByUserId: 'user-test-1',
		priorCommunication: 'unknown',
		rules: [],
		peacefulDeclaration: true,
		...overrides
	};
}

describe('eventsService — propiedad (ownership)', () => {
	it('permite a la propietaria editar su propia convocatoria', async () => {
		const event = await createEvent(baseInput({ createdByUserId: 'owner-a' }));
		const updated = await updateEventAsOwner('owner-a', event.id, { title: 'Título actualizado' });
		expect(updated.title).toBe('Título actualizado');
	});

	it('impide que otra cuenta edite una convocatoria ajena, aunque conozca el id', async () => {
		const event = await createEvent(baseInput({ createdByUserId: 'owner-a' }));
		await expect(
			updateEventAsOwner('owner-b', event.id, { title: 'Secuestrado' })
		).rejects.toBeInstanceOf(OwnershipError);

		const unchanged = await getEvent(event.id);
		expect(unchanged?.title).toBe('Concentración de prueba');
	});
});

describe('eventsService — visibilidad pública', () => {
	it('no expone borradores en el listado público', async () => {
		const draft = await createEvent(baseInput({ status: 'draft', title: 'Borrador oculto' }));
		const results = await listPublicEvents();
		expect(results.some((e) => e.id === draft.id)).toBe(false);
	});

	it('no expone convocatorias pendientes de revisión en el listado público', async () => {
		const pending = await createEvent(
			baseInput({ status: 'pending_review', title: 'Pendiente de moderación' })
		);
		const results = await listPublicEvents();
		expect(results.some((e) => e.id === pending.id)).toBe(false);
	});

	it('no expone convocatorias ocultas ni rechazadas en el listado público', async () => {
		const hidden = await createEvent(baseInput({ status: 'hidden', title: 'Oculta' }));
		const rejected = await createEvent(baseInput({ status: 'rejected', title: 'Rechazada' }));
		const results = await listPublicEvents();
		expect(results.some((e) => e.id === hidden.id)).toBe(false);
		expect(results.some((e) => e.id === rejected.id)).toBe(false);
	});

	it('expone una convocatoria publicada en el listado público', async () => {
		const published = await createEvent(baseInput({ status: 'published', title: 'Publicada' }));
		const results = await listPublicEvents();
		expect(results.some((e) => e.id === published.id)).toBe(true);
	});
});
