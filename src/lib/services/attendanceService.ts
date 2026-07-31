/**
 * Simula la confirmación de asistencia de forma anónima.
 *
 * La elección del usuario ("voy" / "me interesa") se guarda solo en el
 * navegador (localStorage), nunca ligada a una identidad ni a una cuenta.
 * En la versión con Supabase esto pasará a ser una fila en una tabla
 * `attendance_responses` ligada a un `user_id` anónimo de sesión — pero
 * seguirá sin exponerse públicamente en ningún listado, respetando el
 * principio de que los asistentes nunca aparecen en público.
 */
import { browser } from '$app/environment';
import type { AttendanceCounts, AttendanceKind } from '$lib/types';
import { getEvent, updateEvent } from './eventsService';

const STORAGE_KEY = 'convoca:my-attendance';

function readLocalAttendance(): Record<string, AttendanceKind> {
	if (!browser) return {};
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
	} catch {
		return {};
	}
}

function writeLocalAttendance(map: Record<string, AttendanceKind>): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function getMyAttendance(eventId: string): Promise<AttendanceKind | null> {
	return Promise.resolve(readLocalAttendance()[eventId] ?? null);
}

export async function setMyAttendance(
	eventId: string,
	kind: AttendanceKind | null
): Promise<AttendanceCounts> {
	const event = await getEvent(eventId);
	if (!event) throw new Error(`Convocatoria no encontrada: ${eventId}`);

	const map = readLocalAttendance();
	const previous = map[eventId] ?? null;
	if (previous === kind) return event.attendance;

	const counts: AttendanceCounts = { ...event.attendance };
	if (previous) counts[previous] = Math.max(0, counts[previous] - 1);
	if (kind) counts[kind] = counts[kind] + 1;

	if (kind) map[eventId] = kind;
	else delete map[eventId];
	writeLocalAttendance(map);

	const updated = await updateEvent(eventId, { attendance: counts });
	return updated.attendance;
}
