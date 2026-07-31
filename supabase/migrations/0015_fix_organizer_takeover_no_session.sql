-- 0015_fix_organizer_takeover_no_session.sql
--
-- Mismo patrón de fallo que 0012, encontrado también en vivo durante la
-- limpieza de datos de prueba de la Fase 14: al borrar una convocatoria
-- directamente por SQL (sin sesión de PostgREST, auth.uid() = null), el
-- trigger AFTER refresh_organizer_published_count (SECURITY DEFINER)
-- intenta actualizar organizers.published_events_count, pero
-- prevent_organizer_takeover() lo bloquea porque is_moderator_or_admin()
-- da `false` sin JWT de por medio — exactamente el mismo problema que
-- prevent_role_self_update ya tenía.
--
-- Corrección idéntica en espíritu a 0012: el guardián de
-- published_events_count solo debe aplicarse cuando SÍ hay una identidad
-- de cliente autenticada. Sin JWT (SQL Editor, MCP, migraciones,
-- mantenimiento administrativo) se confía en el operador — igual que para
-- cualquier otra operación de administración de la base de datos.

create or replace function public.prevent_organizer_takeover()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if new.created_by is distinct from old.created_by then
		raise exception 'No se puede transferir la propiedad de un perfil de organizador.';
	end if;
	if new.published_events_count is distinct from old.published_events_count
		and auth.uid() is not null
		and not public.is_moderator_or_admin() then
		raise exception 'published_events_count es de solo lectura para el propio organizador.';
	end if;
	return new;
end;
$$;
