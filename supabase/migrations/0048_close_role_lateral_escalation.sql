-- 0048_close_role_lateral_escalation.sql
--
-- Cierra un hallazgo de seguridad ya documentado pero no resuelto (ver
-- seguridad/19_security_baseline_v1_diseno.md §2 y §17, y el comentario
-- "why" de "profiles_prevent_role_self_update" en
-- security-baseline/manifests/critical-triggers.json antes de este
-- archivo): el trigger `prevent_role_self_update` (0001, corregido en
-- 0012) solo bloquea un cambio de rol cuando quien actúa NO es ya
-- moderador/admin. Un `moderator` autenticado podía ejecutar
-- `update profiles set role = 'admin' where id = auth.uid()` y la
-- política `profiles_update_own` (0001, `using(id = auth.uid())`) lo
-- permitía sin que el trigger lo bloqueara — porque
-- `is_moderator_or_admin()` ya era `true` para esa cuenta.
--
-- Decisión de producto (fundador, no revisable por esta migración):
-- ningún usuario — organizer, moderator NI admin — puede cambiar su
-- propio rol (ni el de nadie) mediante la API, en ninguna dirección. La
-- asignación de roles sigue siendo exclusivamente manual, vía SQL
-- Editor/MCP con `postgres`, exactamente igual que documenta la cabecera
-- de 0001. Esta migración NO añade ningún camino nuevo para ascender a
-- alguien (no es su objetivo) — solo cierra el existente por API.
--
-- Cambio: se quita la condición `and not public.is_moderator_or_admin()`
-- del trigger. La única condición que queda para bloquear es que exista
-- una identidad de cliente autenticada (`auth.uid() is not null`) — igual
-- que en 0012, para no volver a bloquear al operador humano que ejecuta
-- SQL directo sin JWT de por medio (SQL Editor/MCP), que es el único
-- camino de ascenso soportado hoy.
--
-- Nota para quien revise el PR: esta función está en el manifest de
-- triggers críticos (security-baseline/manifests/critical-triggers.json)
-- — el commit que incluya esta migración debe llevar el trailer
-- "Security-Baseline-Override: critical-trigger:prevent_role_self_update".

create or replace function public.prevent_role_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if new.role is distinct from old.role and auth.uid() is not null then
		raise exception 'El rol de una cuenta no se puede cambiar mediante la API. Contacta con administración.';
	end if;
	return new;
end;
$$;

comment on function public.prevent_role_self_update is
	'Bloquea CUALQUIER cambio de public.profiles.role realizado por una identidad de cliente autenticada (auth.uid() no nulo), sin excepción de rol actual — incluye la escalación lateral moderator->admin, cerrada en 0048 (antes solo se bloqueaba a cuentas sin privilegios de staff). Sin JWT de por medio (SQL Editor/MCP con postgres) no se bloquea: es el único camino soportado de ascenso, ver cabecera de 0001_extensions_and_helpers.sql.';
