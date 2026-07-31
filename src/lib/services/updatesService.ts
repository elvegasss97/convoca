import type { EventUpdate } from '$lib/types';
import { loadPersisted, savePersisted } from '$lib/utils/persistedArray';
import { randomId } from '$lib/utils/id';
import { ENABLE_DEMO_DATA } from '$lib/config/env';

const STORAGE_KEY = 'event-updates';
let updates: EventUpdate[] = loadPersisted<EventUpdate>(STORAGE_KEY, []);

function persist(): void {
	savePersisted(STORAGE_KEY, updates);
}

let seedingPromise: Promise<void> | null = null;

function ensureSeeded(): Promise<void> {
	if (!seedingPromise) seedingPromise = seedIfNeeded();
	return seedingPromise;
}

async function seedIfNeeded(): Promise<void> {
	if (updates.length > 0 || !ENABLE_DEMO_DATA) return;
	const { mockEventUpdates } = await import('$lib/mock/updates');
	updates = loadPersisted<EventUpdate>(STORAGE_KEY, mockEventUpdates);
}

function delay<T>(value: T): Promise<T> {
	return Promise.resolve(value);
}

export async function listUpdates(eventId: string): Promise<EventUpdate[]> {
	await ensureSeeded();
	const results = updates
		.filter((u) => u.eventId === eventId)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	return delay(results);
}

export type NewUpdateInput = Omit<EventUpdate, 'id' | 'createdAt'>;

export async function publishUpdate(input: NewUpdateInput): Promise<EventUpdate> {
	await ensureSeeded();
	const update: EventUpdate = {
		...input,
		id: `upd-${randomId().slice(0, 8)}`,
		createdAt: new Date().toISOString()
	};
	updates.unshift(update);
	persist();
	return delay(update);
}
