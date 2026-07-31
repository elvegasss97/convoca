import { browser } from '$app/environment';

/**
 * Respaldo en localStorage para los arrays en memoria de `$lib/services/*`.
 *
 * Esto es exclusivamente para la fase de prototipo sin backend: simula la
 * persistencia que en producción daría Supabase. Cuando se conecte Supabase,
 * este módulo entero deja de usarse y cada servicio pasa a leer/escribir en
 * la base de datos real — ningún componente necesita cambiar.
 *
 * El prefijo de versión permite invalidar datos de sesiones anteriores si el
 * "seed" de datos ficticios cambia de forma incompatible.
 */
const NAMESPACE = 'convoca:mock:v1';

function storageKey(key: string): string {
	return `${NAMESPACE}:${key}`;
}

/** Lee un array persistido, o `seed` si no hay nada guardado o localStorage falla. */
export function loadPersisted<T>(key: string, seed: T[]): T[] {
	if (!browser) return seed;
	try {
		const raw = localStorage.getItem(storageKey(key));
		if (!raw) return seed;
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as T[]) : seed;
	} catch {
		// localStorage no disponible (modo privado) o JSON corrupto: seguimos con el seed.
		return seed;
	}
}

/** Guarda el estado actual del array. Debe llamarse tras cada mutación. */
export function savePersisted<T>(key: string, items: T[]): void {
	if (!browser) return;
	try {
		localStorage.setItem(storageKey(key), JSON.stringify(items));
	} catch {
		// Cuota superada o localStorage bloqueado: la mutación sigue viva en memoria
		// para la sesión actual, simplemente no sobrevivirá a una recarga.
	}
}

const KNOWN_KEYS = [
	'events',
	'event-updates',
	'reports',
	'audit-logs',
	'organizers',
	'auth-accounts',
	'auth-organizer-profiles'
];

/**
 * Borra todos los datos de prueba persistidos (incluidas las cuentas mock y
 * la sesión activa) y vuelve a sembrar las cuentas de demostración en la
 * próxima carga. Usado por el control de reset en desarrollo.
 */
export function resetAllPersisted(): void {
	if (!browser) return;
	for (const key of KNOWN_KEYS) {
		localStorage.removeItem(storageKey(key));
	}
	localStorage.removeItem('convoca:my-attendance');
	localStorage.removeItem(storageKey('auth-session'));
}
