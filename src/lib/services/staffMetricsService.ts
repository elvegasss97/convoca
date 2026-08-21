import { supabase } from '$lib/supabase/client';

/**
 * Métricas internas del Centro de Operaciones.
 *
 * `public.profiles` contiene exactamente una fila por cuenta de `auth.users`
 * (la crea el trigger `handle_new_user`). Los conteos se hacen como HEAD + count
 * para no descargar IDs ni ningún otro dato personal al cliente.
 *
 * La RLS de `profiles` solo permite ver todas las filas a staff con sesión
 * AAL2; `/moderacion` ya exige ese nivel antes de cargar sus datos.
 */
export interface RegisteredUserStats {
	total: number;
	last24h: number;
	last7d: number;
}

async function countRegisteredUsersSince(since?: string): Promise<number> {
	let query = supabase.from('profiles').select('id', { count: 'exact', head: true });
	if (since) query = query.gte('created_at', since);

	const { count, error } = await query;
	if (error) throw error;
	return count ?? 0;
}

export async function getRegisteredUserCount(): Promise<number> {
	return countRegisteredUsersSince();
}

export async function getRegisteredUserStats(): Promise<RegisteredUserStats> {
	const now = Date.now();
	const [total, last24h, last7d] = await Promise.all([
		countRegisteredUsersSince(),
		countRegisteredUsersSince(new Date(now - 24 * 60 * 60 * 1000).toISOString()),
		countRegisteredUsersSince(new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString())
	]);

	return { total, last24h, last7d };
}
