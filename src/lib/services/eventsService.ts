/**
 * Capa de acceso a datos de convocatorias, sobre Supabase.
 *
 * Todas las funciones mantienen exactamente la misma firma pública que la
 * implementación mock anterior, para que ningún componente Svelte necesite
 * cambiar. `attendance` (going/interested) nunca es una columna editable de
 * `events`: se calcula en el servidor vía `get_attendance_counts()` (ver
 * `supabase/migrations/0009_attendance_responses.sql`), así que aquí se
 * recompone tras cada lectura.
 *
 * La autorización real (quién puede leer/crear/editar qué) vive en las
 * políticas RLS de Postgres (`supabase/migrations/0003_events.sql`), no en
 * este archivo: las comprobaciones de propiedad de aquí son una
 * conveniencia de UX (fallar rápido con un mensaje claro), nunca la única
 * barrera de seguridad.
 */
import { supabase } from '$lib/supabase/client';
import type { Database, Json } from '$lib/supabase/database.types';
import type { Event, EventFiltersState, GeoPoint, AttendanceCounts } from '$lib/types';
import { filterEvents } from '$lib/utils/filterEvents';
import { getEventTimeCategory } from '$lib/utils/eventTiming';

type EventUpdatePayload = Database['public']['Tables']['events']['Update'];
import { randomId } from '$lib/utils/id';

type EventRow = {
	id: string;
	slug: string;
	title: string;
	description: string;
	objective: string;
	category: string;
	themes: string[];
	custom_theme_label: string | null;
	status: string;
	status_note: string | null;
	start_at: string;
	end_at: string | null;
	duration_minutes: number | null;
	meeting_point: Json;
	route: Json | null;
	organizer_id: string;
	created_by_user_id: string;
	verification: Json;
	prior_communication: string;
	rules: string[];
	peaceful_declaration: boolean;
	cover_image_url: string | null;
	archived: boolean;
	created_at: string;
	updated_at: string;
};

const EMPTY_ATTENDANCE: AttendanceCounts = { going: 0, interested: 0, isEstimate: true };

// 'cancelled' se excluye del listado/mapa público por defecto: a diferencia
// de 'completed' (que ya queda fuera del filtro temporal por defecto porque
// su fecha ya pasó), una convocatoria cancelada puede tener fecha futura y
// sin este filtro seguiría apareciendo mezclada con convocatorias activas,
// indistinguible en la tarjeta (solo la ficha individual muestra el aviso
// de cancelación). Sigue accesible por enlace directo (`getEvent`, más
// abajo, no aplica este filtro) — no desaparece, solo deja de listarse.
const HIDDEN_FROM_PUBLIC = ['draft', 'pending_review', 'hidden', 'rejected', 'cancelled'];

export function rowToEvent(row: EventRow, attendance: AttendanceCounts = EMPTY_ATTENDANCE): Event {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		description: row.description,
		objective: row.objective,
		category: row.category as Event['category'],
		themes: row.themes as Event['themes'],
		customThemeLabel: row.custom_theme_label ?? undefined,
		status: row.status as Event['status'],
		startAt: row.start_at,
		endAt: row.end_at ?? undefined,
		durationMinutes: row.duration_minutes ?? undefined,
		meetingPoint: row.meeting_point as unknown as Event['meetingPoint'],
		route: (row.route as unknown as Event['route']) ?? undefined,
		organizerId: row.organizer_id,
		createdByUserId: row.created_by_user_id,
		verification: row.verification as unknown as Event['verification'],
		priorCommunication: row.prior_communication as Event['priorCommunication'],
		rules: row.rules,
		peacefulDeclaration: row.peaceful_declaration,
		attendance,
		coverImageUrl: row.cover_image_url ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		statusNote: row.status_note ?? undefined,
		archived: row.archived
	};
}

async function attachAttendance(rows: EventRow[]): Promise<Event[]> {
	if (rows.length === 0) return [];
	const { data } = await supabase.rpc('get_attendance_counts', {
		p_event_ids: rows.map((r) => r.id)
	});
	const countsByEvent = new Map((data ?? []).map((c) => [c.event_id, c]));
	return rows.map((row) => {
		const c = countsByEvent.get(row.id);
		const attendance: AttendanceCounts = c
			? { going: c.going_count, interested: c.interested_count, isEstimate: true }
			: EMPTY_ATTENDANCE;
		return rowToEvent(row, attendance);
	});
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ListPublicEventsOptions {
	filters?: Partial<EventFiltersState>;
	origin?: GeoPoint;
}

/** Lista de convocatorias visibles públicamente, con filtros opcionales. */
export async function listPublicEvents(options: ListPublicEventsOptions = {}): Promise<Event[]> {
	const { filters = {}, origin } = options;
	const { data, error } = await supabase
		.from('events')
		.select('*')
		.not('status', 'in', `(${HIDDEN_FROM_PUBLIC.join(',')})`)
		.order('start_at', { ascending: true });
	if (error) throw error;
	const events = await attachAttendance(data ?? []);
	return filterEvents(events, filters, origin);
}

export async function getEvent(idOrSlug: string): Promise<Event | undefined> {
	const column = UUID_RE.test(idOrSlug) ? 'id' : 'slug';
	const { data, error } = await supabase
		.from('events')
		.select('*')
		.eq(column, idOrSlug)
		.maybeSingle();
	if (error || !data) return undefined;
	const [event] = await attachAttendance([data]);
	return event;
}

export async function listEventsByOrganizer(organizerId: string): Promise<Event[]> {
	const { data, error } = await supabase
		.from('events')
		.select('*')
		.eq('organizer_id', organizerId)
		.order('updated_at', { ascending: false });
	if (error) throw error;
	return attachAttendance(data ?? []);
}

export async function listPendingModeration(): Promise<Event[]> {
	const { data, error } = await supabase
		.from('events')
		.select('*')
		.eq('status', 'pending_review')
		.order('created_at', { ascending: true });
	if (error) throw error;
	return attachAttendance(data ?? []);
}

/**
 * Devuelve estadísticas agregadas para la cabecera de Inicio/Descubrir.
 * Nunca inventa cifras: es la suma real de `events`. `listPublicEvents()`
 * ya excluye estados ocultos (draft, hidden, cancelled...), pero no la
 * fecha — así que aquí se excluyen además las convocatorias cuya fecha ya
 * pasó, con el mismo criterio (`getEventTimeCategory`, basado solo en
 * `startAt`, nunca en `status`) que ya usa por defecto el listado/mapa de
 * Descubrir. Sin este filtro, una convocatoria `completed` seguía sumando
 * a "convocatorias activas" y "personas estimadas" aunque ya no apareciera
 * en el listado visible, dando cifras inconsistentes entre la cabecera y
 * la lista real.
 */
export async function getPublicStats(): Promise<{
	eventCount: number;
	estimatedAttendance: number;
}> {
	const publicEvents = await listPublicEvents();
	const activeEvents = publicEvents.filter(
		(e) => getEventTimeCategory(e.startAt).category !== 'past'
	);
	const eventCount = activeEvents.length;
	const estimatedAttendance = activeEvents.reduce(
		(sum, e) => sum + e.attendance.going + e.attendance.interested,
		0
	);
	return { eventCount, estimatedAttendance };
}

export type NewEventInput = Omit<
	Event,
	'id' | 'slug' | 'createdAt' | 'updatedAt' | 'attendance' | 'verification' | 'status'
> & { status?: Event['status'] };

export function slugify(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

function randomSlugSuffix(): string {
	const cleaned = randomId().replace(/[^a-z0-9]/gi, '');
	return (cleaned.slice(-8) || Math.random().toString(36).slice(2, 10)).toLowerCase();
}

export async function createEvent(input: NewEventInput): Promise<Event> {
	const slug = `${slugify(input.title)}-${randomSlugSuffix()}`;
	const { data, error } = await supabase
		.from('events')
		.insert({
			slug,
			title: input.title,
			description: input.description,
			objective: input.objective,
			category: input.category,
			themes: input.themes,
			custom_theme_label: input.customThemeLabel ?? null,
			status: input.status ?? 'pending_review',
			start_at: input.startAt,
			end_at: input.endAt ?? null,
			duration_minutes: input.durationMinutes ?? null,
			meeting_point: input.meetingPoint as unknown as Json,
			route: (input.route as unknown as Json) ?? null,
			organizer_id: input.organizerId,
			created_by_user_id: input.createdByUserId,
			prior_communication: input.priorCommunication,
			rules: input.rules,
			peaceful_declaration: input.peacefulDeclaration,
			cover_image_url: input.coverImageUrl ?? null
		})
		.select('*')
		.single();
	if (error) throw error;
	const [event] = await attachAttendance([data]);
	return event;
}

function patchToRow(patch: Partial<Event>): EventUpdatePayload {
	const row: EventUpdatePayload = {};
	if (patch.title !== undefined) row.title = patch.title;
	if (patch.description !== undefined) row.description = patch.description;
	if (patch.objective !== undefined) row.objective = patch.objective;
	if (patch.category !== undefined) row.category = patch.category;
	if (patch.themes !== undefined) row.themes = patch.themes;
	if (patch.customThemeLabel !== undefined) row.custom_theme_label = patch.customThemeLabel ?? null;
	if (patch.status !== undefined) row.status = patch.status;
	if (patch.statusNote !== undefined) row.status_note = patch.statusNote ?? null;
	if (patch.startAt !== undefined) row.start_at = patch.startAt;
	if (patch.endAt !== undefined) row.end_at = patch.endAt ?? null;
	if (patch.durationMinutes !== undefined) row.duration_minutes = patch.durationMinutes ?? null;
	if (patch.meetingPoint !== undefined) row.meeting_point = patch.meetingPoint as unknown as Json;
	if (patch.route !== undefined) row.route = (patch.route as unknown as Json) ?? null;
	if (patch.rules !== undefined) row.rules = patch.rules;
	if (patch.peacefulDeclaration !== undefined) row.peaceful_declaration = patch.peacefulDeclaration;
	if (patch.coverImageUrl !== undefined) row.cover_image_url = patch.coverImageUrl ?? null;
	if (patch.archived !== undefined) row.archived = patch.archived;
	return row;
}

export async function updateEvent(id: string, patch: Partial<Event>): Promise<Event> {
	const { data, error } = await supabase
		.from('events')
		.update(patchToRow(patch))
		.eq('id', id)
		.select('*')
		.single();
	if (error) throw error;
	const [event] = await attachAttendance([data]);
	return event;
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
 * pertenece. Es una comprobación de UX (falla rápido, mensaje claro): la
 * barrera de seguridad real es la política RLS `events_update_own_or_staff`
 * (`supabase/migrations/0003_events.sql`), que rechaza el UPDATE en
 * Postgres incluso si esta comprobación de cliente no se ejecutara o se
 * saltase por completo.
 */
export class OwnershipError extends Error {}

export function assertOwnership(event: Pick<Event, 'createdByUserId'>, userId: string): void {
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
	const event = await getEvent(id);
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
	const source = await getEvent(id);
	if (!source) throw new Error(`Convocatoria no encontrada: ${id}`);
	assertOwnership(source, userId);

	return createEvent({
		title: `${source.title} (copia)`,
		description: source.description,
		objective: source.objective,
		category: source.category,
		themes: source.themes,
		customThemeLabel: source.customThemeLabel,
		startAt: source.startAt,
		endAt: source.endAt,
		durationMinutes: source.durationMinutes,
		meetingPoint: source.meetingPoint,
		route: source.route,
		organizerId: source.organizerId,
		createdByUserId: source.createdByUserId,
		priorCommunication: source.priorCommunication,
		rules: source.rules,
		peacefulDeclaration: source.peacefulDeclaration,
		coverImageUrl: source.coverImageUrl,
		status: 'draft'
	});
}
