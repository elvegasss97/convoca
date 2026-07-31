/**
 * Confirmación de asistencia anónima ("voy" / "me interesa").
 *
 * Ligada a un `dedup_token` (un UUID por navegador, guardado en
 * localStorage), nunca a una cuenta ni a una identidad — ver
 * `supabase/migrations/0009_attendance_responses.sql`. Toda la lógica de
 * negocio (validación, límite de frecuencia) vive en la función de
 * Postgres `set_attendance()`; este archivo solo gestiona el token local y
 * traduce la respuesta.
 */
import { browser } from '$app/environment';
import type { AttendanceCounts, AttendanceKind } from '$lib/types';
import { randomId } from '$lib/utils/id';
import { supabase } from '$lib/supabase/client';
import { getEvent } from './eventsService';

const DEVICE_TOKEN_KEY = 'convoca:attendance-device-token';
const MY_ATTENDANCE_KEY = 'convoca:my-attendance';

function getDeviceToken(): string {
	if (!browser) return randomId();
	let token = localStorage.getItem(DEVICE_TOKEN_KEY);
	if (!token) {
		// `randomId()` ya intenta `crypto.randomUUID()` y cae a un alternativo
		// si no existe o falla — necesario en contextos no seguros (p. ej.
		// abrir la app desde el móvil por la IP local en vez de `localhost`),
		// donde `crypto.randomUUID` puede existir como propiedad pero lanzar
		// una excepción al llamarlo. Llamarlo aquí directamente sin ese
		// try/catch reintroduciría ese bug ya corregido una vez.
		token = randomId();
		localStorage.setItem(DEVICE_TOKEN_KEY, token);
	}
	return token;
}

function readLocalChoice(eventId: string): AttendanceKind | null {
	if (!browser) return null;
	try {
		const map = JSON.parse(localStorage.getItem(MY_ATTENDANCE_KEY) ?? '{}');
		return map[eventId] ?? null;
	} catch {
		return null;
	}
}

function writeLocalChoice(eventId: string, kind: AttendanceKind | null): void {
	if (!browser) return;
	try {
		const map = JSON.parse(localStorage.getItem(MY_ATTENDANCE_KEY) ?? '{}');
		if (kind) map[eventId] = kind;
		else delete map[eventId];
		localStorage.setItem(MY_ATTENDANCE_KEY, JSON.stringify(map));
	} catch {
		// localStorage no disponible: el estado local de UI no persiste entre recargas, pero la escritura remota ya se hizo.
	}
}

/**
 * El estado guardado localmente es solo una comodidad de UI (qué botón
 * mostrar activo): la única fuente de verdad de los contadores es el
 * servidor (`get_attendance_counts`), nunca este valor local.
 */
export async function getMyAttendance(eventId: string): Promise<AttendanceKind | null> {
	return readLocalChoice(eventId);
}

export async function setMyAttendance(
	eventId: string,
	kind: AttendanceKind | null
): Promise<AttendanceCounts> {
	const dedupToken = getDeviceToken();
	const { error } = await supabase.rpc('set_attendance', {
		p_event_id: eventId,
		p_dedup_token: dedupToken,
		p_response: kind ?? undefined
	});
	if (error) throw error;

	writeLocalChoice(eventId, kind);

	const event = await getEvent(eventId);
	return event?.attendance ?? { going: 0, interested: 0, isEstimate: true };
}
