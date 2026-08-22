-- 0062_public_spending_submissions.sql
--
-- Buzón privado de pistas sobre gasto público. Una aportación nunca se
-- publica automáticamente: solo la ve el equipo de moderación.
-- La identidad no se copia a las fichas editoriales resultantes.

create table public.public_spending_submissions (
	id uuid primary key default gen_random_uuid(),
	submitter_user_id uuid not null references auth.users (id) on delete cascade,
	title text not null,
	details text not null,
	amount_text text,
	managing_organization text,
	territory text,
	source_urls text[] not null,
	status text not null default 'received' check (
		status in ('received', 'triage', 'researching', 'published', 'dismissed')
	),
	reviewer_note text,
	reviewed_by uuid references auth.users (id) on delete set null,
	reviewed_at timestamptz,
	resulting_case_slug text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint public_spending_submissions_source_count check (
		cardinality(source_urls) between 1 and 5
	),
	constraint public_spending_submissions_result_slug_format check (
		resulting_case_slug is null or resulting_case_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
	),
	constraint public_spending_submissions_result_status_consistency check (
		(status = 'published' and resulting_case_slug is not null)
		or (status <> 'published' and resulting_case_slug is null)
	),
	constraint public_spending_submissions_review_consistency check (
		(status = 'received' and reviewed_by is null and reviewed_at is null)
		or (status <> 'received' and reviewed_by is not null and reviewed_at is not null)
	)
);

comment on table public.public_spending_submissions is
	'Pistas privadas de personas autenticadas para investigar partidas de gasto público. Requieren triaje humano y nunca son contenido público por sí mismas.';
comment on column public.public_spending_submissions.source_urls is
	'Entre una y cinco URL públicas que permiten iniciar la verificación.';
comment on column public.public_spending_submissions.reviewer_note is
	'Nota interna: no debe copiar datos personales ni texto ciudadano innecesario.';

alter table public.public_spending_submissions enable row level security;

-- Supabase ya no expone automáticamente tablas nuevas en la Data API. Se
-- conceden solo las operaciones necesarias; RLS sigue siendo la barrera de
-- autorización por fila.
revoke all on public.public_spending_submissions from public, anon, authenticated;
grant select, insert, update on public.public_spending_submissions to authenticated;

create index public_spending_submissions_status_created_idx
	on public.public_spending_submissions (status, created_at);
create index public_spending_submissions_submitter_idx
	on public.public_spending_submissions (submitter_user_id, created_at desc);

create policy "public_spending_submissions_select_staff"
	on public.public_spending_submissions for select
	to authenticated
	using (public.is_moderator_or_admin());

create policy "public_spending_submissions_insert_own"
	on public.public_spending_submissions for insert
	to authenticated
	with check (submitter_user_id = auth.uid());

create policy "public_spending_submissions_update_staff"
	on public.public_spending_submissions for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

create trigger public_spending_submissions_set_updated_at
	before update on public.public_spending_submissions
	for each row execute function public.set_updated_at();

create or replace function public.enforce_public_spending_submission_insert()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
	v_url text;
	v_normalized_urls text[] := array[]::text[];
begin
	new.title := btrim(coalesce(new.title, ''));
	new.details := btrim(coalesce(new.details, ''));
	new.amount_text := nullif(btrim(coalesce(new.amount_text, '')), '');
	new.managing_organization := nullif(btrim(coalesce(new.managing_organization, '')), '');
	new.territory := nullif(btrim(coalesce(new.territory, '')), '');

	if char_length(new.title) not between 5 and 160 then
		raise exception 'El título debe tener entre 5 y 160 caracteres.';
	end if;
	if char_length(new.details) not between 20 and 3000 then
		raise exception 'La explicación debe tener entre 20 y 3000 caracteres.';
	end if;
	if new.amount_text is not null and char_length(new.amount_text) > 120 then
		raise exception 'La referencia de importe es demasiado larga.';
	end if;
	if new.managing_organization is not null and char_length(new.managing_organization) > 200 then
		raise exception 'El organismo es demasiado largo.';
	end if;
	if new.territory is not null and char_length(new.territory) > 160 then
		raise exception 'El territorio es demasiado largo.';
	end if;

	if new.source_urls is null or cardinality(new.source_urls) not between 1 and 5 then
		raise exception 'Añade entre una y cinco fuentes públicas.';
	end if;
	foreach v_url in array new.source_urls loop
		v_url := btrim(coalesce(v_url, ''));
		if char_length(v_url) not between 10 and 1500 or v_url !~* '^https?://[^[:space:]]+$' then
			raise exception 'Todas las fuentes deben ser URL http(s) válidas.';
		end if;
		v_normalized_urls := array_append(v_normalized_urls, v_url);
	end loop;
	new.source_urls := v_normalized_urls;

	-- Defensa en profundidad: el cliente no elige el estado editorial.
	new.status := 'received';
	new.reviewer_note := null;
	new.reviewed_by := null;
	new.reviewed_at := null;
	new.resulting_case_slug := null;
	return new;
end;
$$;

revoke execute on function public.enforce_public_spending_submission_insert()
	from public, anon, authenticated;

create trigger public_spending_submissions_enforce_insert
	before insert on public.public_spending_submissions
	for each row execute function public.enforce_public_spending_submission_insert();

create or replace function public.prevent_public_spending_submission_content_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
	if new.submitter_user_id is distinct from old.submitter_user_id then
		raise exception 'No se puede reasignar una aportación a otra cuenta.';
	end if;
	if new.title is distinct from old.title
		or new.details is distinct from old.details
		or new.amount_text is distinct from old.amount_text
		or new.managing_organization is distinct from old.managing_organization
		or new.territory is distinct from old.territory
		or new.source_urls is distinct from old.source_urls then
		raise exception 'El contenido original de una pista no se puede modificar.';
	end if;
	return new;
end;
$$;

revoke execute on function public.prevent_public_spending_submission_content_update()
	from public, anon, authenticated;

create trigger public_spending_submissions_preserve_original
	before update on public.public_spending_submissions
	for each row execute function public.prevent_public_spending_submission_content_update();

-- Reutiliza el registro append-only y el advisory lock del sistema de
-- límites de escritura, con un umbral deliberadamente bajo para una pista
-- que requiere investigación humana.
alter table public.write_rate_limits drop constraint write_rate_limits_action_check;
alter table public.write_rate_limits add constraint write_rate_limits_action_check
	check (action in (
		'reports', 'channel_reports', 'concern_proposals', 'open_voice_contributions',
		'municipal_petitions', 'municipal_map_resolutions', 'municipal_petition_reports',
		'municipal_staff_map_resolutions', 'public_spending_submissions'
	));

create or replace function public.enforce_public_spending_submission_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
	v_user_id uuid := auth.uid();
	v_short_count integer;
	v_day_count integer;
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión.';
	end if;
	if tg_op <> 'INSERT'
		or tg_table_schema <> 'public'
		or tg_table_name <> 'public_spending_submissions' then
		raise exception 'Contexto de trigger no válido.';
	end if;
	if new.submitter_user_id is distinct from v_user_id then
		raise exception 'La pista debe pertenecer a la sesión actual.';
	end if;

	perform pg_advisory_xact_lock(
		hashtext(v_user_id::text),
		hashtext('public_spending_submissions')
	);
	insert into public.write_rate_limits (user_id, action)
	values (v_user_id, 'public_spending_submissions');

	select count(*) into v_short_count
	from public.write_rate_limits
	where user_id = v_user_id
		and action = 'public_spending_submissions'
		and called_at > now() - interval '1 minute';
	if v_short_count > 2 then
		raise exception 'Has enviado demasiadas pistas seguidas. Inténtalo de nuevo más tarde.';
	end if;

	select count(*) into v_day_count
	from public.write_rate_limits
	where user_id = v_user_id
		and action = 'public_spending_submissions'
		and called_at > now() - interval '1 day';
	if v_day_count > 5 then
		raise exception 'Has alcanzado el límite diario de pistas.';
	end if;
	return new;
end;
$$;

revoke all on function public.enforce_public_spending_submission_rate_limit()
	from public, anon, authenticated;

create trigger enforce_public_spending_submissions_rate_limit
	before insert on public.public_spending_submissions
	for each row execute function public.enforce_public_spending_submission_rate_limit();
