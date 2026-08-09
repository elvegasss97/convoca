-- ============================================================================
-- 0043_privacidad_umbral_acceso_reportante.sql
--
-- Parche de privacidad pre-lanzamiento. Fuente de diseño:
-- seguridad/32_plan_implementacion_privacidad_prelaunch.md (v2, corregido
-- tras revisión crítica y verificación empírica en PostgreSQL desechable).
--
-- Corrección de columnas reales respecto al texto del plan 32: la tabla
-- `reports`/`channel_reports` tiene columnas `details`/`resolved_at`, no
-- `description`/`reviewed_at` como decía el documento — se usan aquí los
-- nombres reales, confirmados leyendo 0005_reports_and_audit_logs.sql y
-- 0021_communication_channels.sql.
--
-- CORRECCIÓN CRÍTICA DE DISEÑO (encontrada durante esta implementación,
-- no en la revisión previa): el plan 32 asumía que `community` en
-- `concern_listening_survey_responses` era texto libre y por eso mantenía
-- supresión por celda en el desglose territorial. Es falso — comprobado
-- leyendo `SanidadListeningFlow.svelte`: `community` es un <select> sobre
-- un catálogo cerrado de 20 comunidades/ciudades autónomas
-- (`src/lib/data/regions.ts`). Con un total público exacto
-- (`get_concern_listening_survey_total`) y un catálogo cerrado y conocido,
-- el ataque de resta del encargo original SÍ aplica aquí exactamente igual
-- que en `next_block_votes`. §3 se corrige a supresión completa.
--
-- Alcance exacto (sin más cambios que estos):
--   §1 — 8 funciones agregadas: supresión de la distribución COMPLETA por
--        agrupación natural si alguna categoría OBSERVADA tiene un conteo
--        entre 1 y 4. Una categoría con conteo 0 no genera fila (GROUP BY
--        sobre datos reales, sin catálogo con LEFT JOIN) y por tanto nunca
--        dispara la supresión por sí sola — no hace falta lógica adicional
--        para ese caso, es una consecuencia directa de cómo se construye
--        cada consulta.
--   §2 — get_priority_results: supresión por fila (`having count(*) >= 5`),
--        sin agrupación hermana que sumar a un total conocido.
--   §3 — get_concern_listening_survey_territory_breakdown: MISMA firma
--        (uuid, integer), sin drop function — seguridad/18_rollback_0042.sql
--        y seguridad/07_preflight_produccion.sql dependen de esa firma
--        exacta (confirmado por búsqueda exhaustiva en todo el repo).
--        Umbral protegido con greatest(p_min_threshold, 30) Y supresión
--        completa de la ronda (catálogo cerrado de 20 comunidades, ver
--        corrección de arriba) — no solo de la comunidad afectada.
--   §4 — get_next_block_vote_results: supresión completa de la ronda si
--        alguna opción observada tiene 1-4 votos (cierra el ataque de
--        resta: get_next_block_vote_total publica el total exacto a la
--        misma granularidad, sobre un catálogo cerrado de 5 opciones).
--   §5 — 11 de las 12 policies de select de participación (todas salvo
--        concern_proposals, excepción explícita sin cambio): se retira
--        `or public.is_moderator_or_admin()`.
--   §6 — reports / channel_reports: revoke select de tabla completa +
--        grant select de columna sobre las columnas seguras + vista
--        security_invoker=true con esas mismas columnas + grant de la
--        vista. reported_by_user_id queda fuera de ambas vistas.
--
-- Verificado empíricamente antes de escribir esto (PostgreSQL 17
-- desechable) que security_invoker=true por sí solo, sin el grant de
-- columna sobre la tabla base, NO funciona: la vista exige privilegio
-- directo del invocador también sobre la tabla subyacente.
--
-- No destructivo: ninguna fila de datos se borra ni modifica. No se
-- eliminan columnas ni tablas. Ninguna función cambia de firma. Atómico:
-- toda la migración corre en una única transacción.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------
-- §1. Funciones con supresión de distribución completa por agrupación
-- ----------------------------------------------------------------------

create or replace function public.get_concern_results(p_concern_ids uuid[] default null)
returns table (concern_id uuid, level smallint, response_count bigint)
language sql
stable
security definer
set search_path = public
as $$
	with counts as (
		select cr.concern_id, cr.level, count(*) as response_count
		from public.concern_responses cr
		where p_concern_ids is null or cr.concern_id = any(p_concern_ids)
		group by cr.concern_id, cr.level
	)
	select c.concern_id, c.level, c.response_count
	from counts c
	where not exists (
		select 1 from counts c2
		where c2.concern_id = c.concern_id and c2.response_count < 5
	);
$$;

comment on function public.get_concern_results is
	'Recuento agregado de respuestas por nivel (1-5) y preocupación. Nunca expone filas individuales. Supresión de la distribución completa de una preocupación si algún nivel observado tiene entre 1 y 4 respuestas (protección frente a reconstrucción por resta).';

create or replace function public.get_measure_results(p_measure_ids uuid[] default null)
returns table (measure_id uuid, stance text, response_count bigint)
language sql
stable
security definer
set search_path = public
as $$
	with counts as (
		select mr.measure_id, mr.stance, count(*) as response_count
		from public.measure_responses mr
		where p_measure_ids is null or mr.measure_id = any(p_measure_ids)
		group by mr.measure_id, mr.stance
	)
	select c.measure_id, c.stance, c.response_count
	from counts c
	where not exists (
		select 1 from counts c2
		where c2.measure_id = c.measure_id and c2.response_count < 5
	);
$$;

comment on function public.get_measure_results is
	'Recuento agregado de valoraciones por postura (favor/en_contra/modificaria) y medida. Nunca expone filas individuales. Supresión de la distribución completa de una medida si alguna postura observada tiene entre 1 y 4 respuestas.';

create or replace function public.get_measure_position_counts(p_round_id uuid, p_measure_ids uuid[])
returns table (measure_id uuid, position_value text, response_count bigint)
language sql
security definer
stable
set search_path to 'public'
as $function$
	with counts as (
		select r.measure_id, r.position_value, count(*) as response_count
		from public.measure_participation_responses r
		where r.round_id = p_round_id and r.measure_id = any (p_measure_ids)
		group by r.measure_id, r.position_value
	)
	select c.measure_id, c.position_value, c.response_count
	from counts c
	where not exists (
		select 1 from counts c2
		where c2.measure_id = c.measure_id and c2.response_count < 5
	);
$function$;

create or replace function public.get_measure_urgency_counts(p_round_id uuid, p_measure_ids uuid[])
returns table (measure_id uuid, urgency text, response_count bigint)
language sql
security definer
stable
set search_path to 'public'
as $function$
	with counts as (
		select r.measure_id, r.urgency, count(*) as response_count
		from public.measure_participation_responses r
		where r.round_id = p_round_id and r.measure_id = any (p_measure_ids) and r.urgency is not null
		group by r.measure_id, r.urgency
	)
	select c.measure_id, c.urgency, c.response_count
	from counts c
	where not exists (
		select 1 from counts c2
		where c2.measure_id = c.measure_id and c2.response_count < 5
	);
$function$;

create or replace function public.get_measure_reason_counts(p_round_id uuid, p_measure_ids uuid[])
returns table (measure_id uuid, reason_code text, response_count bigint)
language sql
security definer
stable
set search_path to 'public'
as $function$
	with counts as (
		select r.measure_id, r.reason_code, count(*) as response_count
		from public.measure_participation_responses r
		where r.round_id = p_round_id and r.measure_id = any (p_measure_ids) and r.reason_code is not null
		group by r.measure_id, r.reason_code
	)
	select c.measure_id, c.reason_code, c.response_count
	from counts c
	where not exists (
		select 1 from counts c2
		where c2.measure_id = c.measure_id and c2.response_count < 5
	);
$function$;

-- Las 3 dimensiones son independientes: la supresión de una no afecta a
-- las otras 2 (puede faltar una tarjeta mientras las demás se muestran).
create or replace function public.get_general_participation_results(p_round_id uuid)
returns table (dimension text, value text, response_count bigint)
language sql
security definer
stable
set search_path to 'public'
as $function$
	with general_position_counts as (
		select general_position as value, count(*) as response_count
		from public.general_participation_responses
		where round_id = p_round_id
		group by general_position
	),
	investment_opinion_counts as (
		select investment_opinion as value, count(*) as response_count
		from public.general_participation_responses
		where round_id = p_round_id
		group by investment_opinion
	),
	pace_preference_counts as (
		select pace_preference as value, count(*) as response_count
		from public.general_participation_responses
		where round_id = p_round_id
		group by pace_preference
	)
	select 'general_position', value, response_count
	from general_position_counts
	where not exists (select 1 from general_position_counts c2 where c2.response_count < 5)
	union all
	select 'investment_opinion', value, response_count
	from investment_opinion_counts
	where not exists (select 1 from investment_opinion_counts c2 where c2.response_count < 5)
	union all
	select 'pace_preference', value, response_count
	from pace_preference_counts
	where not exists (select 1 from pace_preference_counts c2 where c2.response_count < 5);
$function$;

-- ----------------------------------------------------------------------
-- §2. get_priority_results — supresión por fila (sin categorías hermanas)
-- ----------------------------------------------------------------------

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
	group by measure_id
	having count(*) >= 5;
$function$;

-- Las 5 dimensiones son independientes entre sí, igual que en
-- get_general_participation_results.
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
	with problem_counts as (
		select p as code, count(*) as response_count
		from public.concern_listening_survey_responses, unnest(problems) as p
		where round_id = p_round_id
		group by p
	),
	main_cause_counts as (
		select main_cause as code, count(*) as response_count
		from public.concern_listening_survey_responses
		where round_id = p_round_id and main_cause is not null
		group by main_cause
	),
	prioritized_measure_counts as (
		select measure_id::text as code, count(*) as response_count
		from public.concern_listening_survey_responses, unnest(prioritized_measure_ids) as measure_id
		where round_id = p_round_id
		group by measure_id
	),
	commitment_most_urgent_counts as (
		select commitment_most_urgent_id::text as code, count(*) as response_count
		from public.concern_listening_survey_responses
		where round_id = p_round_id and commitment_most_urgent_id is not null
		group by commitment_most_urgent_id
	),
	commitment_most_difficult_counts as (
		select commitment_most_difficult_id::text as code, count(*) as response_count
		from public.concern_listening_survey_responses
		where round_id = p_round_id and commitment_most_difficult_id is not null
		group by commitment_most_difficult_id
	)
	select 'problem', code, response_count
	from problem_counts
	where not exists (select 1 from problem_counts c2 where c2.response_count < 5)
	union all
	select 'main_cause', code, response_count
	from main_cause_counts
	where not exists (select 1 from main_cause_counts c2 where c2.response_count < 5)
	union all
	select 'prioritized_measure', code, response_count
	from prioritized_measure_counts
	where not exists (select 1 from prioritized_measure_counts c2 where c2.response_count < 5)
	union all
	select 'commitment_most_urgent', code, response_count
	from commitment_most_urgent_counts
	where not exists (select 1 from commitment_most_urgent_counts c2 where c2.response_count < 5)
	union all
	select 'commitment_most_difficult', code, response_count
	from commitment_most_difficult_counts
	where not exists (select 1 from commitment_most_difficult_counts c2 where c2.response_count < 5);
$function$;

-- ----------------------------------------------------------------------
-- §3. Desglose territorial — misma firma, umbral no reducible
-- ----------------------------------------------------------------------

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
	with counts as (
		select community, count(*) as response_count
		from public.concern_listening_survey_responses
		where round_id = p_round_id and community is not null
		group by community
	)
	select c.community, c.response_count
	from counts c
	where not exists (
		select 1 from counts c2
		where c2.response_count < greatest(p_min_threshold, 30)
	);
$function$;

comment on function public.get_concern_listening_survey_territory_breakdown is
	'Desglose por comunidad autónoma (catálogo cerrado de 20, src/lib/data/regions.ts), umbral mínimo no reducible por el cliente (greatest(p_min_threshold, 30)). Supresión de la distribución COMPLETA de la ronda si alguna comunidad observada tiene menos de greatest(p_min_threshold, 30) respuestas: con un total público exacto (get_concern_listening_survey_total) y un catálogo cerrado y conocido, omitir solo la comunidad afectada sería reconstruible por resta.';

-- ----------------------------------------------------------------------
-- §4. Próximo bloque — supresión completa de la ronda
-- ----------------------------------------------------------------------

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

	if exists (
		select 1 from public.next_block_votes v
		where v.round_id = p_round_id
		group by v.option_code
		having count(*) < 5
	) then
		return; -- supresión completa: catálogo cerrado (5 opciones) + total público exacto = ataque de resta directo
	end if;

	return query
	select v.option_code, count(*)
	from public.next_block_votes v
	where v.round_id = p_round_id
	group by v.option_code;
end;
$function$;

comment on function public.get_next_block_vote_results is
	'Recuento por opción. Lanza una excepción si la ronda no está cerrada. Si, tras cerrar, alguna opción observada tiene entre 1 y 4 votos, no se devuelve ninguna fila (get_next_block_vote_total sigue publicando el total exacto sin cambio) — omitir solo la opción minoritaria sería reconstruible por resta contra ese total, con un catálogo cerrado de 5 opciones.';

-- ----------------------------------------------------------------------
-- §5. RLS — retirar el bypass de staff en 11 de las 12 tablas de
--      participación. concern_proposals es la excepción explícita, sin
--      cambio: staff necesita revisar propuestas pendientes.
-- ----------------------------------------------------------------------

drop policy "concern_responses_select_own_or_staff" on public.concern_responses;
create policy "concern_responses_select_own"
	on public.concern_responses for select
	to authenticated
	using (user_id = auth.uid());

drop policy "measure_responses_select_own_or_staff" on public.measure_responses;
create policy "measure_responses_select_own"
	on public.measure_responses for select
	to authenticated
	using (user_id = auth.uid());

drop policy "concern_listening_responses_select_own_or_staff" on public.concern_listening_responses;
create policy "concern_listening_responses_select_own"
	on public.concern_listening_responses for select
	to authenticated
	using (user_id = auth.uid());

drop policy "concern_listening_contexts_select_own_or_staff" on public.concern_listening_contexts;
create policy "concern_listening_contexts_select_own"
	on public.concern_listening_contexts for select
	to authenticated
	using (user_id = auth.uid());

drop policy "concern_listening_completions_select_own_or_staff" on public.concern_listening_completions;
create policy "concern_listening_completions_select_own"
	on public.concern_listening_completions for select
	to authenticated
	using (user_id = auth.uid());

drop policy "concern_listening_survey_responses_select_own_or_staff" on public.concern_listening_survey_responses;
create policy "concern_listening_survey_responses_select_own"
	on public.concern_listening_survey_responses for select
	to authenticated
	using (user_id = auth.uid());

drop policy "measure_participation_responses_select_own_or_staff" on public.measure_participation_responses;
create policy "measure_participation_responses_select_own"
	on public.measure_participation_responses for select
	to authenticated
	using (user_id = auth.uid());

drop policy "general_participation_responses_select_own_or_staff" on public.general_participation_responses;
create policy "general_participation_responses_select_own"
	on public.general_participation_responses for select
	to authenticated
	using (user_id = auth.uid());

drop policy "response_priorities_select_own_or_staff" on public.response_priorities;
create policy "response_priorities_select_own"
	on public.response_priorities for select
	to authenticated
	using (user_id = auth.uid());

drop policy "participant_contexts_select_own_or_staff" on public.participant_contexts;
create policy "participant_contexts_select_own"
	on public.participant_contexts for select
	to authenticated
	using (user_id = auth.uid());

drop policy "next_block_votes_select_own_or_staff" on public.next_block_votes;
create policy "next_block_votes_select_own"
	on public.next_block_votes for select
	to authenticated
	using (user_id = auth.uid());

-- concern_proposals: SIN CAMBIO. Excepción explícita, staff sigue
-- necesitando leer propuestas pendientes para aprobar/rechazar.

-- ----------------------------------------------------------------------
-- §6. reports / channel_reports — proteger reported_by_user_id con una
--      garantía estructural, no una convención de cliente. Verificado
--      empíricamente que security_invoker=true por sí solo no basta: el
--      invocador necesita privilegio directo también sobre la tabla base.
-- ----------------------------------------------------------------------

revoke select on public.reports from authenticated;
grant select (id, event_id, reason, details, status, created_at, resolved_at)
	on public.reports to authenticated;

create view public.reports_moderation
with (security_invoker = true)
as
select id, event_id, reason, details, status, created_at, resolved_at
from public.reports;

comment on view public.reports_moderation is
	'Vista de reports para moderación y para que el propio reportante recupere su reporte recién creado. Mismas filas que ya permitía reports_select_own_or_staff (RLS, sin cambio); reported_by_user_id queda fuera de esta vista de forma estructural, no por convención — pedirla da "column does not exist", no un permiso denegado silencioso. service_role y el acceso directo a Postgres quedan fuera de esta garantía (23_modelo_privacidad_participacion.md).';

grant select on public.reports_moderation to authenticated;

revoke select on public.channel_reports from authenticated;
grant select (id, channel_id, reason, details, status, created_at, resolved_at)
	on public.channel_reports to authenticated;

create view public.channel_reports_moderation
with (security_invoker = true)
as
select id, channel_id, reason, details, status, created_at, resolved_at
from public.channel_reports;

comment on view public.channel_reports_moderation is
	'Igual que reports_moderation, para channel_reports. reported_by_user_id fuera de la vista.';

grant select on public.channel_reports_moderation to authenticated;

commit;
