-- ============================================================================
-- Rollback de supabase/migrations/0044_post_review_abuse_and_visibility_hardening.sql
--
-- Revierte exactamente los 3 cambios de esa migración (advisory lock,
-- REVOKE ALL de ACL y normalización de p_community incluidos), en orden
-- inverso, hasta el estado exacto posterior a 0043 (mismos textos de
-- función, verificados carácter a carácter contra el código anterior a
-- 0044).
--
-- Probado en 0044-R2 (entorno desechable, antes de aplicar 0044 en ningún
-- entorno real): PRE (hasta 0043) -> aplicar 0044 -> verificar cambios ->
-- aplicar este rollback -> comparar contra PRE. Resultado: diff de esquema
-- vacío (byte a byte, incluidos los comentarios internos de la función).
-- Ver seguridad/44_revision_0044_r2.md §7 para el detalle completo.
--
-- Nombre de archivo mantenido con el sufijo "_candidata" por continuidad
-- con las referencias cruzadas de seguridad/41, /42 y /44 — es, desde la
-- aplicación real de 0044, el rollback vigente de esa migración, no un
-- documento histórico superado.
-- ============================================================================

-- ----------------------------------------------------------------------
-- §3 (revertir) — rate limiting DB-side, ACL incluida
-- ----------------------------------------------------------------------

drop trigger if exists enforce_concern_proposals_rate_limit on public.concern_proposals;
drop trigger if exists enforce_channel_reports_rate_limit on public.channel_reports;
drop trigger if exists enforce_reports_rate_limit on public.reports;

drop function if exists public.enforce_write_rate_limit();

select cron.unschedule('purge-old-write-rate-limits')
where exists (select 1 from cron.job where jobname = 'purge-old-write-rate-limits');

drop function if exists public.purge_old_write_rate_limits();

-- El REVOKE ALL de 0044-R2 no necesita una reversión explícita de "GRANT":
-- al hacer DROP TABLE la tabla entera desaparece junto con su ACL. No
-- existía ningún GRANT previo a 0044 que restaurar (la tabla no existía
-- antes de esta migración candidata).
drop table if exists public.write_rate_limits;

-- ----------------------------------------------------------------------
-- §2 (revertir) — set_concern_listening_survey_response sin catálogo de p_community
-- ----------------------------------------------------------------------

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

-- ----------------------------------------------------------------------
-- §1 (revertir) — get_attendance_counts sin filtro de estado
-- ----------------------------------------------------------------------

create or replace function public.get_attendance_counts(p_event_ids uuid[] default null)
returns table (event_id uuid, going_count bigint, interested_count bigint)
language sql
stable
security definer
set search_path = public
as $$
	select
		ar.event_id,
		count(*) filter (where ar.response = 'going') as going_count,
		count(*) filter (where ar.response = 'interested') as interested_count
	from public.attendance_responses ar
	where p_event_ids is null or ar.event_id = any(p_event_ids)
	group by ar.event_id;
$$;

comment on function public.get_attendance_counts is
	'Contadores agregados de asistencia (ESTIMACIONES, nunca listas de asistentes). Reemplaza a la vista event_attendance_counts (retirada por el hallazgo ERROR security_definer_view).';

-- ============================================================================
-- Fin del rollback (candidato, R2). No aplicado a ningún entorno.
-- ============================================================================
