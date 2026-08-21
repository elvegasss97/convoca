import { supabase } from '$lib/supabase/client';

/**
 * Métricas internas del Centro de Operaciones.
 *
 * `public.profiles` contiene exactamente una fila por cuenta de `auth.users`
 * (la crea el trigger `handle_new_user`). El conteo se hace como HEAD + count
 * para no descargar IDs ni ningún otro dato personal al cliente.
 *
 * La RLS de `profiles` solo permite ver todas las filas a staff con sesión
 * AAL2; `/moderacion` ya exige ese nivel antes de cargar sus datos.
 */
export async function getRegisteredUserCount(): Promise<number> {
	const { count, error } = await supabase
		.from('profiles')
		.select('id', { count: 'exact', head: true });

	if (error) throw error;
	return count ?? 0;
}
