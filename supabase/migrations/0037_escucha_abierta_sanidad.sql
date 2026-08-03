-- 0037_escucha_abierta_sanidad.sql
--
-- Primera versión funcional de "Escucha abierta sobre sanidad". Reutiliza
-- `concern_listening_rounds` (ya genérica por categoría, ya usada por
-- Vivienda) para el concepto de ronda. No reutiliza
-- `concern_listening_responses` de Vivienda: esa tabla representa una fila
-- por preocupación seleccionada con rango y profundización propia
-- (priorizar + profundizar). Esta escucha es una encuesta de una sola
-- tirada por persona — misma idea que `general_participation_responses`
-- del plan (una fila por usuario y ronda), no la de Vivienda. Por eso se
-- añade una tabla hermana con forma propia, mismo patrón de seguridad,
-- no una arquitectura paralela.
--
-- Las medidas priorizadas y los compromisos elegidos se referencian por
-- FK real a `topic_measures`/`topic_commitments`: el nombre mostrado
-- siempre es el vigente, nunca una copia que pueda desincronizarse.
--
-- Todo aditivo y no destructivo: no toca ninguna fila ni tabla existente.

-- ---------------------------------------------------------------------------
-- 1. concern_listening_survey_responses
-- ---------------------------------------------------------------------------

create table public.concern_listening_survey_responses (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.concern_listening_rounds (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	-- Paso 1: hasta 3 problemas de una lista fija de 12 códigos (incluye 'otro').
	problems text[] not null default '{}',
	other_problem_text text check (other_problem_text is null or char_length(other_problem_text) <= 150),
	-- Paso 2: una causa principal de una lista fija de 10 códigos.
	main_cause text check (
		main_cause is null or main_cause in (
			'faltan_profesionales', 'mala_distribucion', 'temporalidad', 'problemas_organizacion',
			'diferencias_comunidades', 'faltan_recursos', 'derechos_sin_capacidad',
			'no_se_mide_corrige', 'otra_causa', 'sin_informacion'
		)
	),
	-- Paso 3: hasta 3 medidas reales del plan, en el orden elegido.
	prioritized_measure_ids uuid[] not null default '{}',
	-- Paso 4: dos compromisos reales (pueden coincidir).
	commitment_most_urgent_id uuid references public.topic_commitments (id) on delete set null,
	commitment_most_difficult_id uuid references public.topic_commitments (id) on delete set null,
	-- Paso 5: texto libre opcional y privado, nunca publicado.
	missing_improvement text check (missing_improvement is null or char_length(missing_improvement) <= 1000),
	-- Paso 6: contexto territorial voluntario.
	community text check (community is null or char_length(community) <= 120),
	area_type text check (
		area_type is null or area_type in ('rural', 'ciudad_mediana', 'gran_area_urbana', 'prefiere_no_responder')
	),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (round_id, user_id)
);

comment on table public.concern_listening_survey_responses is
	'Respuesta de una sola tirada a una escucha abierta tipo encuesta (p. ej. Escucha abierta sobre sanidad): una fila activa por usuario y ronda. Nunca pública a nivel individual — la lectura pública pasa solo por funciones de agregado.';
comment on column public.concern_listening_survey_responses.missing_improvement is
	'"¿Qué cambio crees que falta?" — privado, nunca se publica automáticamente ni se usa como testimonio público.';

alter table public.concern_listening_survey_responses enable row level security;

create index concern_listening_survey_responses_round_id_idx
	on public.concern_listening_survey_responses (round_id);

create trigger concern_listening_survey_responses_set_updated_at
	before update on public.concern_listening_survey_responses
	for each row
	execute function public.set_updated_at();

-- Cada persona solo puede leer su propia respuesta (o staff). Nunca hay
-- política de lectura pública sobre esta tabla: los resultados públicos
-- se sirven exclusivamente mediante funciones de agregado más abajo.
create policy "concern_listening_survey_responses_select_own_or_staff"
	on public.concern_listening_survey_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- Sin políticas de INSERT/UPDATE/DELETE directas: toda escritura pasa por
-- `set_concern_listening_survey_response` (SECURITY DEFINER), igual que
-- el resto de participación de Convoca.

-- ---------------------------------------------------------------------------
-- 2. Función de escritura (SECURITY DEFINER, auth.uid() interno)
-- ---------------------------------------------------------------------------

create or replace function public.set_concern_listening_survey_response(
	p_round_id uuid,
	p_problems text[],
	p_other_problem_text text default null,
	p_main_cause text default null,
	p_prioritized_measure_ids uuid[] default '{}',
	p_commitment_most_urgent_id uuid default null,
	p_commitment_most_difficult_id uuid default null,
	p_missing_improvement text default null,
	p_community text default null,
	p_area_type text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
	v_count integer;
	v_distinct_count integer;
	v_round_category text;
	v_valid_problem_codes text[] := array[
		'primaria_dificil_acceso', 'esperas_especialistas_pruebas', 'esperas_operaciones',
		'falta_continuidad', 'acceso_salud_mental', 'falta_profesionales', 'atencion_rural',
		'coordinacion_social', 'prevencion_bucodental', 'diferencias_territoriales',
		'falta_informacion', 'otro'
	];
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	select category into v_round_category
	from public.concern_listening_rounds
	where id = p_round_id and status = 'open';
	if v_round_category is null then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	-- Paso 1: máximo 3 problemas, códigos válidos, sin duplicados.
	v_count := coalesce(array_length(p_problems, 1), 0);
	if v_count > 3 then
		raise exception 'Puedes elegir como máximo tres problemas.';
	end if;
	if v_count > 0 then
		select count(distinct c) into v_distinct_count from unnest(p_problems) as c;
		if v_distinct_count <> v_count then
			raise exception 'No puedes elegir el mismo problema más de una vez.';
		end if;
		if exists (select 1 from unnest(p_problems) as c where not (c = any (v_valid_problem_codes))) then
			raise exception 'Selecciona problemas válidos.';
		end if;
	end if;
	if not ('otro' = any (p_problems)) and p_other_problem_text is not null and char_length(trim(p_other_problem_text)) > 0 then
		p_other_problem_text := null;
	end if;
	if p_other_problem_text is not null and char_length(p_other_problem_text) > 150 then
		raise exception 'El texto del otro problema es demasiado largo.';
	end if;

	-- Paso 2: causa principal, código válido.
	if p_main_cause is not null and p_main_cause not in (
		'faltan_profesionales', 'mala_distribucion', 'temporalidad', 'problemas_organizacion',
		'diferencias_comunidades', 'faltan_recursos', 'derechos_sin_capacidad',
		'no_se_mide_corrige', 'otra_causa', 'sin_informacion'
	) then
		raise exception 'Selecciona una causa válida.';
	end if;

	-- Paso 3: máximo 3 medidas, sin duplicados, deben ser medidas reales y
	-- publicadas de un tema de la misma categoría que la ronda.
	v_count := coalesce(array_length(p_prioritized_measure_ids, 1), 0);
	if v_count > 3 then
		raise exception 'Puedes elegir como máximo tres medidas.';
	end if;
	if v_count > 0 then
		select count(distinct m) into v_distinct_count from unnest(p_prioritized_measure_ids) as m;
		if v_distinct_count <> v_count then
			raise exception 'No puedes elegir la misma medida más de una vez.';
		end if;
		if exists (
			select 1
			from unnest(p_prioritized_measure_ids) as measure_id
			where not exists (
				select 1
				from public.topic_measures tm
				join public.topics t on t.id = tm.topic_id
				where tm.id = measure_id
				and tm.is_published
				and t.category = v_round_category
				and t.status in ('open', 'reviewed')
			)
		) then
			raise exception 'Selecciona medidas válidas del plan.';
		end if;
	end if;

	-- Paso 4: compromisos reales del mismo tema/categoría, si se indican.
	if p_commitment_most_urgent_id is not null and not exists (
		select 1 from public.topic_commitments tc
		join public.topics t on t.id = tc.topic_id
		where tc.id = p_commitment_most_urgent_id and t.category = v_round_category and t.status in ('open', 'reviewed')
	) then
		raise exception 'Selecciona un compromiso válido.';
	end if;
	if p_commitment_most_difficult_id is not null and not exists (
		select 1 from public.topic_commitments tc
		join public.topics t on t.id = tc.topic_id
		where tc.id = p_commitment_most_difficult_id and t.category = v_round_category and t.status in ('open', 'reviewed')
	) then
		raise exception 'Selecciona un compromiso válido.';
	end if;

	-- Paso 5: texto libre opcional.
	if p_missing_improvement is not null and char_length(p_missing_improvement) > 1000 then
		raise exception 'El texto es demasiado largo.';
	end if;

	-- Paso 6: contexto voluntario.
	if p_community is not null and char_length(p_community) > 120 then
		raise exception 'El texto de comunidad es demasiado largo.';
	end if;
	if p_area_type is not null and p_area_type not in ('rural', 'ciudad_mediana', 'gran_area_urbana', 'prefiere_no_responder') then
		raise exception 'Selecciona un tipo de entorno válido.';
	end if;

	insert into public.concern_listening_survey_responses (
		round_id, user_id, problems, other_problem_text, main_cause,
		prioritized_measure_ids, commitment_most_urgent_id, commitment_most_difficult_id,
		missing_improvement, community, area_type
	) values (
		p_round_id, v_user_id, coalesce(p_problems, '{}'), nullif(trim(p_other_problem_text), ''), p_main_cause,
		coalesce(p_prioritized_measure_ids, '{}'), p_commitment_most_urgent_id, p_commitment_most_difficult_id,
		nullif(trim(p_missing_improvement), ''), nullif(trim(p_community), ''), p_area_type
	)
	on conflict (round_id, user_id) do update set
		problems = excluded.problems,
		other_problem_text = excluded.other_problem_text,
		main_cause = excluded.main_cause,
		prioritized_measure_ids = excluded.prioritized_measure_ids,
		commitment_most_urgent_id = excluded.commitment_most_urgent_id,
		commitment_most_difficult_id = excluded.commitment_most_difficult_id,
		missing_improvement = excluded.missing_improvement,
		community = excluded.community,
		area_type = excluded.area_type,
		updated_at = now();
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Funciones de lectura agregada (nunca exponen respuestas individuales)
-- ---------------------------------------------------------------------------

create or replace function public.get_concern_listening_survey_summary(p_round_id uuid)
returns table (
	dimension text,
	code text,
	response_count bigint
)
language sql
stable
security definer
set search_path to 'public'
as $function$
	select 'problem', p, count(*)
	from public.concern_listening_survey_responses, unnest(problems) as p
	where round_id = p_round_id
	group by p
	union all
	select 'main_cause', main_cause, count(*)
	from public.concern_listening_survey_responses
	where round_id = p_round_id and main_cause is not null
	group by main_cause
	union all
	select 'prioritized_measure', measure_id::text, count(*)
	from public.concern_listening_survey_responses, unnest(prioritized_measure_ids) as measure_id
	where round_id = p_round_id
	group by measure_id
	union all
	select 'commitment_most_urgent', commitment_most_urgent_id::text, count(*)
	from public.concern_listening_survey_responses
	where round_id = p_round_id and commitment_most_urgent_id is not null
	group by commitment_most_urgent_id
	union all
	select 'commitment_most_difficult', commitment_most_difficult_id::text, count(*)
	from public.concern_listening_survey_responses
	where round_id = p_round_id and commitment_most_difficult_id is not null
	group by commitment_most_difficult_id;
$function$;

create or replace function public.get_concern_listening_survey_total(p_round_id uuid)
returns bigint
language sql
stable
security definer
set search_path to 'public'
as $function$
	select count(*) from public.concern_listening_survey_responses where round_id = p_round_id;
$function$;

-- Desglose territorial: solo comunidades con al menos `p_min_threshold`
-- respuestas (protección de grupos pequeños). Nunca incluye texto libre.
create or replace function public.get_concern_listening_survey_territory_breakdown(
	p_round_id uuid,
	p_min_threshold integer default 30
)
returns table (
	community text,
	response_count bigint
)
language sql
stable
security definer
set search_path to 'public'
as $function$
	select community, count(*)
	from public.concern_listening_survey_responses
	where round_id = p_round_id and community is not null
	group by community
	having count(*) >= p_min_threshold;
$function$;
