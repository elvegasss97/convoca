-- 0032_escucha_vivienda.sql
--
-- Núcleo funcional de "Escucha abierta sobre vivienda": priorizar entre 1 y
-- 3 preocupaciones concretas, profundizar solo en las elegidas, y contexto
-- voluntario. Todo aditivo, sin filas semilla, sin contenido político.
--
-- No reutiliza `concerns`/`concern_responses`: esas tablas modelan una
-- pregunta amplia por tema con un nivel 1-5 (p. ej. "¿Cuánto te preocupa el
-- acceso a la vivienda?"), un significado distinto al de esta ronda
-- (seleccionar y ordenar problemas concretos, con 4 preguntas estructuradas
-- de profundización cada uno). Mezclarlas habría significado combinar
-- respuestas de preguntas con significados distintos, algo que se pidió
-- evitar explícitamente. Las filas existentes de `concerns`/`concern_responses`
-- no se tocan.
--
-- Sigue el mismo patrón que `participation_rounds` (0031): ronda con
-- versión y estado, función `SECURITY DEFINER` con `auth.uid()` interno
-- como único punto de escritura, restricción `UNIQUE` para que cambiar una
-- respuesta actualice la fila en vez de duplicarla.
--
-- Qué crea:
--   1. `concern_listening_rounds` — ronda de escucha ligada a una
--      categoría (tema) y una versión. Empieza en `draft`.
--   2. `concern_listening_responses` — una fila por (ronda, opción,
--      usuario): `rank` (1-3) si está seleccionada como prioridad,
--      `null` si se deseleccionó — se conserva la profundización ya
--      escrita en vez de borrarla. Ahí viven también gravedad, evolución,
--      relación personal, causa y comentario privado.
--   3. `concern_listening_contexts` — contexto territorial/situacional
--      voluntario, una fila por (ronda, usuario).
--   4. `concern_listening_completions` — marca real de "escucha
--      finalizada" por (ronda, usuario); no bloquea seguir editando
--      mientras la ronda siga abierta.
--   5. Funciones `SECURITY DEFINER`: `set_concern_listening_priorities`,
--      `set_concern_listening_detail`, `set_concern_listening_context`,
--      `set_concern_listening_completed`.

-- ---------------------------------------------------------------------------
-- 1. concern_listening_rounds
-- ---------------------------------------------------------------------------

create table public.concern_listening_rounds (
	id uuid primary key default gen_random_uuid(),
	category text not null check (
		category in (
			'vivienda', 'sanidad', 'empleo', 'educacion', 'seguridad', 'coste_vida', 'transporte', 'medioambiente'
		)
	),
	version_label text not null,
	status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed')),
	opens_at timestamptz,
	closes_at timestamptz,
	created_by uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.concern_listening_rounds is
	'Ronda de "escucha abierta" (priorizar y profundizar en problemas concretos) ligada a una categoría/tema. Empieza en draft; abrirla es una acción explícita del panel.';

alter table public.concern_listening_rounds enable row level security;

create index concern_listening_rounds_category_idx on public.concern_listening_rounds (category);

create trigger concern_listening_rounds_set_updated_at
	before update on public.concern_listening_rounds
	for each row
	execute function public.set_updated_at();

create policy "concern_listening_rounds_select_public_or_staff"
	on public.concern_listening_rounds for select
	to anon, authenticated
	using (status <> 'draft' or public.is_moderator_or_admin());

create policy "concern_listening_rounds_write_staff"
	on public.concern_listening_rounds for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 2. concern_listening_responses
-- ---------------------------------------------------------------------------

create table public.concern_listening_responses (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.concern_listening_rounds (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	option_code text not null,
	-- null = actualmente no seleccionada como prioridad (se conserva la
	-- profundización si ya se había escrito, en vez de borrarla).
	rank smallint check (rank in (1, 2, 3)),
	severity text check (severity in ('muy_grave', 'grave', 'moderada', 'poco_grave', 'sin_info')),
	evolution text check (evolution in ('empeorado', 'similar', 'mejorado', 'no_sabe')),
	personal_relation text check (
		personal_relation in (
			'directamente', 'persona_cercana', 'profesional', 'no_afecta', 'prefiere_no_responder'
		)
	),
	cause_code text,
	cause_other text check (cause_other is null or char_length(cause_other) <= 200),
	comment text check (comment is null or char_length(comment) <= 500),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (round_id, option_code, user_id),
	unique (round_id, user_id, rank)
);

comment on table public.concern_listening_responses is
	'Selección/prioridad y profundización de un usuario sobre una preocupación concreta dentro de una ronda de escucha. rank null = deseleccionada (se conserva su profundización). La restricción UNIQUE(round_id, user_id, rank) permite varios null (Postgres no los considera duplicados) pero impide repetir 1/2/3.';
comment on column public.concern_listening_responses.comment is
	'Explicación privada opcional: nunca se expone en resultados públicos como texto individual.';

alter table public.concern_listening_responses enable row level security;

create index concern_listening_responses_round_user_idx on public.concern_listening_responses (round_id, user_id);

create trigger concern_listening_responses_set_updated_at
	before update on public.concern_listening_responses
	for each row
	execute function public.set_updated_at();

create policy "concern_listening_responses_select_own_or_staff"
	on public.concern_listening_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- Sin políticas de INSERT/UPDATE/DELETE directas: toda escritura pasa por
-- `set_concern_listening_priorities`/`set_concern_listening_detail`
-- (SECURITY DEFINER), igual que el resto de la participación (0031).

-- ---------------------------------------------------------------------------
-- 3. concern_listening_contexts
-- ---------------------------------------------------------------------------

create table public.concern_listening_contexts (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.concern_listening_rounds (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	community text check (community is null or char_length(community) <= 120),
	area_type text check (area_type in ('urbano', 'intermedio', 'rural', 'prefiere_no_responder')),
	housing_situation text check (
		housing_situation is null
		or housing_situation in (
			'alquiler', 'propiedad', 'buscando', 'con_familiares', 'vivienda_publica', 'otra', 'prefiere_no_responder'
		)
	),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (round_id, user_id)
);

comment on table public.concern_listening_contexts is
	'Contexto voluntario (territorio, tipo de entorno, situación de vivienda) de la escucha. Completamente opcional; nunca se expone públicamente a nivel individual.';

alter table public.concern_listening_contexts enable row level security;

create trigger concern_listening_contexts_set_updated_at
	before update on public.concern_listening_contexts
	for each row
	execute function public.set_updated_at();

create policy "concern_listening_contexts_select_own_or_staff"
	on public.concern_listening_contexts for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 4. concern_listening_completions
-- ---------------------------------------------------------------------------

create table public.concern_listening_completions (
	round_id uuid not null references public.concern_listening_rounds (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	completed_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	primary key (round_id, user_id)
);

comment on table public.concern_listening_completions is
	'Marca real de "he finalizado esta escucha" por usuario/ronda. No bloquea seguir editando mientras la ronda siga abierta: solo registra el hito.';

alter table public.concern_listening_completions enable row level security;

create trigger concern_listening_completions_set_updated_at
	before update on public.concern_listening_completions
	for each row
	execute function public.set_updated_at();

create policy "concern_listening_completions_select_own_or_staff"
	on public.concern_listening_completions for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 5. Funciones de escritura (SECURITY DEFINER, auth.uid() interno)
-- ---------------------------------------------------------------------------

create or replace function public.set_concern_listening_priorities(p_round_id uuid, p_option_codes text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
	v_count integer;
	v_distinct_count integer;
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	v_count := coalesce(array_length(p_option_codes, 1), 0);
	if v_count > 3 then
		raise exception 'Puedes elegir como máximo tres preocupaciones.';
	end if;

	select count(distinct c) into v_distinct_count from unnest(p_option_codes) as c;
	if v_distinct_count <> v_count then
		raise exception 'No puedes elegir la misma preocupación más de una vez.';
	end if;

	if not exists (
		select 1 from public.concern_listening_rounds r where r.id = p_round_id and r.status = 'open'
	) then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	if v_count > 0 then
		insert into public.concern_listening_responses (round_id, user_id, option_code, rank)
		select p_round_id, v_user_id, u.code, u.ord::smallint
		from unnest(p_option_codes) with ordinality as u (code, ord)
		on conflict (round_id, option_code, user_id)
		do update set rank = excluded.rank, updated_at = now();
	end if;

	-- Deselecciona (rank = null) lo que ya no está en la lista, sin borrar
	-- la profundización que se hubiera escrito.
	update public.concern_listening_responses
	set rank = null, updated_at = now()
	where round_id = p_round_id
	and user_id = v_user_id
	and rank is not null
	and not (option_code = any (p_option_codes));
end;
$function$;

create or replace function public.set_concern_listening_detail(
	p_round_id uuid,
	p_option_code text,
	p_severity text default null,
	p_evolution text default null,
	p_personal_relation text default null,
	p_cause_code text default null,
	p_cause_other text default null,
	p_comment text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	if p_severity is not null and p_severity not in ('muy_grave', 'grave', 'moderada', 'poco_grave', 'sin_info') then
		raise exception 'Selecciona una gravedad válida.';
	end if;
	if p_evolution is not null and p_evolution not in ('empeorado', 'similar', 'mejorado', 'no_sabe') then
		raise exception 'Selecciona una evolución válida.';
	end if;
	if p_personal_relation is not null and p_personal_relation not in (
		'directamente', 'persona_cercana', 'profesional', 'no_afecta', 'prefiere_no_responder'
	) then
		raise exception 'Selecciona una relación personal válida.';
	end if;
	if p_cause_other is not null and char_length(p_cause_other) > 200 then
		raise exception 'La causa adicional es demasiado larga.';
	end if;
	if p_comment is not null and char_length(p_comment) > 500 then
		raise exception 'El comentario es demasiado largo.';
	end if;

	if not exists (
		select 1 from public.concern_listening_rounds r where r.id = p_round_id and r.status = 'open'
	) then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	if not exists (
		select 1 from public.concern_listening_responses
		where round_id = p_round_id and user_id = v_user_id and option_code = p_option_code and rank is not null
	) then
		raise exception 'Selecciona antes esta preocupación como prioridad.';
	end if;

	update public.concern_listening_responses
	set
		severity = p_severity,
		evolution = p_evolution,
		personal_relation = p_personal_relation,
		cause_code = p_cause_code,
		cause_other = nullif(trim(p_cause_other), ''),
		comment = nullif(trim(p_comment), ''),
		updated_at = now()
	where round_id = p_round_id and user_id = v_user_id and option_code = p_option_code;
end;
$function$;

create or replace function public.set_concern_listening_context(
	p_round_id uuid,
	p_community text default null,
	p_area_type text default null,
	p_housing_situation text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	if p_community is not null and char_length(p_community) > 120 then
		raise exception 'El texto es demasiado largo.';
	end if;
	if p_area_type is not null and p_area_type not in ('urbano', 'intermedio', 'rural', 'prefiere_no_responder') then
		raise exception 'Selecciona un tipo de entorno válido.';
	end if;
	if p_housing_situation is not null and p_housing_situation not in (
		'alquiler', 'propiedad', 'buscando', 'con_familiares', 'vivienda_publica', 'otra', 'prefiere_no_responder'
	) then
		raise exception 'Selecciona una situación válida.';
	end if;

	if not exists (
		select 1 from public.concern_listening_rounds r where r.id = p_round_id and r.status = 'open'
	) then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	insert into public.concern_listening_contexts (round_id, user_id, community, area_type, housing_situation)
	values (p_round_id, v_user_id, nullif(trim(p_community), ''), p_area_type, p_housing_situation)
	on conflict (round_id, user_id)
	do update set
		community = excluded.community,
		area_type = excluded.area_type,
		housing_situation = excluded.housing_situation,
		updated_at = now();
end;
$function$;

create or replace function public.set_concern_listening_completed(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	if not exists (
		select 1 from public.concern_listening_rounds r where r.id = p_round_id and r.status = 'open'
	) then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	insert into public.concern_listening_completions (round_id, user_id)
	values (p_round_id, v_user_id)
	on conflict (round_id, user_id)
	do update set completed_at = now(), updated_at = now();
end;
$function$;
