-- 0031_pulso_participacion_vivienda.sql
--
-- Primera versión funcional de participación ciudadana sobre un tema
-- (Plan Vivienda 2036 será el primer caso real). Todo aditivo: no borra ni
-- reescribe ninguna fila ni columna existente. Sin contenido político, sin
-- filas semilla, sin participantes de demostración — igual que 0026-0030.
--
-- Reutiliza deliberadamente lo ya construido en vez de imponer nomenclatura
-- nueva:
--   - `topic_measure_alternatives` se amplía para servir también como
--     "propuesta desarrollada" (con nuevas columnas y estados), en vez de
--     crear una tabla paralela. El flujo simple ya existente (alternativa
--     rápida por medida, o modificación general del tema) sigue
--     funcionando exactamente igual: la restricción de estado admite la
--     UNIÓN de los valores antiguos y nuevos, y el trigger de inserción
--     distingue ambos flujos por si `round_id` está presente.
--   - El patrón `measure_responses` + `set_measure_response` +
--     `get_measure_results` (0027) se repite para la nueva participación
--     por medida (posición/motivo/urgencia/cambio rápido), con las mismas
--     garantías: función `SECURITY DEFINER` que lee `auth.uid()`
--     internamente, restricción `UNIQUE` para que cambiar una respuesta
--     actualice la fila existente en vez de duplicarla.
--
-- Qué crea:
--   1. `participation_rounds` — ronda de participación ligada a un tema y
--      a una versión concreta de su contenido. Empieza en `draft`; su
--      apertura pública es una acción explícita desde el panel.
--   2. `measure_participation_responses` — posición, motivo, comentario
--      privado, urgencia y cambio rápido por medida, una fila activa por
--      usuario/medida/ronda.
--   3. `general_participation_responses` — valoración general del plan
--      (posición, inversión, ritmo, problema no abordado), una fila activa
--      por usuario/ronda.
--   4. `response_priorities` — selección ordenada de hasta 3 medidas
--      prioritarias por usuario/ronda.
--   5. `participant_contexts` — contexto voluntario (territorio, situación
--      de vivienda), nunca público a nivel individual.
--   6. Ampliación de `topic_measure_alternatives` para la "propuesta
--      desarrollada": nuevas columnas, nuevos estados, política de
--      actualización propia mientras la propuesta sigue en borrador.
--   7. Funciones `SECURITY DEFINER` de escritura (una respuesta activa,
--      validación de longitudes y valores permitidos en servidor) y de
--      lectura agregada (nunca exponen respuestas individuales).

-- ---------------------------------------------------------------------------
-- 1. participation_rounds
-- ---------------------------------------------------------------------------

create table public.participation_rounds (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	version_label text not null,
	status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed')),
	opens_at timestamptz,
	closes_at timestamptz,
	created_by uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.participation_rounds is
	'Ronda de participación ciudadana ligada a una versión concreta de un tema. Empieza en draft; abrirla al público es una acción explícita del panel, nunca automática.';

alter table public.participation_rounds enable row level security;

create index participation_rounds_topic_id_idx on public.participation_rounds (topic_id);

create trigger participation_rounds_set_updated_at
	before update on public.participation_rounds
	for each row
	execute function public.set_updated_at();

create policy "participation_rounds_select_public_or_staff"
	on public.participation_rounds for select
	to anon, authenticated
	using (status <> 'draft' or public.is_moderator_or_admin());

create policy "participation_rounds_write_staff"
	on public.participation_rounds for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 2. measure_participation_responses
-- ---------------------------------------------------------------------------

create table public.measure_participation_responses (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.participation_rounds (id) on delete cascade,
	measure_id uuid not null references public.topic_measures (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	position_value text not null check (position_value in ('favor', 'con_cambios', 'en_contra', 'mas_info')),
	reason_code text,
	reason_other text check (reason_other is null or char_length(reason_other) <= 200),
	comment text check (comment is null or char_length(comment) <= 400),
	urgency text check (
		urgency is null
		or urgency in ('inmediata', 'primeros_anos', 'medio_plazo', 'no_aplicar', 'sin_opinion')
	),
	quick_change text check (quick_change is null or char_length(quick_change) <= 400),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (round_id, measure_id, user_id)
);

comment on table public.measure_participation_responses is
	'Respuesta activa de un usuario a la participación de una medida concreta dentro de una ronda: posición, motivo, urgencia, comentario privado y cambio rápido. Una fila por usuario/medida/ronda — cambiarla actualiza la fila, nunca duplica.';
comment on column public.measure_participation_responses.comment is
	'Explicación opcional, privada: nunca se expone en resultados públicos como texto individual.';
comment on column public.measure_participation_responses.quick_change is
	'"¿Qué cambiarías?" en texto breve. Privado, no se publica automáticamente.';

alter table public.measure_participation_responses enable row level security;

create index measure_participation_responses_round_measure_idx
	on public.measure_participation_responses (round_id, measure_id);

create trigger measure_participation_responses_set_updated_at
	before update on public.measure_participation_responses
	for each row
	execute function public.set_updated_at();

create policy "measure_participation_responses_select_own_or_staff"
	on public.measure_participation_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- Sin políticas de INSERT/UPDATE/DELETE directas: toda escritura pasa por
-- `set_measure_participation_response` (SECURITY DEFINER), igual que
-- `measure_responses`/`set_measure_response` en 0027.

-- ---------------------------------------------------------------------------
-- 3. general_participation_responses
-- ---------------------------------------------------------------------------

create table public.general_participation_responses (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.participation_rounds (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	general_position text not null check (general_position in ('favor', 'con_cambios', 'en_contra', 'mas_info')),
	investment_opinion text not null check (investment_opinion in ('insuficiente', 'adecuada', 'excesiva', 'sin_info')),
	pace_preference text not null check (
		pace_preference in (
			'urgentes_primero', 'progresiva_inicial', 'gradual_decada', 'no_apoyo', 'sin_opinion'
		)
	),
	unaddressed_problem text check (unaddressed_problem is null or char_length(unaddressed_problem) <= 600),
	measures_considered_count integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (round_id, user_id)
);

comment on table public.general_participation_responses is
	'Valoración general del plan (cierre de participación), una fila activa por usuario/ronda. measures_considered_count se calcula en servidor a partir de las medidas realmente valoradas, nunca se confía en el valor enviado por el cliente.';

alter table public.general_participation_responses enable row level security;

create trigger general_participation_responses_set_updated_at
	before update on public.general_participation_responses
	for each row
	execute function public.set_updated_at();

create policy "general_participation_responses_select_own_or_staff"
	on public.general_participation_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 4. response_priorities
-- ---------------------------------------------------------------------------

create table public.response_priorities (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.participation_rounds (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	measure_id uuid not null references public.topic_measures (id) on delete cascade,
	rank smallint not null check (rank in (1, 2, 3)),
	created_at timestamptz not null default now(),
	unique (round_id, user_id, measure_id),
	unique (round_id, user_id, rank)
);

comment on table public.response_priorities is
	'Selección ordenada de hasta 3 medidas prioritarias por usuario/ronda. Las dos restricciones UNIQUE impiden elegir la misma medida dos veces o repetir un puesto.';

alter table public.response_priorities enable row level security;

create index response_priorities_round_id_idx on public.response_priorities (round_id);

create policy "response_priorities_select_own_or_staff"
	on public.response_priorities for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 5. participant_contexts
-- ---------------------------------------------------------------------------

create table public.participant_contexts (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.participation_rounds (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	community text check (community is null or char_length(community) <= 120),
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

comment on table public.participant_contexts is
	'Contexto voluntario del participante (territorio, situación de vivienda). Nunca se expone públicamente a nivel individual ni en desgloses que puedan identificar a grupos pequeños.';

alter table public.participant_contexts enable row level security;

create trigger participant_contexts_set_updated_at
	before update on public.participant_contexts
	for each row
	execute function public.set_updated_at();

create policy "participant_contexts_select_own_or_staff"
	on public.participant_contexts for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 6. topic_measure_alternatives — ampliación para "propuesta desarrollada"
-- ---------------------------------------------------------------------------

alter table public.topic_measure_alternatives
	add column round_id uuid references public.participation_rounds (id) on delete set null,
	add column measure_part text,
	add column reason text,
	add column expected_effect text,
	add column acknowledged_risks text,
	add column source_url text,
	add column editorial_response text,
	add column linked_version_label text;

comment on column public.topic_measure_alternatives.round_id is
	'null = flujo simple ya existente (alternativa rápida o modificación general), sin cambios de comportamiento. No nulo = "propuesta desarrollada" de la nueva participación, ligada a una ronda concreta.';
comment on column public.topic_measure_alternatives.measure_part is '"Parte de la medida que modificaría" (propuesta desarrollada).';
comment on column public.topic_measure_alternatives.reason is '"Motivo" del cambio propuesto (propuesta desarrollada).';
comment on column public.topic_measure_alternatives.expected_effect is '"Efecto esperado" (propuesta desarrollada).';
comment on column public.topic_measure_alternatives.acknowledged_risks is '"Riesgos que reconoce" quien propone (propuesta desarrollada).';
comment on column public.topic_measure_alternatives.editorial_response is 'Respuesta editorial pública de Convoca ante esta propuesta, cuando exista.';
comment on column public.topic_measure_alternatives.linked_version_label is 'Versión del tema con la que se relaciona la decisión editorial (incorporada/no incorporada), para el bloque "Cómo influyó la participación".';

-- Unión de los estados antiguos (pending/approved/rejected, flujo simple ya
-- existente) y los nuevos (propuesta desarrollada), para no romper el
-- comportamiento ya construido.
alter table public.topic_measure_alternatives drop constraint topic_measure_alternatives_status_check;
alter table public.topic_measure_alternatives add constraint topic_measure_alternatives_status_check
	check (
		status in (
			'pending', 'approved', 'rejected',
			'draft', 'enviada', 'pendiente_revision', 'necesita_cambios', 'publicada',
			'en_estudio', 'incorporada_total', 'incorporada_parcial', 'no_incorporada', 'archivada'
		)
	);

create index topic_measure_alternatives_round_id_idx on public.topic_measure_alternatives (round_id);

-- El trigger de inserción distingue ambos flujos por round_id: el flujo
-- simple (round_id null) conserva exactamente su comportamiento previo
-- (siempre 'pending'); el flujo nuevo admite 'draft' o fuerza 'enviada'.
create or replace function public.enforce_topic_measure_alternative_insert()
returns trigger
language plpgsql
as $function$
begin
	new.reviewer_note := null;
	new.reviewed_by := null;
	new.reviewed_at := null;
	if new.round_id is null then
		new.status := 'pending';
	else
		new.status := case when new.status = 'draft' then 'draft' else 'enviada' end;
	end if;
	return new;
end;
$function$;

-- Quien propone puede editar su propia propuesta desarrollada mientras siga
-- en borrador, y transicionarla ella misma a "enviada" (envío a
-- moderación). Una vez enviada, solo el personal autorizado puede
-- cambiarla (política topic_measure_alternatives_update_staff, ya
-- existente). El flujo simple (round_id null) nunca ha permitido editar
-- tras crear, y esta política no lo cambia.
create policy "topic_measure_alternatives_update_own_draft"
	on public.topic_measure_alternatives for update
	to authenticated
	using (proposer_user_id = auth.uid() and round_id is not null and status = 'draft')
	with check (proposer_user_id = auth.uid() and round_id is not null and status in ('draft', 'enviada'));

drop policy "topic_measure_alternatives_select_approved_own_or_staff" on public.topic_measure_alternatives;
create policy "topic_measure_alternatives_select_public_own_or_staff"
	on public.topic_measure_alternatives for select
	to anon, authenticated
	using (
		status in ('approved', 'publicada', 'incorporada_total', 'incorporada_parcial', 'no_incorporada')
		or (auth.uid() is not null and proposer_user_id = auth.uid())
		or public.is_moderator_or_admin()
	);

-- ---------------------------------------------------------------------------
-- 7. Funciones de escritura (SECURITY DEFINER, auth.uid() interno)
-- ---------------------------------------------------------------------------

create or replace function public.set_measure_participation_response(
	p_round_id uuid,
	p_measure_id uuid,
	p_position text,
	p_reason_code text default null,
	p_reason_other text default null,
	p_comment text default null,
	p_urgency text default null,
	p_quick_change text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
	v_valid_reason_codes text[];
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	if p_position is null or p_position not in ('favor', 'con_cambios', 'en_contra', 'mas_info') then
		raise exception 'Selecciona una posición válida.';
	end if;

	if p_urgency is not null
		and p_urgency not in ('inmediata', 'primeros_anos', 'medio_plazo', 'no_aplicar', 'sin_opinion')
	then
		raise exception 'Selecciona una urgencia válida.';
	end if;

	v_valid_reason_codes := case p_position
		when 'favor' then array[
			'mejora_acceso', 'bien_orientada', 'viable', 'inversion_adecuada', 'necesidad_urgente', 'otro'
		]
		when 'con_cambios' then array[
			'cambiar_presupuesto', 'cambiar_plazos', 'cambiar_beneficiarios', 'anadir_controles',
			'cambiar_ambito_territorial', 'cambiar_funcionamiento', 'otro'
		]
		when 'en_contra' then array[
			'coste_excesivo', 'dificil_aplicar', 'efectos_negativos', 'no_justa', 'faltan_pruebas',
			'no_resuelve_problema', 'otro'
		]
		when 'mas_info' then array[
			'no_entiendo_funcionamiento', 'faltan_datos', 'faltan_fuentes', 'costes_no_claros',
			'riesgos_no_claros', 'consecuencias_no_claras', 'otro'
		]
	end;

	if p_reason_code is not null and not (p_reason_code = any (v_valid_reason_codes)) then
		raise exception 'Motivo no válido para esta posición.';
	end if;

	if p_reason_other is not null and char_length(p_reason_other) > 200 then
		raise exception 'El motivo adicional es demasiado largo.';
	end if;
	if p_comment is not null and char_length(p_comment) > 400 then
		raise exception 'El comentario es demasiado largo.';
	end if;
	if p_quick_change is not null and char_length(p_quick_change) > 400 then
		raise exception 'El cambio rápido es demasiado largo.';
	end if;

	if not exists (
		select 1
		from public.participation_rounds r
		join public.topic_measures m on m.topic_id = r.topic_id
		join public.topics t on t.id = r.topic_id
		where r.id = p_round_id
		and m.id = p_measure_id
		and r.status = 'open'
		and m.is_published
		and t.status in ('open', 'reviewed')
	) then
		raise exception 'Esta ronda de participación no admite respuestas en este momento.';
	end if;

	insert into public.measure_participation_responses
		(round_id, measure_id, user_id, position_value, reason_code, reason_other, comment, urgency, quick_change)
	values
		(p_round_id, p_measure_id, v_user_id, p_position, p_reason_code, nullif(trim(p_reason_other), ''), nullif(trim(p_comment), ''), p_urgency, nullif(trim(p_quick_change), ''))
	on conflict (round_id, measure_id, user_id)
	do update set
		position_value = excluded.position_value,
		reason_code = excluded.reason_code,
		reason_other = excluded.reason_other,
		comment = excluded.comment,
		urgency = excluded.urgency,
		quick_change = excluded.quick_change,
		updated_at = now();
end;
$function$;

create or replace function public.set_general_participation_response(
	p_round_id uuid,
	p_general_position text,
	p_investment_opinion text,
	p_pace_preference text,
	p_unaddressed_problem text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
	v_considered_count integer;
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	if p_general_position is null or p_general_position not in ('favor', 'con_cambios', 'en_contra', 'mas_info') then
		raise exception 'Selecciona una posición válida.';
	end if;
	if p_investment_opinion is null or p_investment_opinion not in ('insuficiente', 'adecuada', 'excesiva', 'sin_info') then
		raise exception 'Selecciona una valoración de inversión válida.';
	end if;
	if p_pace_preference is null or p_pace_preference not in (
		'urgentes_primero', 'progresiva_inicial', 'gradual_decada', 'no_apoyo', 'sin_opinion'
	) then
		raise exception 'Selecciona un ritmo de aplicación válido.';
	end if;
	if p_unaddressed_problem is not null and char_length(p_unaddressed_problem) > 600 then
		raise exception 'El texto es demasiado largo.';
	end if;

	if not exists (
		select 1 from public.participation_rounds r where r.id = p_round_id and r.status = 'open'
	) then
		raise exception 'Esta ronda de participación no admite respuestas en este momento.';
	end if;

	select count(distinct measure_id) into v_considered_count
	from public.measure_participation_responses
	where round_id = p_round_id and user_id = v_user_id;

	insert into public.general_participation_responses
		(round_id, user_id, general_position, investment_opinion, pace_preference, unaddressed_problem, measures_considered_count)
	values
		(p_round_id, v_user_id, p_general_position, p_investment_opinion, p_pace_preference, nullif(trim(p_unaddressed_problem), ''), v_considered_count)
	on conflict (round_id, user_id)
	do update set
		general_position = excluded.general_position,
		investment_opinion = excluded.investment_opinion,
		pace_preference = excluded.pace_preference,
		unaddressed_problem = excluded.unaddressed_problem,
		measures_considered_count = excluded.measures_considered_count,
		updated_at = now();
end;
$function$;

create or replace function public.set_response_priorities(p_round_id uuid, p_measure_ids uuid[])
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

	v_count := coalesce(array_length(p_measure_ids, 1), 0);
	if v_count > 3 then
		raise exception 'Puedes elegir como máximo tres medidas.';
	end if;

	select count(distinct m) into v_distinct_count from unnest(p_measure_ids) as m;
	if v_distinct_count <> v_count then
		raise exception 'No puedes elegir la misma medida más de una vez.';
	end if;

	if not exists (select 1 from public.participation_rounds r where r.id = p_round_id and r.status = 'open') then
		raise exception 'Esta ronda de participación no admite respuestas en este momento.';
	end if;

	if v_count > 0 and not (
		select bool_and(m.is_published and m.topic_id = r.topic_id)
		from unnest(p_measure_ids) with ordinality as u(measure_id, ord)
		join public.topic_measures m on m.id = u.measure_id
		join public.participation_rounds r on r.id = p_round_id
	) then
		raise exception 'Una de las medidas seleccionadas no es válida.';
	end if;

	delete from public.response_priorities where round_id = p_round_id and user_id = v_user_id;

	if v_count > 0 then
		insert into public.response_priorities (round_id, user_id, measure_id, rank)
		select p_round_id, v_user_id, u.measure_id, u.ord::smallint
		from unnest(p_measure_ids) with ordinality as u(measure_id, ord);
	end if;
end;
$function$;

create or replace function public.set_participant_context(
	p_round_id uuid,
	p_community text default null,
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
	if p_housing_situation is not null and p_housing_situation not in (
		'alquiler', 'propiedad', 'buscando', 'con_familiares', 'vivienda_publica', 'otra', 'prefiere_no_responder'
	) then
		raise exception 'Selecciona una situación válida.';
	end if;

	if not exists (select 1 from public.participation_rounds r where r.id = p_round_id and r.status = 'open') then
		raise exception 'Esta ronda de participación no admite respuestas en este momento.';
	end if;

	insert into public.participant_contexts (round_id, user_id, community, housing_situation)
	values (p_round_id, v_user_id, nullif(trim(p_community), ''), p_housing_situation)
	on conflict (round_id, user_id)
	do update set
		community = excluded.community,
		housing_situation = excluded.housing_situation,
		updated_at = now();
end;
$function$;

-- ---------------------------------------------------------------------------
-- 8. Funciones de lectura agregada (nunca exponen respuestas individuales)
-- ---------------------------------------------------------------------------

create or replace function public.get_measure_position_counts(p_round_id uuid, p_measure_ids uuid[])
returns table (measure_id uuid, position_value text, response_count bigint)
language sql
security definer
stable
set search_path to 'public'
as $function$
	select r.measure_id, r.position_value, count(*)
	from public.measure_participation_responses r
	where r.round_id = p_round_id and r.measure_id = any (p_measure_ids)
	group by r.measure_id, r.position_value;
$function$;

create or replace function public.get_measure_urgency_counts(p_round_id uuid, p_measure_ids uuid[])
returns table (measure_id uuid, urgency text, response_count bigint)
language sql
security definer
stable
set search_path to 'public'
as $function$
	select r.measure_id, r.urgency, count(*)
	from public.measure_participation_responses r
	where r.round_id = p_round_id and r.measure_id = any (p_measure_ids) and r.urgency is not null
	group by r.measure_id, r.urgency;
$function$;

create or replace function public.get_measure_reason_counts(p_round_id uuid, p_measure_ids uuid[])
returns table (measure_id uuid, reason_code text, response_count bigint)
language sql
security definer
stable
set search_path to 'public'
as $function$
	select r.measure_id, r.reason_code, count(*)
	from public.measure_participation_responses r
	where r.round_id = p_round_id and r.measure_id = any (p_measure_ids) and r.reason_code is not null
	group by r.measure_id, r.reason_code;
$function$;

create or replace function public.get_general_participation_results(p_round_id uuid)
returns table (dimension text, value text, response_count bigint)
language sql
security definer
stable
set search_path to 'public'
as $function$
	select 'general_position', general_position, count(*) from public.general_participation_responses
	where round_id = p_round_id group by general_position
	union all
	select 'investment_opinion', investment_opinion, count(*) from public.general_participation_responses
	where round_id = p_round_id group by investment_opinion
	union all
	select 'pace_preference', pace_preference, count(*) from public.general_participation_responses
	where round_id = p_round_id group by pace_preference;
$function$;

create or replace function public.get_priority_results(p_round_id uuid)
returns table (measure_id uuid, times_top3 bigint, avg_rank numeric)
language sql
security definer
stable
set search_path to 'public'
as $function$
	select measure_id, count(*), round(avg(rank), 2)
	from public.response_priorities
	where round_id = p_round_id
	group by measure_id;
$function$;

create or replace function public.get_participation_summary(p_round_id uuid)
returns table (
	unique_participants bigint,
	total_measure_responses bigint,
	total_general_responses bigint,
	proposals_received bigint,
	proposals_published bigint,
	last_updated_at timestamptz
)
language sql
security definer
stable
set search_path to 'public'
as $function$
	select
		(select count(distinct user_id) from (
			select user_id from public.measure_participation_responses where round_id = p_round_id
			union
			select user_id from public.general_participation_responses where round_id = p_round_id
		) u),
		(select count(*) from public.measure_participation_responses where round_id = p_round_id),
		(select count(*) from public.general_participation_responses where round_id = p_round_id),
		(select count(*) from public.topic_measure_alternatives
			where round_id = p_round_id and status not in ('draft')),
		(select count(*) from public.topic_measure_alternatives
			where round_id = p_round_id and status in ('publicada', 'incorporada_total', 'incorporada_parcial', 'no_incorporada')),
		greatest(
			(select max(updated_at) from public.measure_participation_responses where round_id = p_round_id),
			(select max(updated_at) from public.general_participation_responses where round_id = p_round_id)
		);
$function$;
