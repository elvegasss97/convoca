-- 0005_reports_and_audit_logs.sql
--
-- Qué crea (tablas nuevas, no borra nada):
--   1. `public.reports`: reportes de convocatorias. Solo visibles para
--      moderación/administración — nunca públicos, ni siquiera para quien
--      reporta.
--   2. `public.audit_logs`: registro inmutable de decisiones de moderación
--      (aprobar, ocultar, rechazar...). Solo moderación/administración
--      pueden escribir o leer.
--
-- Reportar requiere estar autenticado (evita spam totalmente anónimo);
-- quién reportó no se expone en ninguna vista ni siquiera a moderación por
-- ahora — se guarda por si hace falta limitar abuso más adelante (Fase 6).

create table public.reports (
	id uuid primary key default gen_random_uuid(),
	event_id uuid not null references public.events (id) on delete cascade,
	reported_by_user_id uuid references auth.users (id) on delete set null,
	reason text not null check (
		reason in ('incitacion_violencia', 'informacion_falsa', 'suplantacion', 'contenido_partidista_encubierto', 'spam', 'otro')
	),
	details text,
	status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
	created_at timestamptz not null default now(),
	resolved_at timestamptz
);

comment on table public.reports is 'Reportes de convocatorias. Nunca públicos, ni para quien reporta.';

alter table public.reports enable row level security;

create index reports_event_id_idx on public.reports (event_id);

create policy "reports_select_staff"
	on public.reports for select
	to authenticated
	using (public.is_moderator_or_admin());

create policy "reports_insert_authenticated"
	on public.reports for insert
	to authenticated
	with check (reported_by_user_id = auth.uid() or reported_by_user_id is null);

create policy "reports_update_staff"
	on public.reports for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- audit_logs — registro inmutable de moderación
-- ---------------------------------------------------------------------------

create table public.audit_logs (
	id uuid primary key default gen_random_uuid(),
	event_id uuid not null references public.events (id) on delete cascade,
	action text not null check (action in ('approve', 'request_changes', 'hide', 'reject', 'reinstate')),
	moderator_id uuid not null references auth.users (id) on delete restrict,
	note text,
	created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Registro inmutable de acciones de moderación. Solo moderación/administración.';

alter table public.audit_logs enable row level security;

create index audit_logs_event_id_idx on public.audit_logs (event_id);

create policy "audit_logs_select_staff"
	on public.audit_logs for select
	to authenticated
	using (public.is_moderator_or_admin());

create policy "audit_logs_insert_staff"
	on public.audit_logs for insert
	to authenticated
	with check (public.is_moderator_or_admin() and moderator_id = auth.uid());

-- Sin políticas de UPDATE/DELETE para nadie: un registro de auditoría no se
-- edita ni se borra, ni siquiera por un administrador.
