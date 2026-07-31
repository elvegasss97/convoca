-- 0003_events.sql
--
-- Qué crea (tabla nueva, no borra nada):
--   `public.events`, con las columnas de `Event` en `src/lib/types.ts`
--   EXCEPTO `attendance` (going/interested/isEstimate): esos números se
--   calculan a partir de `public.attendance_responses` (Fase 5, migración
--   posterior) mediante una vista, en vez de guardarse como columnas
--   editables — así nadie (ni el propio organizador) puede inflar sus
--   cifras de asistencia con un simple UPDATE, y siempre son, por
--   construcción, una cuenta real de respuestas, nunca un número inventado.
--
-- Reglas de la Fase 4 implementadas aquí:
--   - Cualquiera puede leer convocatorias en estado público (todo excepto
--     draft/pending_review/hidden/rejected).
--   - Un organizador puede leer sus propios borradores/pendientes.
--   - Un organizador solo puede crear convocatorias con su propio
--     organizer_id/created_by_user_id.
--   - Un organizador solo puede editar/cancelar sus propias convocatorias.
--   - Un organizador NO puede cambiar el estado de moderación directamente
--     (con dos únicas excepciones autogestionadas: enviar un borrador a
--     revisión, y cancelar su propia convocatoria) — todo lo demás
--     (aprobar, ocultar, rechazar, reinstaurar) es exclusivo de
--     moderador/admin.
--   - Nadie puede reasignar organizer_id/created_by_user_id a otra cuenta.
--   - Moderador/admin pueden leer y moderar cualquier convocatoria.

create table public.events (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	title text not null,
	description text not null,
	objective text not null,
	category text not null check (
		category in ('concentracion', 'manifestacion', 'marcha', 'accion_solidaria', 'asamblea', 'jornada_reivindicativa', 'otro')
	),
	themes text[] not null default '{}',
	custom_theme_label text,
	status text not null default 'draft' check (
		status in (
			'draft', 'pending_review', 'published', 'identity_verified', 'organization_verified',
			'documentation_reviewed', 'modified', 'cancelled', 'completed', 'hidden', 'rejected'
		)
	),
	status_note text,

	start_at timestamptz not null,
	end_at timestamptz,
	duration_minutes integer,

	meeting_point jsonb not null,
	route jsonb,

	organizer_id uuid not null references public.organizers (id) on delete restrict,
	created_by_user_id uuid not null references auth.users (id) on delete restrict,

	verification jsonb not null default '{"level": "none"}'::jsonb,
	prior_communication text not null check (
		prior_communication in ('not_required', 'planned', 'submitted', 'acknowledged', 'unknown')
	),

	rules text[] not null default '{}',
	peaceful_declaration boolean not null,

	cover_image_url text,
	archived boolean not null default false,

	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.events is
	'Convocatorias. attendance.going/interested NO son columnas aquí: se calculan desde attendance_responses (ver migración de Fase 5) para que nunca sean un número que alguien pueda simplemente escribir.';

alter table public.events enable row level security;

create trigger events_set_updated_at
	before update on public.events
	for each row
	execute function public.set_updated_at();

create index events_organizer_id_idx on public.events (organizer_id);
create index events_created_by_user_id_idx on public.events (created_by_user_id);
create index events_status_idx on public.events (status);

-- ---------------------------------------------------------------------------
-- SELECT
-- ---------------------------------------------------------------------------

create policy "events_select_public"
	on public.events for select
	to anon, authenticated
	using (
		status not in ('draft', 'pending_review', 'hidden', 'rejected')
	);

create policy "events_select_own_or_staff"
	on public.events for select
	to authenticated
	using (
		created_by_user_id = auth.uid()
		or public.is_moderator_or_admin()
	);

-- ---------------------------------------------------------------------------
-- INSERT — solo con tu propia identidad y tu propio perfil de organizador
-- ---------------------------------------------------------------------------

create policy "events_insert_own"
	on public.events for insert
	to authenticated
	with check (
		created_by_user_id = auth.uid()
		and exists (
			select 1 from public.organizers o
			where o.id = organizer_id and o.created_by = auth.uid()
		)
	);

-- ---------------------------------------------------------------------------
-- UPDATE — propietario o moderación; el trigger de abajo decide qué campos
-- puede tocar cada uno.
-- ---------------------------------------------------------------------------

create policy "events_update_own_or_staff"
	on public.events for update
	to authenticated
	using (
		created_by_user_id = auth.uid()
		or public.is_moderator_or_admin()
	)
	with check (
		created_by_user_id = auth.uid()
		or public.is_moderator_or_admin()
	);

create or replace function public.enforce_event_update_rules()
returns trigger
language plpgsql
as $$
declare
	is_staff boolean := public.is_moderator_or_admin();
begin
	-- Nadie (ni moderación) puede transferir la convocatoria a otra cuenta
	-- u otro perfil de organizador.
	if new.organizer_id is distinct from old.organizer_id
		or new.created_by_user_id is distinct from old.created_by_user_id then
		raise exception 'No se puede reasignar una convocatoria a otro organizador o cuenta.';
	end if;

	if not is_staff then
		-- Un organizador no puede tocar el nivel de verificación: eso es
		-- exclusivo de moderación/verificación de identidad.
		if new.verification is distinct from old.verification then
			raise exception 'Solo moderación puede cambiar el nivel de verificación.';
		end if;

		-- Un organizador no puede cambiar el estado libremente. Únicas
		-- transiciones autogestionadas: enviar un borrador a revisión, o
		-- cancelar su propia convocatoria.
		if new.status is distinct from old.status then
			if not (
				(old.status = 'draft' and new.status = 'pending_review')
				or new.status = 'cancelled'
			) then
				raise exception 'No tienes permiso para cambiar el estado de moderación de esta convocatoria.';
			end if;
		end if;
	end if;

	return new;
end;
$$;

create trigger events_enforce_update_rules
	before update on public.events
	for each row
	execute function public.enforce_event_update_rules();

-- No hay política de DELETE: cancelar es un cambio de estado, no un borrado
-- de fila. Sin política = denegado por defecto.

-- ---------------------------------------------------------------------------
-- Mantener organizers.published_events_count — nunca editable directamente
-- (ver el trigger organizers_prevent_takeover en 0002_organizers.sql), solo
-- recalculado aquí cada vez que cambia el estado de una convocatoria.
-- security definer porque el organizador no tiene permiso de UPDATE sobre
-- published_events_count por sí mismo (ver 0002), así que este trigger
-- necesita privilegios elevados para escribirlo en su nombre.
-- ---------------------------------------------------------------------------

create or replace function public.refresh_organizer_published_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	affected_organizer_id uuid := coalesce(new.organizer_id, old.organizer_id);
begin
	update public.organizers
	set published_events_count = (
		select count(*) from public.events e
		where e.organizer_id = affected_organizer_id
		and e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
	)
	where id = affected_organizer_id;
	return null;
end;
$$;

create trigger events_refresh_organizer_published_count
	after insert or update of status or delete on public.events
	for each row
	execute function public.refresh_organizer_published_count();
