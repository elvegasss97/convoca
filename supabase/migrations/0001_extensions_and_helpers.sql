-- 0001_extensions_and_helpers.sql
--
-- Qué crea (nada destructivo, no toca datos porque no hay tablas de la app
-- todavía):
--   1. La extensión `pgcrypto`, para poder usar `gen_random_uuid()` como
--      valor por defecto de las claves primarias.
--   2. `set_updated_at()`: función de trigger reutilizable que mantiene la
--      columna `updated_at` de cualquier tabla al día en cada UPDATE.
--   3. `public.profiles`: una fila por usuario de `auth.users`, con su rol
--      (`organizer` | `moderator` | `admin`). Es la ÚNICA fuente de verdad
--      del rol — nunca se guarda el rol en una tabla que el propio usuario
--      pueda escribir libremente.
--   4. `public.is_moderator_or_admin()`: función auxiliar que comprueba el
--      rol del usuario autenticado, usada por las políticas RLS de esta y
--      las siguientes migraciones.
--   5. Trigger `prevent_role_self_update`: impide que una cuenta cambie su
--      propio rol, incluso llamando directamente a la API de Supabase sin
--      pasar por la interfaz (requisito explícito de la Fase 4: "un
--      organizador no puede autoasignarse roles").
--
-- Cómo se asciende a alguien a moderador/admin: hoy en día, solo a mano,
-- ejecutando como administrador del proyecto (en el SQL Editor del panel de
-- Supabase, que corre como `postgres` y no está sujeto a RLS):
--   update public.profiles set role = 'moderator' where id = '<uuid-del-usuario>';
-- No hay todavía un panel de administración para hacer esto desde la app
-- (queda fuera del alcance de esta fase; ver limitaciones pendientes).
--
-- Nota importante sobre `is_moderator_or_admin()`: está definida como
-- `security definer` a propósito, y no solo por rendimiento. Si las
-- políticas RLS de `profiles` hicieran una subconsulta directa contra la
-- propia tabla `profiles` (`select 1 from public.profiles where ...`),
-- Postgres la evaluaría también bajo RLS y terminaría en un error de
-- "infinite recursion detected in policy for relation profiles". Una
-- función `security definer` corre con los privilegios de quien la creó
-- (aquí, el rol que ejecuta esta migración), que por defecto no está
-- sujeto a RLS sobre esa tabla — así se rompe el ciclo.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at genérico
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rol del usuario: public.profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	role text not null default 'organizer' check (role in ('organizer', 'moderator', 'admin')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.profiles is
	'Rol de cada cuenta. Se crea automáticamente al registrarse (ver 0007_new_user_trigger.sql). El rol nunca lo puede cambiar el propio usuario (ver el trigger prevent_role_self_update más abajo) — solo un administrador del proyecto vía SQL Editor.';

alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
	before update on public.profiles
	for each row
	execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Función auxiliar — definida ANTES de las políticas de `profiles` que la
-- usan, precisamente para no tener que caer en la subconsulta recursiva
-- descrita arriba.
-- ---------------------------------------------------------------------------

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		(select role in ('moderator', 'admin') from public.profiles where id = auth.uid()),
		false
	);
$$;

-- Cualquier usuario autenticado puede leer su propio rol (lo necesita el
-- cliente para saber qué mostrar). Un moderador/admin puede leer cualquier
-- fila (útil para un futuro panel de administración).
create policy "profiles_select_own_or_staff"
	on public.profiles for select
	to authenticated
	using (
		id = auth.uid()
		or public.is_moderator_or_admin()
	);

-- No hay política de INSERT ni de DELETE para `authenticated`: solo el
-- trigger `handle_new_user` (SECURITY DEFINER, migración 0007) puede crear
-- filas. Sin política = denegado por defecto bajo RLS.

-- Los usuarios SÍ pueden hacer UPDATE de su propia fila (por ejemplo, en el
-- futuro, preferencias de cuenta), pero el trigger de abajo revierte
-- cualquier intento de cambiar `role` que no venga de un moderador/admin.
create policy "profiles_update_own"
	on public.profiles for update
	to authenticated
	using (id = auth.uid())
	with check (id = auth.uid());

create or replace function public.prevent_role_self_update()
returns trigger
language plpgsql
as $$
begin
	if new.role is distinct from old.role and not public.is_moderator_or_admin() then
		raise exception 'No tienes permiso para cambiar el rol de esta cuenta.';
	end if;
	return new;
end;
$$;

create trigger profiles_prevent_role_self_update
	before update on public.profiles
	for each row
	execute function public.prevent_role_self_update();
