-- ============================================================================
-- 33_rollback_0043.sql (ARTEFACTO DE ROLLBACK — NO EJECUTAR SALVO FALLO DE 0043)
--
-- Objetivo: revertir exactamente el efecto de
-- supabase/migrations/0043_privacidad_umbral_acceso_reportante.sql,
-- restaurando el estado real anterior a 0043 (confirmado leyendo el
-- contenido actual de main en el momento de escribir este archivo, no de
-- memoria ni por reconstrucción aproximada):
--
--   (1) 10 funciones — cuerpo exacto anterior, sin supresión de
--       distribución ni umbral protegido, extraído literal de:
--       get_concern_results                    <- 0026_pulso_ciudadano.sql
--       get_measure_results                     <- 0027_pulso_temas.sql
--       get_measure_position_counts             <- 0031_pulso_participacion_vivienda.sql
--       get_measure_urgency_counts              <- 0031_pulso_participacion_vivienda.sql
--       get_measure_reason_counts               <- 0031_pulso_participacion_vivienda.sql
--       get_general_participation_results       <- 0031_pulso_participacion_vivienda.sql
--       get_priority_results                    <- 0031_pulso_participacion_vivienda.sql
--       get_concern_listening_survey_summary    <- 0037_escucha_abierta_sanidad.sql
--       get_concern_listening_survey_territory_breakdown <- 0037_escucha_abierta_sanidad.sql
--       get_next_block_vote_results             <- 0038_proximo_bloque.sql
--       Ninguna cambia de firma en 0043, así que ninguna necesita drop
--       function aquí tampoco — todo es create or replace.
--
--   (2) 11 policies de select de participación — mismo nombre y using()
--       que tenían antes de 0043 (`{tabla}_select_own_or_staff`, con
--       `user_id = auth.uid() or public.is_moderator_or_admin()`),
--       extraído literal de las migraciones que las crearon
--       originalmente (0026, 0027, 0032, 0037, 0038, 0031).
--       concern_proposals no la toca 0043, así que tampoco este rollback.
--
--   (3) reports / channel_reports — restaurar el grant de select de tabla
--       completa (sin restricción de columna) a authenticated, y eliminar
--       las 2 vistas nuevas (reports_moderation, channel_reports_moderation).
--
-- Total de objetos restaurados: 10 funciones + 11 policies + 2 grants de
-- tabla + 2 drop view = 25.
--
-- No destructivo: no borra ni modifica ninguna fila de datos, no toca
-- columnas ni tablas base (solo las 2 vistas que crea 0043). Todo dentro
-- de una única transacción (begin/commit).
--
-- Uso previsto: versionar como una migración nueva
-- (p. ej. 0044_rollback_0043.sql) y aplicar vía `supabase db push`, nunca
-- como sesión SQL manual — mismo mecanismo que la aplicación original.
--
-- Estado de este archivo: candidato preparado y validado sintácticamente
-- en un PostgreSQL desechable antes de aplicar 0043 a staging (ver
-- seguridad/34_resultados_privacidad_0043_staging.md §Rollback). No
-- aplicado a ninguna base de datos real por esta tarea.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------
-- (1) Funciones — cuerpo exacto anterior a 0043
-- ----------------------------------------------------------------------

create or replace function public.get_concern_results(p_concern_ids uuid[] default null)
returns table (concern_id uuid, level smallint, response_count bigint)
language sql
stable
security definer
set search_path = public
as $$
	select cr.concern_id, cr.level, count(*) as response_count
	from public.concern_responses cr
	where p_concern_ids is null or cr.concern_id = any(p_concern_ids)
	group by cr.concern_id, cr.level;
$$;

comment on function public.get_concern_results is
	'Recuento agregado de respuestas por nivel (1-5) y preocupación. Nunca expone filas individuales.';

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

create or replace function public.get_next_block_vote_results(p_round_id uuid)
returns table (option_code text, vote_count bigint)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
	if not exists (
		select 1 from public.next_block_vote_rounds where id = p_round_id and status = 'closed'
	) then
		raise exception 'Los resultados no están disponibles hasta que la votación finalice.';
	end if;

	return query
	select v.option_code, count(*)
	from public.next_block_votes v
	where v.round_id = p_round_id
	group by v.option_code;
end;
$function$;

comment on function public.get_next_block_vote_results is
	'Recuento por opción. Lanza una excepción si la ronda no está cerrada: la protección de "no revelar quién va ganando" vive en el servidor, no solo en que el cliente decida no pedirlo.';

-- ----------------------------------------------------------------------
-- (2) RLS — restaurar el bypass de staff en las 11 tablas
-- ----------------------------------------------------------------------

drop policy "concern_responses_select_own" on public.concern_responses;
create policy "concern_responses_select_own_or_staff"
	on public.concern_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "measure_responses_select_own" on public.measure_responses;
create policy "measure_responses_select_own_or_staff"
	on public.measure_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "concern_listening_responses_select_own" on public.concern_listening_responses;
create policy "concern_listening_responses_select_own_or_staff"
	on public.concern_listening_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "concern_listening_contexts_select_own" on public.concern_listening_contexts;
create policy "concern_listening_contexts_select_own_or_staff"
	on public.concern_listening_contexts for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "concern_listening_completions_select_own" on public.concern_listening_completions;
create policy "concern_listening_completions_select_own_or_staff"
	on public.concern_listening_completions for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "concern_listening_survey_responses_select_own" on public.concern_listening_survey_responses;
create policy "concern_listening_survey_responses_select_own_or_staff"
	on public.concern_listening_survey_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "measure_participation_responses_select_own" on public.measure_participation_responses;
create policy "measure_participation_responses_select_own_or_staff"
	on public.measure_participation_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "general_participation_responses_select_own" on public.general_participation_responses;
create policy "general_participation_responses_select_own_or_staff"
	on public.general_participation_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "response_priorities_select_own" on public.response_priorities;
create policy "response_priorities_select_own_or_staff"
	on public.response_priorities for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "participant_contexts_select_own" on public.participant_contexts;
create policy "participant_contexts_select_own_or_staff"
	on public.participant_contexts for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

drop policy "next_block_votes_select_own" on public.next_block_votes;
create policy "next_block_votes_select_own_or_staff"
	on public.next_block_votes for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- ----------------------------------------------------------------------
-- (3) reports / channel_reports — restaurar acceso de tabla completa,
--     eliminar las 2 vistas nuevas
-- ----------------------------------------------------------------------

drop view if exists public.reports_moderation;

revoke select (id, event_id, reason, details, status, created_at, resolved_at)
	on public.reports from authenticated;
grant select on public.reports to authenticated;

drop view if exists public.channel_reports_moderation;

revoke select (id, channel_id, reason, details, status, created_at, resolved_at)
	on public.channel_reports from authenticated;
grant select on public.channel_reports to authenticated;

commit;
