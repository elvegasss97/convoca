import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { Database } from './database.types';

/**
 * Cliente único de Supabase para toda la app (SPA, `ssr = false`: no hay
 * entorno de servidor que necesite su propio cliente).
 *
 * Solo usa la `publishable key` (equivalente pública al antiguo "anon
 * key"), pensada para vivir en el cliente: por diseño no puede saltarse
 * Row Level Security. La `secret key` (antes "service_role key") NUNCA debe
 * importarse aquí ni en ningún módulo que se incluya en el bundle del
 * navegador.
 */
export const supabase = createClient<Database>(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		}
	}
);
