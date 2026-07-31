-- 0002_organizers.sql
--
-- Qué crea (no borra nada, son tablas nuevas):
--   1. `public.organizers`: perfil PÚBLICO del organizador (nombre, tipo,
--      bio...). Visible para cualquiera, igual que hoy en el mock.
--   2. `public.organizer_private_profiles`: datos PRIVADOS ligados a la
--      cuenta (nombre legal de la organización, aceptación de condiciones).
--      Nunca se expone en una consulta pública.
--
-- Ninguna de las dos tiene política de INSERT para `authenticated`: ambas
-- filas las crea el trigger `handle_new_user` (migración 0007) en el mismo
-- momento en que se confirma el registro, a partir de los metadatos que se
-- pasan a `supabase.auth.signUp(...)`. Esto evita depender de que el
-- navegador haga un segundo `insert` justo después del registro (que
-- fallaría si Supabase exige confirmación de correo antes de dar sesión).

create table public.organizers (
	id uuid primary key default gen_random_uuid(),
	created_by uuid not null references auth.users (id) on delete cascade,
	display_name text not null,
	kind text not null check (kind in ('persona', 'colectivo', 'asociacion', 'sindicato', 'plataforma', 'otro')),
	bio text,
	contact_email text,
	website text,
	avatar_url text,
	published_events_count integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.organizers is
	'Perfil público del organizador. Nunca debe incluir datos privados (ver organizer_private_profiles).';
comment on column public.organizers.created_by is
	'Cuenta propietaria. Determina quién puede editarlo — nunca se expone en las vistas públicas de la app.';

alter table public.organizers enable row level security;

create trigger organizers_set_updated_at
	before update on public.organizers
	for each row
	execute function public.set_updated_at();

-- Lectura pública total: es un perfil público por diseño, igual para
-- visitantes anónimos que para cuentas autenticadas.
create policy "organizers_select_public"
	on public.organizers for select
	to anon, authenticated
	using (true);

-- Solo la propia cuenta puede editar su perfil de organizador. No se
-- permite cambiar `created_by` (impide apropiarse del perfil de otra
-- cuenta) ni `published_events_count` (es un contador de solo lectura,
-- mantenido por trigger en 0003_events.sql — no directamente editable).
create policy "organizers_update_own"
	on public.organizers for update
	to authenticated
	using (created_by = auth.uid())
	with check (created_by = auth.uid());

create or replace function public.prevent_organizer_takeover()
returns trigger
language plpgsql
as $$
begin
	if new.created_by is distinct from old.created_by then
		raise exception 'No se puede transferir la propiedad de un perfil de organizador.';
	end if;
	if new.published_events_count is distinct from old.published_events_count
		and not public.is_moderator_or_admin() then
		raise exception 'published_events_count es de solo lectura para el propio organizador.';
	end if;
	return new;
end;
$$;

create trigger organizers_prevent_takeover
	before update on public.organizers
	for each row
	execute function public.prevent_organizer_takeover();

-- ---------------------------------------------------------------------------
-- Perfil privado del organizador
-- ---------------------------------------------------------------------------

create table public.organizer_private_profiles (
	organizer_id uuid primary key references public.organizers (id) on delete cascade,
	user_id uuid not null unique references auth.users (id) on delete cascade,
	legal_organization_name text,
	accepted_terms_at timestamptz,
	accepted_peaceful_use_at timestamptz,
	created_at timestamptz not null default now()
);

comment on table public.organizer_private_profiles is
	'Datos privados de la cuenta de un organizador. Solo visibles para el propio usuario y para moderación/administración — nunca públicos.';

alter table public.organizer_private_profiles enable row level security;

create policy "organizer_private_profiles_select_own_or_staff"
	on public.organizer_private_profiles for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- Solo la propia cuenta puede editar sus datos privados, y no puede
-- reasignarlos a otra cuenta ni a otro organizador.
create policy "organizer_private_profiles_update_own"
	on public.organizer_private_profiles for update
	to authenticated
	using (user_id = auth.uid())
	with check (user_id = auth.uid());

create or replace function public.prevent_private_profile_reassignment()
returns trigger
language plpgsql
as $$
begin
	if new.user_id is distinct from old.user_id or new.organizer_id is distinct from old.organizer_id then
		raise exception 'No se puede reasignar un perfil privado de organizador.';
	end if;
	return new;
end;
$$;

create trigger organizer_private_profiles_prevent_reassignment
	before update on public.organizer_private_profiles
	for each row
	execute function public.prevent_private_profile_reassignment();
