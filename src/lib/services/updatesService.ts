import type { EventUpdate } from '$lib/types';
import { mockEventUpdates } from '$lib/mock/updates';
import { loadPersisted, savePersisted } from '$lib/utils/persistedArray';

const STORAGE_KEY = 'event-updates';
const updates: EventUpdate[] = loadPersisted(STORAGE_KEY, mockEventUpdates);

function persist(): void {
	savePersisted(STORAGE_KEY, updates);
}

function delay<T>(value: T): Promise<T> {
	return Promise.resolve(value);
}

export async function listUpdates(eventId: string): Promise<EventUpdate[]> {
	const results = updates
		.filter((u) => u.eventId === eventId)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	return delay(results);
}

export type NewUpdateInput = Omit<EventUpdate, 'id' | 'createdAt'>;

export async function publishUpdate(input: NewUpdateInput): Promise<EventUpdate> {
	const update: EventUpdate = {
		...input,
		id: `upd-${Math.random().toString(36).slice(2, 9)}`,
		createdAt: new Date().toISOString()
	};
	updates.unshift(update);
	persist();
	return delay(update);
}
