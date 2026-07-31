-- 0004_event_updates.sql
--
-- Qué crea: `public.event_updates`, las actualizaciones que publica un
-- organizador sobre su propia convocatoria (cambios de hora, lugar,
-- cancelación...). Tabla nueva, no borra nada.
--
-- Reglas: visibles para quien pueda ver la convocatoria (público si la
-- convocatoria es pública, propietario y moderación siempre). Solo puede
-- publicarlas el organizador propietario de la convocatoria, y únicamente
-- a su propio nombre (author_organizer_id tiene que ser su organizador).
-- No son editables ni borrables una vez publicadas (igual que hoy en el
-- mock: es un registro de lo que se comunicó, no un documento vivo).

create table public.event_updates (
	id uuid primary key default gen_random_uuid(),
	event_id uuid not null references public.events (id) on delete cascade,
	author_organizer_id uuid not null references public.organizers (id) on delete restrict,
	title text not null,
	body text not null,
	is_critical boolean not null default false,
	created_at timestamptz not null default now()
);

comment on table public.event_updates is
	'Actualizaciones publicadas por el organizador sobre su convocatoria. Inmutables tras su creación.';

alter table public.event_updates enable row level security;

create index event_updates_event_id_idx on public.event_updates (event_id);

create policy "event_updates_select_visible"
	on public.event_updates for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.events e
			where e.id = event_id
			and (
				e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
				or e.created_by_user_id = auth.uid()
				or public.is_moderator_or_admin()
			)
		)
	);

create policy "event_updates_insert_own"
	on public.event_updates for insert
	to authenticated
	with check (
		exists (
			select 1 from public.events e
			join public.organizers o on o.id = e.organizer_id
			where e.id = event_id
			and e.created_by_user_id = auth.uid()
			and o.id = author_organizer_id
			and o.created_by = auth.uid()
		)
	);

-- Sin políticas de UPDATE/DELETE: inmutable una vez publicada, para
-- cualquier rol (incluida moderación).
