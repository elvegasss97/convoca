-- 0056_municipal_integrity_privacy_hardening.sql
--
-- Endurecimiento de Muro Municipal + Firmas antes de cargar contenido real.
-- No reescribe 0054/0055: corrige sobre el historial ya aplicado.
--
-- Objetivos:
--   1. La posición del municipio deja de confiar en lat/lng enviados por el navegador.
--   2. Una petición vinculada a un problema debe pertenecer al MISMO municipio.
--   3. created_by se anonimiza con ON DELETE SET NULL al borrar la cuenta.
--   4. Cada apoyo almacena consentimiento específico y puede retirarse incluso si la petición se cierra.
--   5. Se añade reporte reactivo de peticiones y moderación auditada.
--   6. Las RPC privilegiadas usan search_path con pg_catalog primero y grants mínimos explícitos.

-- ---------------------------------------------------------------------------
-- 1. Ubicación municipal canónica cacheada
-- ---------------------------------------------------------------------------

create table public.municipal_map_points (
	municipality_ine_code text primary key references public.ine_municipalities (ine_code) on update cascade on delete restrict,
	lat double precision not null check (lat between 27 and 44.5),
	lng double precision not null check (lng between -19 and 5),
	source_provider text not null default 'cartociudad_cnig' check (source_provider = 'cartociudad_cnig'),
	source_entity_id text,
	source_checked_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger municipal_map_points_set_updated_at
	before update on public.municipal_map_points
	for each row execute function public.set_updated_at();

alter table public.municipal_map_points enable row level security;
revoke all on public.municipal_map_points from public, anon, authenticated;
grant select, insert, update on public.municipal_map_points to service_role;
grant select (municipality_ine_code, lat, lng, source_provider, source_checked_at)
	on public.municipal_map_points to authenticated;

create policy "municipal_map_points_staff_read"
	on public.municipal_map_points for select
	to authenticated
	using (public.is_moderator_or_admin());

comment on table public.municipal_map_points is
	'Caché interna de puntos municipales resueltos por la Edge Function desde CartoCiudad/CNIG. Sin escritura desde navegador.';

create or replace function public.normalize_public_municipal_issue_location()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
	v_municipality public.ine_municipalities%rowtype;
	v_lat double precision;
	v_lng double precision;
begin
	if new.status in ('verified', 'in_action', 'resolved') then
		if new.municipality_ine_code is null then
			raise exception 'Un problema municipal público necesita código INE.';
		end if;

		select * into v_municipality
		from public.ine_municipalities
		where ine_code = new.municipality_ine_code;
		if not found then
			raise exception 'El municipio del problema no existe en el catálogo INE.';
		end if;

		select lat, lng into v_lat, v_lng
		from public.municipal_map_points
		where municipality_ine_code = new.municipality_ine_code;
		if not found then
			raise exception 'Verifica primero la ubicación canónica del municipio antes de publicar el problema.';
		end if;

		new.municipality_name := v_municipality.name;
		new.province_code := v_municipality.province_code;
		new.lat := v_lat;
		new.lng := v_lng;
	end if;
	return new;
end;
$$;

create trigger municipal_issues_public_location_guard
	before insert or update of status, municipality_ine_code, municipality_name, province_code, lat, lng
	on public.municipal_issues
	for each row execute function public.normalize_public_municipal_issue_location();

alter table public.write_rate_limits drop constraint write_rate_limits_action_check;
alter table public.write_rate_limits add constraint write_rate_limits_action_check
	check (action in (
		'reports', 'channel_reports', 'concern_proposals', 'open_voice_contributions',
		'municipal_petitions', 'municipal_map_resolutions', 'municipal_petition_reports'
	));

-- ---------------------------------------------------------------------------
-- 2. Supresión de cuenta sin borrar la iniciativa pública
-- ---------------------------------------------------------------------------

alter table public.municipal_petitions
	drop constraint if exists municipal_petitions_created_by_fkey;
alter table public.municipal_petitions
	alter column created_by drop not null;
alter table public.municipal_petitions
	add constraint municipal_petitions_created_by_fkey
	foreign key (created_by) references auth.users (id) on delete set null;

comment on column public.municipal_petitions.created_by is
	'Cuenta que abrió la recogida. No se expone públicamente y se anonimiza con SET NULL al eliminar la cuenta.';

-- ---------------------------------------------------------------------------
-- 3. Creación server-side con geografía canónica
-- ---------------------------------------------------------------------------

revoke all on function public.create_municipal_petition(text, text, text, text, double precision, double precision, uuid) from public, anon, authenticated;
drop function public.create_municipal_petition(text, text, text, text, double precision, double precision, uuid);

create or replace function public.create_municipal_petition_server(
	p_user_id uuid,
	p_title text,
	p_request_text text,
	p_target_name text,
	p_municipality_ine_code text,
	p_issue_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
	v_municipality public.ine_municipalities%rowtype;
	v_point public.municipal_map_points%rowtype;
	v_id uuid := gen_random_uuid();
	v_base_slug text;
	v_slug text;
	v_short_count integer;
	v_day_count integer;
begin
	-- Solo puede invocarla service_role. p_user_id procede de un JWT validado por la Edge Function.
	if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
		raise exception 'La cuenta autenticada no es válida.';
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

	select * into v_municipality
	from public.ine_municipalities
	where ine_code = p_municipality_ine_code;
	if not found then
		raise exception 'El municipio seleccionado no existe en el catálogo INE.';
	end if;

	if not exists (
		select 1
		from public.organizer_private_profiles opp
		where opp.user_id = p_user_id
		  and opp.accepted_terms_at is not null
		  and opp.accepted_privacy_at is not null
		  and opp.accepted_peaceful_use_at is not null
		  and opp.accepted_terms_version = '2026-08-20'
		  and opp.accepted_privacy_version = '2026-08-20'
		  and opp.accepted_peaceful_use_version = '2026-08-01'
	) then
		raise exception 'Debes aceptar las condiciones y la política de privacidad vigentes.';
	end if;

	select * into v_point
	from public.municipal_map_points
	where municipality_ine_code = p_municipality_ine_code;
	if not found then
		raise exception 'La ubicación municipal todavía no ha sido verificada.';
	end if;

	if p_issue_id is not null and not exists (
		select 1
		from public.municipal_issues
		where id = p_issue_id
		  and status in ('verified', 'in_action', 'resolved')
		  and municipality_ine_code = p_municipality_ine_code
	) then
		raise exception 'El problema asociado no está disponible o pertenece a otro municipio.';
	end if;

	perform pg_advisory_xact_lock(hashtext(p_user_id::text), hashtext('municipal_petitions'));
	insert into public.write_rate_limits (user_id, action)
	values (p_user_id, 'municipal_petitions');

	select count(*) into v_short_count
	from public.write_rate_limits
	where user_id = p_user_id
	  and action = 'municipal_petitions'
	  and called_at > now() - interval '1 minute';
	if v_short_count > 2 then
		raise exception 'Has abierto demasiadas recogidas seguidas. Inténtalo de nuevo más tarde.';
	end if;

	select count(*) into v_day_count
	from public.write_rate_limits
	where user_id = p_user_id
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
		v_id, v_slug, p_issue_id, p_user_id, btrim(p_title), btrim(p_request_text), btrim(p_target_name),
		v_municipality.ine_code, v_municipality.name, v_municipality.province_code, v_point.lat, v_point.lng
	);

	return v_id;
end;
$$;

revoke all on function public.create_municipal_petition_server(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_municipal_petition_server(uuid, text, text, text, text, uuid) to service_role;

comment on function public.create_municipal_petition_server(uuid, text, text, text, text, uuid) is
	'RPC interna service_role-only. Lat/lng salen exclusivamente de municipal_map_points.';

create or replace function public.guard_municipal_map_resolution_server(
	p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
	v_short_count integer;
	v_day_count integer;
begin
	if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
		raise exception 'La cuenta autenticada no es válida.';
	end if;

	if not exists (
		select 1
		from public.organizer_private_profiles opp
		where opp.user_id = p_user_id
		  and opp.accepted_terms_at is not null
		  and opp.accepted_privacy_at is not null
		  and opp.accepted_peaceful_use_at is not null
		  and opp.accepted_terms_version = '2026-08-20'
		  and opp.accepted_privacy_version = '2026-08-20'
		  and opp.accepted_peaceful_use_version = '2026-08-01'
	) then
		raise exception 'Debes aceptar las condiciones y la política de privacidad vigentes.';
	end if;

	perform pg_advisory_xact_lock(hashtext(p_user_id::text), hashtext('municipal_map_resolutions'));
	insert into public.write_rate_limits (user_id, action)
	values (p_user_id, 'municipal_map_resolutions');

	select count(*) into v_short_count
	from public.write_rate_limits
	where user_id = p_user_id
	  and action = 'municipal_map_resolutions'
	  and called_at > now() - interval '10 minutes';
	if v_short_count > 5 then
		raise exception 'Has solicitado demasiadas ubicaciones municipales seguidas. Inténtalo más tarde.';
	end if;

	select count(*) into v_day_count
	from public.write_rate_limits
	where user_id = p_user_id
	  and action = 'municipal_map_resolutions'
	  and called_at > now() - interval '1 day';
	if v_day_count > 25 then
		raise exception 'Has alcanzado el límite diario de verificaciones municipales.';
	end if;

	return true;
end;
$$;

revoke all on function public.guard_municipal_map_resolution_server(uuid) from public, anon, authenticated;
grant execute on function public.guard_municipal_map_resolution_server(uuid) to service_role;

comment on function public.guard_municipal_map_resolution_server(uuid) is
	'RPC interna service_role-only. Gate legal y rate-limit antes de resolver municipios no cacheados.';

-- ---------------------------------------------------------------------------
-- 4. Consentimiento específico para apoyos
-- ---------------------------------------------------------------------------

alter table public.municipal_petition_supports
	add column consent_version text,
	add column consented_at timestamptz;

comment on column public.municipal_petition_supports.consent_version is
	'Versión del aviso específico aceptado al registrar el apoyo.';
comment on column public.municipal_petition_supports.consented_at is
	'Fecha del consentimiento explícito específico. Se elimina al retirar el apoyo.';

-- No se inventa consentimiento retrospectivo para los apoyos de prueba pre-0056.
delete from public.municipal_petition_supports
where consent_version is null or consented_at is null;

alter table public.municipal_petition_supports
	alter column consent_version set not null,
	alter column consented_at set not null;

revoke all on function public.set_municipal_petition_support(uuid, boolean) from public, anon, authenticated;
drop function public.set_municipal_petition_support(uuid, boolean);

create or replace function public.set_municipal_petition_support(
	p_petition_id uuid,
	p_supported boolean,
	p_explicit_consent boolean default false,
	p_consent_version text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para apoyar una petición.';
	end if;

	if p_supported then
		-- Añadir un apoyo sí exige que la petición esté abierta. Retirarlo no:
		-- el derecho a retirar consentimiento no depende del estado posterior de la campaña.
		if not exists (
			select 1 from public.municipal_petitions
			where id = p_petition_id and status = 'open'
		) then
			raise exception 'Esta recogida no está abierta.';
		end if;

		-- Defense in depth: igual que la creación, firmar exige las versiones legales vigentes
		-- también en servidor, no solo el checkbox específico del apoyo.
		if not exists (
			select 1
			from public.organizer_private_profiles opp
			where opp.user_id = v_user_id
			  and opp.accepted_terms_at is not null
			  and opp.accepted_privacy_at is not null
			  and opp.accepted_peaceful_use_at is not null
			  and opp.accepted_terms_version = '2026-08-20'
			  and opp.accepted_privacy_version = '2026-08-20'
			  and opp.accepted_peaceful_use_version = '2026-08-01'
		) then
			raise exception 'Debes aceptar las condiciones y la política de privacidad vigentes.';
		end if;

		if p_explicit_consent is not true or btrim(coalesce(p_consent_version, '')) <> '2026-08-20' then
			raise exception 'Necesitamos tu consentimiento explícito para registrar este apoyo.';
		end if;

		insert into public.municipal_petition_supports (
			petition_id, user_id, consent_version, consented_at
		)
		values (p_petition_id, v_user_id, btrim(p_consent_version), now())
		on conflict (petition_id, user_id) do update
		set consent_version = excluded.consent_version,
			consented_at = excluded.consented_at;
	else
		-- Idempotente y deliberadamente permitido aunque la petición esté cerrada/resuelta.
		delete from public.municipal_petition_supports
		where petition_id = p_petition_id and user_id = v_user_id;
	end if;

	return p_supported;
end;
$$;

revoke all on function public.set_municipal_petition_support(uuid, boolean, boolean, text) from public, anon;
grant execute on function public.set_municipal_petition_support(uuid, boolean, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Reportes reactivos de peticiones
-- ---------------------------------------------------------------------------

create table public.municipal_petition_reports (
	id uuid primary key default gen_random_uuid(),
	petition_id uuid not null references public.municipal_petitions (id) on delete cascade,
	reporter_id uuid references auth.users (id) on delete set null,
	reason text not null check (reason in ('spam', 'abuse', 'personal_data', 'misleading', 'illegal', 'other')),
	details text check (details is null or char_length(btrim(details)) between 3 and 1000),
	status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	reviewed_at timestamptz,
	reviewed_by uuid references auth.users (id) on delete set null,
	unique (petition_id, reporter_id)
);

create trigger municipal_petition_reports_set_updated_at
	before update on public.municipal_petition_reports
	for each row execute function public.set_updated_at();

create index municipal_petition_reports_queue_idx
	on public.municipal_petition_reports (status, created_at desc);

alter table public.municipal_petition_reports enable row level security;
revoke all on public.municipal_petition_reports from public, anon, authenticated;
grant select (id, petition_id, reason, details, status, created_at, updated_at, reviewed_at)
	on public.municipal_petition_reports to authenticated;

create policy "municipal_petition_reports_staff_only"
	on public.municipal_petition_reports for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

create or replace function public.report_municipal_petition(
	p_petition_id uuid,
	p_reason text,
	p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
	v_user_id uuid := auth.uid();
	v_report_id uuid;
	v_short_count integer;
	v_day_count integer;
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para reportar una recogida.';
	end if;
	if p_reason not in ('spam', 'abuse', 'personal_data', 'misleading', 'illegal', 'other') then
		raise exception 'Selecciona un motivo de reporte válido.';
	end if;
	if p_details is not null and char_length(btrim(p_details)) not between 3 and 1000 then
		raise exception 'El detalle del reporte debe tener entre 3 y 1000 caracteres.';
	end if;
	if not exists (
		select 1 from public.municipal_petitions
		where id = p_petition_id and status in ('open', 'closed', 'resolved')
	) then
		raise exception 'La recogida indicada no está disponible.';
	end if;

	perform pg_advisory_xact_lock(hashtext(v_user_id::text), hashtext('municipal_petition_reports'));
	insert into public.write_rate_limits (user_id, action)
	values (v_user_id, 'municipal_petition_reports');

	select count(*) into v_short_count
	from public.write_rate_limits
	where user_id = v_user_id
	  and action = 'municipal_petition_reports'
	  and called_at > now() - interval '10 minutes';
	if v_short_count > 5 then
		raise exception 'Has enviado demasiados reportes seguidos. Inténtalo de nuevo más tarde.';
	end if;

	select count(*) into v_day_count
	from public.write_rate_limits
	where user_id = v_user_id
	  and action = 'municipal_petition_reports'
	  and called_at > now() - interval '1 day';
	if v_day_count > 30 then
		raise exception 'Has alcanzado el límite diario de reportes.';
	end if;

	insert into public.municipal_petition_reports (petition_id, reporter_id, reason, details)
	values (p_petition_id, v_user_id, p_reason, nullif(btrim(coalesce(p_details, '')), ''))
	on conflict (petition_id, reporter_id) do update
	set reason = excluded.reason,
		details = excluded.details,
		status = 'open',
		reviewed_at = null,
		reviewed_by = null,
		updated_at = now()
	returning id into v_report_id;

	return v_report_id;
end;
$$;

revoke all on function public.report_municipal_petition(uuid, text, text) from public, anon;
grant execute on function public.report_municipal_petition(uuid, text, text) to authenticated;

comment on table public.municipal_petition_reports is
	'Reportes privados sobre recogidas municipales. Publicación inmediata con moderación reactiva.';

alter table public.audit_trail drop constraint audit_trail_target_type_check;
alter table public.audit_trail add constraint audit_trail_target_type_check
	check (target_type in ('open_voice_contribution', 'verification_document', 'municipal_petition'));

alter table public.audit_trail drop constraint audit_trail_action_check;
alter table public.audit_trail add constraint audit_trail_action_check
	check (action in (
		'open_voice_moderation_update',
		'verification_document_review',
		'verification_document_signed_url_issued',
		'municipal_petition_report_dismissed',
		'municipal_petition_hidden'
	));

create or replace function public.review_municipal_petition_report(
	p_report_id uuid,
	p_action text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
	v_actor_id uuid := auth.uid();
	v_petition_id uuid;
begin
	if v_actor_id is null or not public.is_moderator_or_admin() then
		raise exception 'Acceso restringido a moderación.';
	end if;
	if p_action not in ('dismiss', 'hide_petition') then
		raise exception 'Acción de moderación no válida.';
	end if;

	select petition_id into v_petition_id
	from public.municipal_petition_reports
	where id = p_report_id and status = 'open'
	for update;
	if not found then
		raise exception 'El reporte ya no está pendiente.';
	end if;

	if p_action = 'dismiss' then
		update public.municipal_petition_reports
		set status = 'dismissed', reviewed_at = now(), reviewed_by = v_actor_id
		where id = p_report_id;

		insert into public.audit_trail (target_type, target_id, action, actor_type, actor_id, metadata)
		values ('municipal_petition', v_petition_id, 'municipal_petition_report_dismissed', 'human', v_actor_id, '{}'::jsonb);
	else
		update public.municipal_petitions
		set status = 'hidden'
		where id = v_petition_id and status in ('open', 'closed', 'resolved');

		-- Una petición ocultada deja de necesitar relaciones cuenta↔apoyo activas.
		-- Se eliminan para minimizar datos potencialmente sensibles y evitar dejar
		-- consentimientos que ya no pueden gestionarse desde una ficha pública.
		delete from public.municipal_petition_supports
		where petition_id = v_petition_id;

		update public.municipal_petition_reports
		set status = 'actioned', reviewed_at = now(), reviewed_by = v_actor_id
		where petition_id = v_petition_id and status = 'open';

		insert into public.audit_trail (target_type, target_id, action, actor_type, actor_id, metadata)
		values ('municipal_petition', v_petition_id, 'municipal_petition_hidden', 'human', v_actor_id, '{}'::jsonb);
	end if;

	return true;
end;
$$;

revoke all on function public.review_municipal_petition_report(uuid, text) from public, anon;
grant execute on function public.review_municipal_petition_report(uuid, text) to authenticated;

-- Defense in depth ante defaults de EXECUTE de Supabase.
revoke all on function public.set_municipal_petition_support(uuid, boolean, boolean, text) from anon;
revoke all on function public.report_municipal_petition(uuid, text, text) from anon;
revoke all on function public.create_municipal_petition_server(uuid, text, text, text, text, uuid) from anon, authenticated;
revoke all on function public.guard_municipal_map_resolution_server(uuid) from anon, authenticated;
revoke all on function public.review_municipal_petition_report(uuid, text) from anon;
