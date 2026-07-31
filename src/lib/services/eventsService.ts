/**
 * Capa de acceso a datos de convocatorias.
 *
 * Todas las funciones son `async` y devuelven exactamente lo que devolverían
 * las futuras consultas a Supabase (`supabase.from('events')...`), para que
 * sustituir la implementación mock por llamadas reales no requiera tocar
 * ningún componente ni pantalla — solo este archivo.
 *
 * El array en memoria simula la tabla `events`. Los cambios se pierden al
 * recargar la página, igual que ocurriría con cualquier estado de cliente
 * no persistido; en producción esto será una tabla de Postgres.
 */
import type { Event, EventFiltersState, GeoPoint } from '$lib/types';
import { mockEvents } from '$lib/mock/events';
import { filterEvents } from '$lib/utils/filterEvents';
import { loadPersisted, savePersisted } from '$lib/utils/persistedArray';
import { randomId } from '$lib/utils/id';

const STORAGE_KEY = 'events';
const events: Event[] = loadPersisted(STORAGE_KEY, mockEvents);

function persist(): void {
	savePersisted(STORAGE_KEY, events);
}

const HIDDEN_FROM_PUBLIC = new Set<Event['status']>([
	'draft',
	'pending_review',
	'hidden',
	'rejected'
]);

function delay<T>(value: T): Promise<T> {
	return Promise.resolve(value);
}

function isPublic(event: Event): boolean {
	return !HIDDEN_FROM_PUBLIC.has(event.status);
}

export interface ListPublicEventsOptions {
	filters?: Partial<EventFiltersState>;
	origin?: GeoPoint;
}

/** Lista de convocatorias visibles públicamente, con filtros opcionales. */
export async function listPublicEvents(options: ListPublicEventsOptions = {}): Promise<Event[]> {
	const { filters = {}, origin } = options;
	const results = filterEvents(events.filter(isPublic), filters, origin);
	return delay(results);
}

export async function getEvent(idOrSlug: string): Promise<Event | undefined> {
	return delay(events.find((e) => e.id === idOrSlug || e.slug === idOrSlug));
}

export async function listEventsByOrganizer(organizerId: string): Promise<Event[]> {
	const results = events
		.filter((e) => e.organizerId === organizerId)
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	return delay(results);
}

export async function listPendingModeration(): Promise<Event[]> {
	const results = events
		.filter((e) => e.status === 'pending_review')
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	return delay(results);
}

/** Devuelve estadísticas agregadas para la cabecera de Inicio. */
export async function getPublicStats(): Promise<{
	eventCount: number;
	estimatedAttendance: number;
}> {
	const publicEvents = events.filter(isPublic);
	const eventCount = publicEvents.length;
	const estimatedAttendance = publicEvents.reduce(
		(sum, e) => sum + e.attendance.going + e.attendance.interested,
		0
	);
	return delay({ eventCount, estimatedAttendance });
}

export type NewEventInput = Omit<
	Event,
	'id' | 'slug' | 'createdAt' | 'updatedAt' | 'attendance' | 'verification' | 'status'
> & { status?: Event['status'] };

function slugify(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

function generateId(): string {
	return `evt-${randomId().slice(0, 8)}`;
}

export async function createEvent(input: NewEventInput): Promise<Event> {
	const now = new Date().toISOString();
	const id = generateId();
	const event: Event = {
		...input,
		id,
		slug: `${slugify(input.title)}-${id.slice(4)}`,
		status: input.status ?? 'pending_review',
		verification: { level: 'none' },
		attendance: { going: 0, interested: 0, isEstimate: true },
		createdAt: now,
		updatedAt: now
	};
	events.unshift(event);
	persist();
	return delay(event);
}

export async function updateEvent(id: string, patch: Partial<Event>): Promise<Event> {
	const index = events.findIndex((e) => e.id === id);
	if (index === -1) throw new Error(`Convocatoria no encontrada: ${id}`);
	const updated: Event = { ...events[index], ...patch, updatedAt: new Date().toISOString() };
	events[index] = updated;
	persist();
	return delay(updated);
}

export async function cancelEvent(id: string, note: string): Promise<Event> {
	return updateEvent(id, { status: 'cancelled', statusNote: note });
}

export async function setEventStatus(
	id: string,
	status: Event['status'],
	note?: string
): Promise<Event> {
	return updateEvent(id, { status, statusNote: note });
}

/**
 * Se lanza cuando una cuenta intenta modificar una convocatoria que no le
 * pertenece — incluido manipulando manualmente el id en la URL o en una
 * llamada directa. En esta fase mock es una comprobación en el cliente (sin
 * backend no hay una capa de autorización real); con Supabase, esto lo
 * reforzarán las políticas de Row Level Security en el servidor.
 */
export class OwnershipError extends Error {}

function assertOwnership(event: Event, userId: string): void {
	if (event.createdByUserId !== userId) {
		throw new OwnershipError('No tienes permiso para modificar esta convocatoria.');
	}
}

/** Variante de `updateEvent` que comprueba que `userId` es quien creó la convocatoria. */
export async function updateEventAsOwner(
	userId: string,
	id: string,
	patch: Partial<Event>
): Promise<Event> {
	const event = events.find((e) => e.id === id);
	if (!event) throw new Error(`Convocatoria no encontrada: ${id}`);
	assertOwnership(event, userId);
	return updateEvent(id, patch);
}

export async function cancelEventAsOwner(userId: string, id: string, note: string): Promise<Event> {
	return updateEventAsOwner(userId, id, { status: 'cancelled', statusNote: note });
}

export async function setArchivedAsOwner(
	userId: string,
	id: string,
	archived: boolean
): Promise<Event> {
	return updateEventAsOwner(userId, id, { archived });
}

/** Crea una copia en borrador de una convocatoria propia, con nuevo id y contadores a cero. */
export async function duplicateEventAsOwner(userId: string, id: string): Promise<Event> {
	const source = events.find((e) => e.id === id);
	if (!source) throw new Error(`Convocatoria no encontrada: ${id}`);
	assertOwnership(source, userId);

	const now = new Date().toISOString();
	const newId = generateId();
	const duplicate: Event = {
		...source,
		id: newId,
		slug: `${slugify(source.title)}-${newId.slice(4)}`,
		title: `${source.title} (copia)`,
		status: 'draft',
		statusNote: undefined,
		archived: false,
		verification: { level: 'none' },
		attendance: { going: 0, interested: 0, isEstimate: true },
		createdAt: now,
		updatedAt: now
	};
	events.unshift(duplicate);
	persist();
	return delay(duplicate);
}
