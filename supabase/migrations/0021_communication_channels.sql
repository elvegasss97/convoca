-- 0021_communication_channels.sql
--
-- Funcionalidad: canales de coordinación (WhatsApp/Telegram/otro) opcionales
-- por convocatoria. Tabla relacionada (no columnas rígidas en `events`)
-- porque una convocatoria puede tener varios canales.
--
-- Visibilidad pública: un canal solo es visible para `anon`/público cuando
-- el canal no está oculto (`is_hidden = false`) Y la convocatoria está en un
-- estado público (mismo criterio que `events_select_public`: ni
-- draft/pending_review/hidden/rejected). El propio dueño del evento ve
-- siempre sus canales (ocultos o no); moderación/administración también.
--
-- Edición: solo el dueño de la convocatoria puede crear/editar/eliminar sus
-- canales. Moderación solo puede ocultar/restaurar (`is_hidden`) — un
-- trigger se lo impone incluso si alguna vez se ampliara la política de
-- UPDATE, para que "ocultar" nunca pueda usarse para reescribir la URL de
-- otra persona.

create table public.event_communication_channels (
	id uuid primary key default gen_random_uuid(),
	event_id uuid not null references public.events (id) on delete cascade,
	platform text not null check (platform in ('whatsapp', 'telegram', 'other')),
	channel_type text not null check (channel_type in ('group', 'channel', 'community', 'other')),
	label text,
	url text not null check (char_length(url) <= 500),
	is_hidden boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.event_communication_channels is
	'Enlaces opcionales de coordinación (WhatsApp/Telegram/otro) de una convocatoria. Varios por evento.';

alter table public.event_communication_channels enable row level security;

create index event_communication_channels_event_id_idx
	on public.event_communication_channels (event_id);

create trigger event_communication_channels_set_updated_at
	before update on public.event_communication_channels
	for each row
	execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- SELECT
-- ---------------------------------------------------------------------------

-- Dueño del evento o moderación/administración: ven todos los canales del
-- evento, ocultos o no (necesario para poder gestionarlos/moderarlos).
create policy "channels_select_owner_or_staff"
	on public.event_communication_channels for select
	to authenticated
	using (
		public.is_moderator_or_admin()
		or exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = auth.uid()
		)
	);

-- Público (anon o cualquier autenticado que no sea dueño/staff): solo
-- canales no ocultos de convocatorias ya públicas.
create policy "channels_select_public"
	on public.event_communication_channels for select
	to anon, authenticated
	using (
		not is_hidden
		and exists (
			select 1 from public.events e
			where e.id = event_id
			and e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
		)
	);

-- ---------------------------------------------------------------------------
-- INSERT / UPDATE / DELETE
-- ---------------------------------------------------------------------------

create policy "channels_insert_owner"
	on public.event_communication_channels for insert
	to authenticated
	with check (
		exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = auth.uid()
		)
	);

create policy "channels_update_owner_or_staff"
	on public.event_communication_channels for update
	to authenticated
	using (
		public.is_moderator_or_admin()
		or exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = auth.uid()
		)
	)
	with check (
		public.is_moderator_or_admin()
		or exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = auth.uid()
		)
	);

-- Solo el dueño de la convocatoria puede borrar (moderación oculta, no borra).
create policy "channels_delete_owner"
	on public.event_communication_channels for delete
	to authenticated
	using (
		exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = auth.uid()
		)
	);

create or replace function public.enforce_channel_update_rules()
returns trigger
language plpgsql
as $$
declare
	is_owner boolean;
begin
	select exists(
		select 1 from public.events e
		where e.id = new.event_id and e.created_by_user_id = auth.uid()
	) into is_owner;

	if not is_owner and not public.is_moderator_or_admin() then
		raise exception 'No tienes permiso para modificar este canal.';
	end if;

	if not is_owner then
		-- Moderación (no dueño) solo puede tocar is_hidden: nunca reescribir
		-- la URL, la plataforma, el tipo o el nombre visible de otra cuenta.
		if new.url is distinct from old.url
			or new.label is distinct from old.label
			or new.platform is distinct from old.platform
			or new.channel_type is distinct from old.channel_type
			or new.event_id is distinct from old.event_id then
			raise exception 'Moderación solo puede ocultar o restaurar el canal, no editar su contenido.';
		end if;
	end if;

	return new;
end;
$$;

create trigger event_communication_channels_enforce_update_rules
	before update on public.event_communication_channels
	for each row
	execute function public.enforce_channel_update_rules();

-- ---------------------------------------------------------------------------
-- Reportes de canal — separados de `reports` (que son de convocatorias):
-- motivos distintos, y el moderador debe poder ocultar solo el canal, no
-- toda la convocatoria.
-- ---------------------------------------------------------------------------

create table public.channel_reports (
	id uuid primary key default gen_random_uuid(),
	channel_id uuid not null references public.event_communication_channels (id) on delete cascade,
	reported_by_user_id uuid references auth.users (id) on delete set null,
	reason text not null check (
		reason in (
			'enlace_roto', 'spam', 'estafa', 'suplantacion',
			'no_pertenece_organizador', 'contenido_violento_ilegal', 'otro'
		)
	),
	details text,
	status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
	created_at timestamptz not null default now(),
	resolved_at timestamptz
);

comment on table public.channel_reports is
	'Reportes de canales de coordinación. Nunca públicos, ni para quien reporta ni para el organizador.';

alter table public.channel_reports enable row level security;

create index channel_reports_channel_id_idx on public.channel_reports (channel_id);

create policy "channel_reports_select_staff"
	on public.channel_reports for select
	to authenticated
	using (public.is_moderator_or_admin());

create policy "channel_reports_insert_authenticated"
	on public.channel_reports for insert
	to authenticated
	with check (reported_by_user_id = auth.uid() or reported_by_user_id is null);

create policy "channel_reports_update_staff"
	on public.channel_reports for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- audit_logs: añade channel_id (nullable) y las dos acciones nuevas para
-- poder registrar "ocultar/restaurar canal" igual que ya se registra
-- aprobar/ocultar/rechazar una convocatoria — mismo historial de
-- moderación, sin tabla nueva.
-- ---------------------------------------------------------------------------

alter table public.audit_logs
	add column channel_id uuid references public.event_communication_channels (id) on delete set null;

alter table public.audit_logs drop constraint audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check
	check (action in ('approve', 'request_changes', 'hide', 'reject', 'reinstate', 'hide_channel', 'unhide_channel'));
