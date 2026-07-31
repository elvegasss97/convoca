-- 0012_fix_admin_role_promotion.sql
--
-- Corrige un fallo real encontrado durante las pruebas en vivo de la Fase 14:
-- el trigger prevent_role_self_update (0001_extensions_and_helpers.sql)
-- bloqueaba CUALQUIER cambio de rol, incluso ejecutado directamente por el
-- rol `postgres` desde el SQL Editor o vía MCP — que es precisamente el
-- único camino documentado para ascender a alguien a moderador/admin.
--
-- Causa: el trigger se basa en is_moderator_or_admin(), que a su vez lee
-- auth.uid(). Fuera de una petición autenticada de PostgREST (p.ej. una
-- sesión SQL directa), auth.uid() es NULL, así que is_moderator_or_admin()
-- daba `false` y el trigger bloqueaba también al propio administrador.
--
-- Corrección: el trigger solo debe bloquear cuando SÍ hay una identidad de
-- cliente autenticada (auth.uid() no es null) y esa identidad no es
-- moderador/admin. Sin JWT de por medio (SQL Editor, MCP, Edge Functions
-- con service_role) se confía en el operador, exactamente igual que ya se
-- confía en él para todas las demás operaciones de administración de la
-- base de datos.

create or replace function public.prevent_role_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if new.role is distinct from old.role
		and auth.uid() is not null
		and not public.is_moderator_or_admin() then
		raise exception 'No tienes permiso para cambiar el rol de esta cuenta.';
	end if;
	return new;
end;
$$;
