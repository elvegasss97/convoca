import { describe, expect, it } from 'vitest';
import { filterEvents } from './filterEvents';
import type { Event } from '$lib/types';

function makeEvent(overrides: Partial<Event> = {}): Event {
	return {
		id: overrides.id ?? 'evt-1',
		slug: overrides.slug ?? 'evt-1',
		title: 'Concentración por la vivienda',
		description: 'Concentración pacífica frente al ayuntamiento.',
		objective: 'Reclamar vivienda pública',
		category: 'concentracion',
		themes: ['vivienda'],
		status: 'published',
		startAt: '2026-08-01T18:00:00.000Z',
		meetingPoint: {
			point: { lat: 40.4168, lng: -3.7038 },
			label: 'Plaza Mayor',
			address: 'Plaza Mayor, 1',
			city: 'Madrid',
			province: 'Madrid'
		},
		organizerId: 'org-1',
		createdByUserId: 'user-1',
		verification: { level: 'none' },
		priorCommunication: 'unknown',
		rules: [],
		peacefulDeclaration: true,
		attendance: { going: 0, interested: 0, isEstimate: true },
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
		...overrides
	};
}

describe('filterEvents', () => {
	it('filters by free-text query across title, description and city', () => {
		const events = [
			makeEvent({ id: 'a', title: 'Marcha por el clima' }),
			makeEvent({
				id: 'b',
				title: 'Asamblea vecinal',
				meetingPoint: { ...makeEvent().meetingPoint, city: 'Sevilla' }
			})
		];

		const results = filterEvents(events, { query: 'clima' });
		expect(results.map((e) => e.id)).toEqual(['a']);
	});

	it('filters by category', () => {
		const events = [
			makeEvent({ id: 'a', category: 'marcha' }),
			makeEvent({ id: 'b', category: 'asamblea' })
		];

		const results = filterEvents(events, { categories: ['asamblea'] });
		expect(results.map((e) => e.id)).toEqual(['b']);
	});

	it('filters out unverified events when verifiedOnly is set', () => {
		const events = [
			makeEvent({ id: 'a', verification: { level: 'none' } }),
			makeEvent({ id: 'b', verification: { level: 'identity_verified' } })
		];

		const results = filterEvents(events, { verifiedOnly: true });
		expect(results.map((e) => e.id)).toEqual(['b']);
	});

	it('sorts results chronologically by startAt', () => {
		const events = [
			makeEvent({ id: 'later', startAt: '2026-09-01T00:00:00.000Z' }),
			makeEvent({ id: 'sooner', startAt: '2026-08-01T00:00:00.000Z' })
		];

		const results = filterEvents(events, {});
		expect(results.map((e) => e.id)).toEqual(['sooner', 'later']);
	});
});
