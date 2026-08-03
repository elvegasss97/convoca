-- 0034_pulso_temas_sanidad_generalizacion.sql
--
-- Generaliza el modelo de participación y de temas para admitir Plan
-- Sanidad 2036 sin crear tablas paralelas ni tocar el contenido o la
-- participación ya desplegados de Plan Vivienda 2036. Todo aditivo y no
-- destructivo: ninguna fila existente pierde datos ni cambia de valor.
--
-- Incompatibilidad real encontrada: `general_participation_responses`
-- exige `investment_opinion` y `pace_preference` (preguntas específicas
-- del plan de vivienda: valoración de la inversión y ritmo de aplicación).
-- El modelo de participación general de Sanidad, aprobado en el encargo,
-- es más simple (solo posición general en 3 opciones) y no tiene
-- equivalente para esas dos preguntas. Se relajan a opcionales tanto en
-- la tabla como en la función; Vivienda sigue enviándolas exactamente
-- igual que hasta ahora, así que su comportamiento no cambia.
--
-- Además:
--   - El comentario privado de valoración por medida se limita a 400
--     caracteres, pero Sanidad exige hasta 500. Se amplía el límite
--     (superconjunto: ningún dato existente se ve afectado).
--   - No existe un campo para la "salvaguarda" de una medida (qué no
--     contará como éxito), contenido que el encargo de Sanidad pide
--     explícitamente por medida. Se añade `topic_measures.safeguard`,
--     nulable.
--   - No existe un campo para explicar la gobernanza de un tema (quién
--     puede hacer qué). Se añade `topics.governance_narrative`, nulable.

-- ---------------------------------------------------------------------------
-- 1. Valoración general: investment_opinion y pace_preference opcionales
-- ---------------------------------------------------------------------------

alter table public.general_participation_responses
	alter column investment_opinion drop not null,
	alter column pace_preference drop not null;

create or replace function public.set_general_participation_response(
	p_round_id uuid,
	p_general_position text,
	p_investment_opinion text default null,
	p_pace_preference text default null,
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
	if p_investment_opinion is not null and p_investment_opinion not in ('insuficiente', 'adecuada', 'excesiva', 'sin_info') then
		raise exception 'Selecciona una valoración de inversión válida.';
	end if;
	if p_pace_preference is not null and p_pace_preference not in (
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

-- ---------------------------------------------------------------------------
-- 2. Comentario de valoración por medida: 400 → 500 caracteres
-- ---------------------------------------------------------------------------

alter table public.measure_participation_responses
	drop constraint measure_participation_responses_comment_check;
alter table public.measure_participation_responses
	add constraint measure_participation_responses_comment_check
	check (comment is null or char_length(comment) <= 500);

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

	-- Motivos estructurados: contenido propio de Vivienda. Si se pasa
	-- p_reason_code (Vivienda), se valida contra su lista; si no se pasa
	-- (Sanidad, que solo usa el comentario libre), no se exige nada.
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
	if p_comment is not null and char_length(p_comment) > 500 then
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

-- ---------------------------------------------------------------------------
-- 3. Contenido adicional por medida y por tema
-- ---------------------------------------------------------------------------

alter table public.topic_measures add column safeguard text;
comment on column public.topic_measures.safeguard is
	'Qué no contará como éxito / salvaguarda de la medida. Nulo mientras no se proporcione ese contenido.';

alter table public.topics add column governance_narrative text;
comment on column public.topics.governance_narrative is
	'Explicación de qué administración puede hacer qué (competencia estatal directa, acuerdo con comunidades, ejecución autonómica, objetivo sujeto a memoria económica). Nulo mientras no se proporcione.';
