-- 0008_security_hardening.sql
--
-- Corrige los hallazgos WARN de los asesores de seguridad de Supabase tras
-- aplicar 0001-0007:
--   1. search_path mutable en 5 funciones trigger: se fija explícitamente a
--      `public` para que no puedan verse afectadas por un search_path
--      manipulado en la sesión que dispara el trigger.
--   2. Tres funciones SECURITY DEFINER quedaban invocables directamente vía
--      PostgREST (`/rest/v1/rpc/...`) porque Postgres concede EXECUTE a
--      PUBLIC por defecto al crear una función:
--        - handle_new_user() y refresh_organizer_published_count() son
--          funciones `returns trigger`: Postgres ya impide invocarlas fuera
--          de un trigger, pero se revoca EXECUTE de todas formas (no las
--          necesita nadie directamente).
--        - is_moderator_or_admin() SÍ se invoca legítimamente desde
--          políticas RLS evaluadas como `authenticated` (se le mantiene el
--          permiso), pero no la necesita ningún visitante anónimo.

alter function public.set_updated_at() set search_path = public;
alter function public.prevent_role_self_update() set search_path = public;
alter function public.prevent_organizer_takeover() set search_path = public;
alter function public.prevent_private_profile_reassignment() set search_path = public;
alter function public.enforce_event_update_rules() set search_path = public;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.refresh_organizer_published_count() from public;

revoke execute on function public.is_moderator_or_admin() from public;
grant execute on function public.is_moderator_or_admin() to authenticated;
