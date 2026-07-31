import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { browser } from '$app/environment';
import type { Database } from './database.types';

/**
 * Cliente único de Supabase para toda la app (SPA, `ssr = false`: no hay
 * entorno de servidor que necesite su propio cliente).
 *
 * Solo usa la `publishable key` (equivalente pública al antiguo "anon
 * key"), pensada para vivir en el cliente: por diseño no puede saltarse
 * Row Level Security. La `secret key` (antes "service_role key") NUNCA debe
 * importarse aquí ni en ningún módulo que se incluya en el bundle del
 * navegador — solo vive dentro de la Edge Function `delete-account`.
 */

const SESSION_SCOPE_KEY = 'convoca:session-scope';

/**
 * Adaptador de almacenamiento híbrido para soportar "Recordar sesión":
 * Supabase decide en qué storage persiste el token según qué `storage` le
 * pasamos al crear el cliente, y eso es fijo para toda la vida del cliente
 * — no se puede cambiar por llamada a `signInWithPassword`. Este adaptador
 * redirige cada lectura/escritura a `localStorage` (sesión larga) o
 * `sessionStorage` (se cierra al cerrar la pestaña) según una preferencia
 * que `setSessionScope()` fija justo antes de iniciar sesión o registrarse.
 */
const memoryFallback = new Map<string, string>();

function activeStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
	if (!browser) {
		return {
			getItem: (k) => memoryFallback.get(k) ?? null,
			setItem: (k, v) => void memoryFallback.set(k, v),
			removeItem: (k) => void memoryFallback.delete(k)
		};
	}
	const scope = window.localStorage.getItem(SESSION_SCOPE_KEY);
	return scope === 'session' ? window.sessionStorage : window.localStorage;
}

/** Llamar justo antes de signUp/signInWithPassword con el valor de "Recordar sesión". */
export function setSessionScope(remembered: boolean): void {
	if (!browser) return;
	// El propio marcador de preferencia siempre vive en localStorage (no es
	// sensible: no es un token, solo un booleano de preferencia de UI).
	window.localStorage.setItem(SESSION_SCOPE_KEY, remembered ? 'local' : 'session');
}

const hybridStorage = {
	getItem: (key: string) => activeStorage().getItem(key),
	setItem: (key: string, value: string) => activeStorage().setItem(key, value),
	removeItem: (key: string) => activeStorage().removeItem(key)
};

export const supabase = createClient<Database>(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
			// Explícito (no confiar en el valor por defecto de la librería): el
			// login con Google usa el flujo PKCE — `detectSessionInUrl` intercambia
			// automáticamente el `?code=` de la URL por una sesión en cuanto
			// `/auth/callback` carga como página completa (no navegación interna
			// de SvelteKit), sin que este código tenga que llamar a
			// `exchangeCodeForSession` a mano.
			flowType: 'pkce',
			storage: hybridStorage
		}
	}
);
