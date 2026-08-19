-- 0054_municipal_radar_and_petitions.sql
--
-- Base del Muro/Radar Municipal y de las recogidas de apoyos ciudadanos.
-- Diseño de producto:
--   * el mapa es público y muestra problemas verificados + peticiones;
--   * un problema detectado por un agente NO se publica automáticamente;
--   * cualquier cuenta autenticada puede abrir una petición municipal;
--   * "apoyar" no se presenta como firma jurídica/ILP: es apoyo ciudadano
--     dentro de CONVOCA;
--   * las filas individuales de apoyos nunca son públicas, solo los totales.
--
-- La autorización real vive aquí (RLS + SECURITY DEFINER), no en la SPA.

-- ---------------------------------------------------------------------------
-- 1. Problemas municipales documentados
-- ---------------------------------------------------------------------------

create table public.municipal_issues (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique check (char_length(slug) between 3 and 180),
	title text not null check (char_length(btrim(title)) between 8 and 160),
	summary text not null check (char_length(btrim(summary)) between 20 and 1600),
	category text not null check (
		category in (
			'limpieza', 'movilidad', 'espacio_publico', 'vivienda', 'accesibilidad',
			'seguridad', 'medioambiente', 'servicios_publicos', 'equipamientos', 'otro'
		)
	),
	municipality_ine_code text references public.ine_municipalities (ine_code) on update cascade,
	municipality_name text not null check (char_length(btrim(municipality_name)) between 1 and 140),
	province_code text not null check (province_code ~ '^[0-9]{2}$'),
	lat double precision not null check (lat between 27 and 44.5),
	lng double precision not null check (lng between -19 and 5),
	status text not null default 'detected' check (status in ('detected', 'verified', 'in_action', 'resolved')),
	competence_label text check (competence_label is null or char_length(btrim(competence_label)) between 2 and 180),
	evidence_level text not null default 'low' check (evidence_level in ('low', 'medium', 'high')),
	origin text not null default 'staff' check (origin in ('agent', 'citizen', 'staff')),
	detected_at timestamptz not null default now(),
	published_at timestamptz,
	resolved_at timestamptz,
	created_by uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint municipal_issues_publication_consistency check (
		(status = 'detected' and published_at is null)
		or (status in ('verified', 'in_action', 'resolved') and published_at is not null)
	),
	constraint municipal_issues_resolution_consistency check (
		(status = 'resolved' and resolved_at is not null)
		or (status <> 'resolved' and resolved_at is null)
	)
);

create trigger municipal_issues_set_updated_at
	before update on public.municipal_issues
	for each row execute function public.set_updated_at();

create index municipal_issues_public_map_idx
	on public.municipal_issues (status, province_code, municipality_ine_code, published_at desc);
create index municipal_issues_detected_idx
	on public.municipal_issues (detected_at desc);

create table public.municipal_issue_sources (
	id uuid primary key default gen_random_uuid(),
	issue_id uuid not null references public.municipal_issues (id) on delete cascade,
	title text not null check (char_length(btrim(title)) between 3 and 260),
	url text not null check (url ~ '^https://'),
	publisher text check (publisher is null or char_length(btrim(publisher)) between 2 and 180),
	kind text not null default 'other' check (kind in ('official', 'media', 'association', 'other')),
	published_at timestamptz,
	created_at timestamptz not null default now(),
	unique (issue_id, url)
);

create index municipal_issue_sources_issue_idx
	on public.municipal_issue_sources (issue_id, created_at);

create table public.municipal_issue_suggestions (
	id uuid primary key default gen_random_uuid(),
	issue_id uuid not null references public.municipal_issues (id) on delete cascade,
	position smallint not null check (position between 1 and 4),
	suggestion_text text not null check (char_length(btrim(suggestion_text)) between 8 and 360),
	author_kind text not null default 'agent' check (author_kind in ('agent', 'staff')),
	created_at timestamptz not null default now(),
	unique (issue_id, position)
);

create index municipal_issue_suggestions_issue_idx
	on public.municipal_issue_suggestions (issue_id, position);

-- ---------------------------------------------------------------------------
-- 2. Peticiones / apoyos ciudadanos
-- ---------------------------------------------------------------------------

create table public.municipal_petitions (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique check (char_length(slug) between 3 and 190),
	issue_id uuid references public.municipal_issues (id) on delete set null,
	created_by uuid not null references auth.users (id) on delete restrict,
	title text not null check (char_length(btrim(title)) between 8 and 160),
	request_text text not null check (char_length(btrim(request_text)) between 20 and 2200),
	target_name text not null check (char_length(btrim(target_name)) between 2 and 200),
	municipality_ine_code text not null references public.ine_municipalities (ine_code) on update cascade,
	municipality_name text not null check (char_length(btrim(municipality_name)) between 1 and 140),
	province_code text not null check (province_code ~ '^[0-9]{2}$'),
	lat double precision not null check (lat between 27 and 44.5),
	lng double precision not null check (lng between -19 and 5),
	status text not null default 'open' check (status in ('open', 'closed', 'resolved', 'hidden')),
	origin text not null default 'citizen' check (origin in ('citizen', 'convoca_pilot')),
	published_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger municipal_petitions_set_updated_at
	before update on public.municipal_petitions
	for each row execute function public.set_updated_at();

create index municipal_petitions_public_map_idx
	on public.municipal_petitions (status, province_code, municipality_ine_code, published_at desc);
create index municipal_petitions_creator_idx
	on public.municipal_petitions (created_by, created_at desc);

create table public.municipal_petition_supports (
	petition_id uuid not null references public.municipal_petitions (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (petition_id, user_id)
);

create index municipal_petition_supports_user_idx
	on public.municipal_petition_supports (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. RLS: problemas detectados son internos; apoyos individuales privados
-- ---------------------------------------------------------------------------

alter table public.municipal_issues enable row level security;
alter table public.municipal_issue_sources enable row level security;
alter table public.municipal_issue_suggestions enable row level security;
alter table public.municipal_petitions enable row level security;
alter table public.municipal_petition_supports enable row level security;

revoke all on public.municipal_issues from public, anon, authenticated;
revoke all on public.municipal_issue_sources from public, anon, authenticated;
revoke all on public.municipal_issue_suggestions from public, anon, authenticated;
revoke all on public.municipal_petitions from public, anon, authenticated;
revoke all on public.municipal_petition_supports from public, anon, authenticated;

grant select (
	id, slug, title, summary, category, municipality_ine_code, municipality_name, province_code,
	lat, lng, status, competence_label, evidence_level, origin, detected_at, published_at, resolved_at,
	created_at, updated_at
) on public.municipal_issues to anon, authenticated;
grant select on public.municipal_issue_sources to anon, authenticated;
grant select on public.municipal_issue_suggestions to anon, authenticated;
grant select (
	id, slug, issue_id, title, request_text, target_name, municipality_ine_code, municipality_name,
	province_code, lat, lng, status, origin, published_at, created_at, updated_at
) on public.municipal_petitions to anon, authenticated;
grant select (petition_id, user_id, created_at) on public.municipal_petition_supports to authenticated;

-- Equipo interno: puede alimentar/revisar el Radar desde el panel futuro.
grant insert, update, delete on public.municipal_issues to authenticated;
grant insert, update, delete on public.municipal_issue_sources to authenticated;
grant insert, update, delete on public.municipal_issue_suggestions to authenticated;

create policy "municipal_issues_select_public_or_staff"
	on public.municipal_issues for select
	to anon, authenticated
	using (status in ('verified', 'in_action', 'resolved') or public.is_moderator_or_admin());

create policy "municipal_issues_write_staff"
	on public.municipal_issues for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

create policy "municipal_issue_sources_select_public_or_staff"
	on public.municipal_issue_sources for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.municipal_issues i
			where i.id = issue_id
			and (i.status in ('verified', 'in_action', 'resolved') or public.is_moderator_or_admin())
		)
	);

create policy "municipal_issue_sources_write_staff"
	on public.municipal_issue_sources for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

create policy "municipal_issue_suggestions_select_public_or_staff"
	on public.municipal_issue_suggestions for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.municipal_issues i
			where i.id = issue_id
			and (i.status in ('verified', 'in_action', 'resolved') or public.is_moderator_or_admin())
		)
	);

create policy "municipal_issue_suggestions_write_staff"
	on public.municipal_issue_suggestions for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

create policy "municipal_petitions_select_public"
	on public.municipal_petitions for select
	to anon, authenticated
	using (status in ('open', 'closed', 'resolved') or public.is_moderator_or_admin());

-- Las peticiones se crean solo por la función segura de abajo. No se concede
-- INSERT directo al cliente, para que created_by, municipio y límites no sean
-- datos que una llamada manual pueda falsear.
create policy "municipal_petition_supports_select_own"
	on public.municipal_petition_supports for select
	to authenticated
	using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Creación segura de petición + rate limit reutilizando la tabla existente
-- ---------------------------------------------------------------------------

alter table public.write_rate_limits drop constraint write_rate_limits_action_check;
alter table public.write_rate_limits add constraint write_rate_limits_action_check
	check (action in ('reports', 'channel_reports', 'concern_proposals', 'open_voice_contributions', 'municipal_petitions'));

create or replace function public.create_municipal_petition(
	p_title text,
	p_request_text text,
	p_target_name text,
	p_municipality_ine_code text,
	p_lat double precision,
	p_lng double precision,
	p_issue_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_municipality public.ine_municipalities%rowtype;
	v_id uuid := gen_random_uuid();
	v_base_slug text;
	v_slug text;
	v_short_count integer;
	v_day_count integer;
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para abrir una recogida.';
	end if;

	if char_length(btrim(coalesce(p_title, ''))) not between 8 and 160 then
		raise exception 'El título debe tener entre 8 y 160 caracteres.';
	end if;
	if char_length(btrim(coalesce(p_request_text, ''))) not between 20 and 2200 then
		raise exception 'La petición debe tener entre 20 y 2200 caracteres.';
	end if;
	if char_length(btrim(coalesce(p_target_name, ''))) not between 2 and 200 then
		raise exception 'Indica a quién va dirigida la petición.';
	end if;
	if p_lat not between 27 and 44.5 or p_lng not between -19 and 5 then
		raise exception 'La ubicación no es válida para un municipio de España.';
	end if;

	select * into v_municipality
	from public.ine_municipalities
	where ine_code = p_municipality_ine_code;
	if not found then
		raise exception 'El municipio seleccionado no existe en el catálogo INE.';
	end if;

	if p_issue_id is not null and not exists (
		select 1 from public.municipal_issues
		where id = p_issue_id and status in ('verified', 'in_action', 'resolved')
	) then
		raise exception 'El problema municipal asociado no está disponible.';
	end if;

	-- Mismo patrón de serialización que el rate limit existente: evita dos
	-- creaciones simultáneas que superen el límite antes de contarse entre sí.
	perform pg_advisory_xact_lock(hashtext(v_user_id::text), hashtext('municipal_petitions'));
	insert into public.write_rate_limits (user_id, action)
	values (v_user_id, 'municipal_petitions');

	select count(*) into v_short_count
	from public.write_rate_limits
	where user_id = v_user_id
	  and action = 'municipal_petitions'
	  and called_at > now() - interval '1 minute';
	if v_short_count > 2 then
		raise exception 'Has abierto demasiadas recogidas seguidas. Inténtalo de nuevo más tarde.';
	end if;

	select count(*) into v_day_count
	from public.write_rate_limits
	where user_id = v_user_id
	  and action = 'municipal_petitions'
	  and called_at > now() - interval '1 day';
	if v_day_count > 10 then
		raise exception 'Has alcanzado el límite diario de nuevas recogidas.';
	end if;

	v_base_slug := trim(both '-' from regexp_replace(lower(btrim(p_title)), '[^a-z0-9]+', '-', 'g'));
	if char_length(v_base_slug) < 3 then
		v_base_slug := 'peticion';
	end if;
	v_slug := left(v_base_slug, 145) || '-' || left(v_id::text, 8);

	insert into public.municipal_petitions (
		id, slug, issue_id, created_by, title, request_text, target_name,
		municipality_ine_code, municipality_name, province_code, lat, lng
	)
	values (
		v_id, v_slug, p_issue_id, v_user_id, btrim(p_title), btrim(p_request_text), btrim(p_target_name),
		v_municipality.ine_code, v_municipality.name, v_municipality.province_code, p_lat, p_lng
	);

	return v_id;
end;
$$;

revoke all on function public.create_municipal_petition(text, text, text, text, double precision, double precision, uuid) from public;
grant execute on function public.create_municipal_petition(text, text, text, text, double precision, double precision, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Apoyar / retirar apoyo + agregados públicos
-- ---------------------------------------------------------------------------

create or replace function public.set_municipal_petition_support(
	p_petition_id uuid,
	p_supported boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para apoyar una petición.';
	end if;

	if not exists (
		select 1 from public.municipal_petitions
		where id = p_petition_id and status = 'open'
	) then
		raise exception 'Esta recogida no está abierta.';
	end if;

	if p_supported then
		insert into public.municipal_petition_supports (petition_id, user_id)
		values (p_petition_id, v_user_id)
		on conflict (petition_id, user_id) do nothing;
	else
		delete from public.municipal_petition_supports
		where petition_id = p_petition_id and user_id = v_user_id;
	end if;

	return p_supported;
end;
$$;

revoke all on function public.set_municipal_petition_support(uuid, boolean) from public;
grant execute on function public.set_municipal_petition_support(uuid, boolean) to authenticated;

create or replace function public.get_municipal_petition_counts(p_petition_ids uuid[])
returns table (petition_id uuid, support_count bigint)
language sql
stable
security definer
set search_path = public
as $$
	select p.id, count(s.user_id)::bigint
	from public.municipal_petitions p
	left join public.municipal_petition_supports s on s.petition_id = p.id
	where p.id = any(p_petition_ids)
	  and p.status in ('open', 'closed', 'resolved')
	group by p.id;
$$;

revoke all on function public.get_municipal_petition_counts(uuid[]) from public;
grant execute on function public.get_municipal_petition_counts(uuid[]) to anon, authenticated;

create or replace function public.get_municipal_radar_summary()
returns table (issue_count bigint, petition_count bigint, support_count bigint, municipality_count bigint)
language sql
stable
security definer
set search_path = public
as $$
	select
		(select count(*) from public.municipal_issues where status in ('verified', 'in_action'))::bigint,
		(select count(*) from public.municipal_petitions where status = 'open')::bigint,
		(select count(*) from public.municipal_petition_supports s
			join public.municipal_petitions p on p.id = s.petition_id
			where p.status in ('open', 'closed', 'resolved'))::bigint,
		(select count(distinct municipality_ine_code) from (
			select municipality_ine_code from public.municipal_issues where status in ('verified', 'in_action')
			union
			select municipality_ine_code from public.municipal_petitions where status = 'open'
		) m where municipality_ine_code is not null)::bigint;
$$;

revoke all on function public.get_municipal_radar_summary() from public;
grant execute on function public.get_municipal_radar_summary() to anon, authenticated;

comment on table public.municipal_petition_supports is
	'Apoyos ciudadanos internos de CONVOCA. No equivalen por sí solos a firmas jurídicas para ILP u otros procedimientos oficiales. Las filas individuales nunca son públicas.';
comment on table public.municipal_issues is
	'Radar/Muro Municipal. status=detected es bandeja interna y no puede verse públicamente por RLS; verificado/en actuación/resuelto sí.';
