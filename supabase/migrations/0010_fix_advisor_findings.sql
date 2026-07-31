-- 0010_fix_advisor_findings.sql
--
-- Corrige dos hallazgos de los asesores tras 0008/0009:
--
--   1. ERROR "security_definer_view": la vista event_attendance_counts con
--      security_invoker=false se sustituye por una función SECURITY
--      DEFINER equivalente (get_attendance_counts). Una función con
--      EXECUTE concedido explícitamente a anon/authenticated es el patrón
--      esperado por el linter para "exponer un agregado sin exponer filas"
--      (nivel WARN, aceptado — igual que set_attendance), mientras que
--      cualquier vista SECURITY DEFINER se marca siempre como ERROR.
--
--   2. Los `revoke ... from public` de 0008 no bastaron: en este proyecto,
--      Supabase concede EXECUTE a `anon`/`authenticated` de forma directa
--      (no solo heredado de PUBLIC) al crear una función en `public`. Hay
--      que revocarlo explícitamente de esos dos roles para las funciones
--      que de verdad no deben poder llamarse por RPC (los triggers, y
--      is_moderator_or_admin para `anon`, que nunca lo necesita).

drop view if exists public.event_attendance_counts;

create or replace function public.get_attendance_counts(p_event_ids uuid[] default null)
returns table (event_id uuid, going_count bigint, interested_count bigint)
language sql
stable
security definer
set search_path = public
as $$
	select
		ar.event_id,
		count(*) filter (where ar.response = 'going') as going_count,
		count(*) filter (where ar.response = 'interested') as interested_count
	from public.attendance_responses ar
	where p_event_ids is null or ar.event_id = any(p_event_ids)
	group by ar.event_id;
$$;

comment on function public.get_attendance_counts is
	'Contadores agregados de asistencia (ESTIMACIONES, nunca listas de asistentes). Reemplaza a la vista event_attendance_counts (retirada por el hallazgo ERROR security_definer_view).';

revoke execute on function public.get_attendance_counts(uuid[]) from public;
grant execute on function public.get_attendance_counts(uuid[]) to anon, authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_organizer_published_count() from public, anon, authenticated;
revoke execute on function public.purge_old_attendance_responses() from public, anon, authenticated;
revoke execute on function public.is_moderator_or_admin() from public, anon;
