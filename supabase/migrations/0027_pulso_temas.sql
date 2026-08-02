-- 0027_pulso_temas.sql
--
-- "Preocupaciones → Soluciones" dentro de Pulso ciudadano: arquitectura base
-- para reunir, por tema, el problema (datos+fuentes), los resultados de
-- Pulso, las medidas propuestas ("soluciones"), la valoración ciudadana de
-- cada medida y las alternativas que proponen los usuarios.
--
-- IMPORTANTE (encargo explícito): esta migración NO inserta ningún
-- contenido político real ni de ejemplo. Ninguna fila semilla. El
-- `category` de un tema es opcional a propósito: "categoría pendiente" es
-- un estado legítimo mientras no se entregue contenido real.
--
-- Reutiliza exactamente el mismo sistema de permisos que el resto del
-- proyecto (`public.is_moderator_or_admin()`, 0001) — ningún rol nuevo.
--
-- Qué crea (nada destructivo, solo tablas/funciones nuevas):
--   1. `public.topics` — el tema en sí (cabecera + "el problema").
--   2. `public.topic_sources` — fuentes verificables.
--   3. `public.topic_data_points` — datos destacados, opcionalmente ligados
--      a una fuente.
--   4. `public.topic_concerns` — relación N:M con `concerns` (preguntas de
--      Pulso ya publicadas) para "lo que dice la ciudadanía".
--   5. `public.topic_measures` — medidas/soluciones independientes.
--   6. `public.measure_responses` — valoración ciudadana de cada medida
--      (a favor/en contra/la modificaría + prioridad), mismo patrón que
--      `concern_responses`/`set_concern_response` (0026): única fila por
--      cuenta y medida, upsert vía función SECURITY DEFINER con
--      `auth.uid()` interno, nunca expuesta individualmente.
--   7. `public.topic_measure_alternatives` — propuestas ciudadanas de
--      modificación de una medida. Nunca se publican solas: quedan en
--      revisión, igual que `concern_proposals`.

-- ---------------------------------------------------------------------------
-- 1. topics
-- ---------------------------------------------------------------------------

create table public.topics (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	title text not null,
	summary text not null default '',
	-- Nullable a propósito: "categoría pendiente" es un estado real mientras
	-- no se entregue contenido, no un dato inventado por el sistema.
	category text check (
		category is null
		or category in ('vivienda', 'sanidad', 'empleo', 'educacion', 'seguridad', 'coste_vida', 'transporte', 'medioambiente')
	),
	cover_image_url text,
	status text not null default 'draft' check (status in ('draft', 'open', 'reviewed', 'archived')),
	-- "El problema": introducción. Los datos destacados y fuentes viven en
	-- tablas propias (más abajo) para que el panel de administración pueda
	-- añadir/ordenar cada uno por separado.
	problem_intro text not null default '',
	version text not null default '1',
	published_at timestamptz,
	created_by uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.topics is
	'"Preocupación → Soluciones": tema ciudadano que reúne el problema, resultados de Pulso, medidas propuestas y su valoración. Sin contenido semilla — el category nulo representa "pendiente", no un dato inventado.';

alter table public.topics enable row level security;

create index topics_status_idx on public.topics (status);
create index topics_category_idx on public.topics (category);

create trigger topics_set_updated_at
	before update on public.topics
	for each row
	execute function public.set_updated_at();

-- Lectura pública de lo publicado ('open'/'reviewed'); moderación/administración ven todo (incluido draft/archived).
create policy "topics_select_public_or_staff"
	on public.topics for select
	to anon, authenticated
	using (status in ('open', 'reviewed') or public.is_moderator_or_admin());

create policy "topics_insert_staff"
	on public.topics for insert
	to authenticated
	with check (public.is_moderator_or_admin());

create policy "topics_update_staff"
	on public.topics for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- Sin política de DELETE: un tema se archiva, nunca se borra (conserva valoraciones y alternativas).

-- ---------------------------------------------------------------------------
-- 2. topic_sources — fuentes verificables
-- ---------------------------------------------------------------------------

create table public.topic_sources (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	label text not null,
	url text,
	note text,
	sort_order integer not null default 0,
	created_at timestamptz not null default now()
);

comment on table public.topic_sources is 'Fuentes verificables de un tema. Contenido "dato comprobable", nunca opinión.';

alter table public.topic_sources enable row level security;

create index topic_sources_topic_id_idx on public.topic_sources (topic_id);

create policy "topic_sources_select_public_or_staff"
	on public.topic_sources for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_sources_write_staff"
	on public.topic_sources for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 3. topic_data_points — datos destacados
-- ---------------------------------------------------------------------------

create table public.topic_data_points (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	label text not null,
	value text not null,
	source_id uuid references public.topic_sources (id) on delete set null,
	sort_order integer not null default 0,
	created_at timestamptz not null default now()
);

comment on table public.topic_data_points is 'Datos destacados de "el problema", opcionalmente ligados a una fuente verificable.';

alter table public.topic_data_points enable row level security;

create index topic_data_points_topic_id_idx on public.topic_data_points (topic_id);

create policy "topic_data_points_select_public_or_staff"
	on public.topic_data_points for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_data_points_write_staff"
	on public.topic_data_points for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 4. topic_concerns — relación N:M con preguntas de Pulso ya existentes
-- ---------------------------------------------------------------------------

create table public.topic_concerns (
	topic_id uuid not null references public.topics (id) on delete cascade,
	concern_id uuid not null references public.concerns (id) on delete cascade,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	primary key (topic_id, concern_id)
);

comment on table public.topic_concerns is
	'"Lo que dice la ciudadanía": preguntas de Pulso (concerns) vinculadas a un tema. Gestionada solo por moderación/administración.';

alter table public.topic_concerns enable row level security;

create index topic_concerns_concern_id_idx on public.topic_concerns (concern_id);

create policy "topic_concerns_select_public_or_staff"
	on public.topic_concerns for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_concerns_write_staff"
	on public.topic_concerns for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 5. topic_measures — soluciones/medidas independientes
-- ---------------------------------------------------------------------------

create table public.topic_measures (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	title text not null,
	explanation text not null default '',
	responsible_scope text,
	estimated_cost text,
	timeframe text,
	arguments_for text,
	risks text,
	sort_order integer not null default 0,
	-- Permite ocultar una medida puntual sin archivar todo el tema.
	is_published boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.topic_measures is
	'Medida/solución propuesta dentro de un tema. Siempre "Borrador Convoca" por construcción (solo moderación/administración las crea) — el aviso correspondiente lo renderiza el cliente.';

alter table public.topic_measures enable row level security;

create index topic_measures_topic_id_idx on public.topic_measures (topic_id);

create trigger topic_measures_set_updated_at
	before update on public.topic_measures
	for each row
	execute function public.set_updated_at();

create policy "topic_measures_select_public_or_staff"
	on public.topic_measures for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or (
			is_published
			and exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
		)
	);

create policy "topic_measures_write_staff"
	on public.topic_measures for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 6. measure_responses — valoración ciudadana de cada medida
-- ---------------------------------------------------------------------------

create table public.measure_responses (
	id uuid primary key default gen_random_uuid(),
	measure_id uuid not null references public.topic_measures (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	stance text not null check (stance in ('favor', 'en_contra', 'modificaria')),
	priority text check (priority in ('alta', 'media', 'baja')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (measure_id, user_id)
);

comment on table public.measure_responses is
	'Una valoración activa por cuenta y medida (a favor/en contra/la modificaría + prioridad opcional). Sin política de escritura directa: toda mutación pasa por set_measure_response(). Nunca expuesta individualmente.';

alter table public.measure_responses enable row level security;

create index measure_responses_measure_id_idx on public.measure_responses (measure_id);
create index measure_responses_user_id_idx on public.measure_responses (user_id);

create trigger measure_responses_set_updated_at
	before update on public.measure_responses
	for each row
	execute function public.set_updated_at();

create policy "measure_responses_select_own_or_staff"
	on public.measure_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

create or replace function public.set_measure_response(p_measure_id uuid, p_stance text, p_priority text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para valorar una medida.';
	end if;

	if p_stance is null or p_stance not in ('favor', 'en_contra', 'modificaria') then
		raise exception 'Selecciona una valoración válida.';
	end if;

	if p_priority is not null and p_priority not in ('alta', 'media', 'baja') then
		raise exception 'Prioridad no válida.';
	end if;

	if not exists (
		select 1
		from public.topic_measures m
		join public.topics t on t.id = m.topic_id
		where m.id = p_measure_id
		and m.is_published
		and t.status in ('open', 'reviewed')
	) then
		raise exception 'Esta medida no admite valoraciones en este momento.';
	end if;

	insert into public.measure_responses (measure_id, user_id, stance, priority)
	values (p_measure_id, v_user_id, p_stance, p_priority)
	on conflict (measure_id, user_id)
	do update set stance = excluded.stance, priority = excluded.priority, updated_at = now();
end;
$$;

comment on function public.set_measure_response is
	'Único punto de escritura de measure_responses. auth.uid() interno: el id de usuario nunca llega como parámetro del cliente.';

revoke execute on function public.set_measure_response(uuid, text, text) from public;
grant execute on function public.set_measure_response(uuid, text, text) to authenticated;

create or replace function public.get_measure_results(p_measure_ids uuid[] default null)
returns table (measure_id uuid, stance text, response_count bigint)
language sql
stable
security definer
set search_path = public
as $$
	select mr.measure_id, mr.stance, count(*) as response_count
	from public.measure_responses mr
	where p_measure_ids is null or mr.measure_id = any(p_measure_ids)
	group by mr.measure_id, mr.stance;
$$;

comment on function public.get_measure_results is
	'Recuento agregado de valoraciones por postura (favor/en_contra/modificaria) y medida. Nunca expone filas individuales.';

revoke execute on function public.get_measure_results(uuid[]) from public;
grant execute on function public.get_measure_results(uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. topic_measure_alternatives — alternativas ciudadanas
-- ---------------------------------------------------------------------------

create table public.topic_measure_alternatives (
	id uuid primary key default gen_random_uuid(),
	measure_id uuid not null references public.topic_measures (id) on delete cascade,
	proposer_user_id uuid not null references auth.users (id) on delete cascade,
	title text not null,
	description text not null,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	reviewer_note text,
	reviewed_by uuid references auth.users (id) on delete set null,
	reviewed_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.topic_measure_alternatives is
	'Alternativa o modificación propuesta por una persona usuaria para una medida. Nunca se publica sola: requiere revisión ("pending" por defecto, forzado también por trigger).';

alter table public.topic_measure_alternatives enable row level security;

create index topic_measure_alternatives_measure_id_idx on public.topic_measure_alternatives (measure_id);
create index topic_measure_alternatives_status_idx on public.topic_measure_alternatives (status);

create trigger topic_measure_alternatives_set_updated_at
	before update on public.topic_measure_alternatives
	for each row
	execute function public.set_updated_at();

-- Público solo ve las aprobadas (contenido "propuesta ciudadana"); quien
-- propone ve las suyas en cualquier estado; moderación/administración ven todas.
create policy "topic_measure_alternatives_select_approved_own_or_staff"
	on public.topic_measure_alternatives for select
	to anon, authenticated
	using (
		status = 'approved'
		or (auth.uid() is not null and proposer_user_id = auth.uid())
		or public.is_moderator_or_admin()
	);

create policy "topic_measure_alternatives_insert_own"
	on public.topic_measure_alternatives for insert
	to authenticated
	with check (proposer_user_id = auth.uid());

create policy "topic_measure_alternatives_update_staff"
	on public.topic_measure_alternatives for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

create or replace function public.enforce_topic_measure_alternative_insert()
returns trigger
language plpgsql
as $$
begin
	new.status := 'pending';
	new.reviewer_note := null;
	new.reviewed_by := null;
	new.reviewed_at := null;
	return new;
end;
$$;

create trigger topic_measure_alternatives_enforce_insert
	before insert on public.topic_measure_alternatives
	for each row
	execute function public.enforce_topic_measure_alternative_insert();

create or replace function public.prevent_topic_measure_alternative_reassignment()
returns trigger
language plpgsql
as $$
begin
	if new.proposer_user_id is distinct from old.proposer_user_id then
		raise exception 'No se puede reasignar una alternativa a otra cuenta.';
	end if;
	return new;
end;
$$;

create trigger topic_measure_alternatives_prevent_reassignment
	before update on public.topic_measure_alternatives
	for each row
	execute function public.prevent_topic_measure_alternative_reassignment();

-- No se insertan filas: esta migración deja el esquema listo, sin ningún
-- contenido político real ni de ejemplo (encargo explícito).
