-- ============================================================================
-- 18_rollback_0042.sql (ARTEFACTO DE ROLLBACK — NO EJECUTAR SALVO FALLO DE 0042)
--
-- Extraído EXACTO, sin modificación de ningún tipo, de
-- seguridad/17_plan_promocion_produccion.md, sección B.9 ("Rollback SQL —
-- completo, sin placeholders"). No se ha rediseñado, ampliado, ni
-- incorporado ningún hallazgo posterior (privacidad u otro) a este
-- contenido — es una materialización literal de un rollback ya validado,
-- no una revisión nueva.
--
-- Objetivo: revertir exactamente el efecto de
-- supabase/migrations/0042_security_hardening_review3.sql, restaurando:
--   (1) el EXECUTE por defecto a PUBLIC en las 23 funciones que 0042
--       modifica (§A+§A2: 12 de escritura privada; §B: 11 de lectura
--       pública agregada) — el estado real anterior a 0042, en el que
--       ninguna de estas funciones tenía revoke/grant explícito;
--   (2) el cuerpo exacto de las 2 funciones que 0042 sustituye
--       (set_concern_listening_priorities, set_concern_listening_detail),
--       literal desde supabase/migrations/0033 y 0032 respectivamente —
--       sin la validación de option_code (H-02) que añade 0042.
--
-- No destructivo: no borra ni modifica ninguna fila de datos, no toca
-- tablas ni columnas. Solo GRANT/REVOKE y CREATE OR REPLACE FUNCTION.
-- Todo dentro de una única transacción (begin/commit) — o se aplica
-- entero, o no se aplica nada.
--
-- Uso previsto (ver seguridad/17_plan_promocion_produccion.md §D):
-- versionar como una migración nueva (p. ej. 0043_rollback_0042.sql) y
-- aplicar vía `supabase db push`, nunca como sesión SQL manual — mismo
-- mecanismo que la aplicación original de 0042.
--
-- Estado de este archivo: candidato preparado, NO aplicado a ninguna base
-- de datos por esta tarea (B1.1). Revalidado contra el estado ACTUAL de
-- producción en B1.1 §2 — ver seguridad/ para el resultado de esa
-- revalidación en el momento en que se creó este archivo.
-- ============================================================================

begin;

-- ============================================================================
-- Reversión de §A + §A2 (12 funciones de escritura privada) y §B (11 de
-- lectura pública): restaurar el EXECUTE por defecto a PUBLIC, que era el
-- estado real antes de 0042 (documentado en 06_revision_critica.md /
-- 07_preflight_produccion.sql §6: estas funciones nunca tuvieron un
-- revoke/grant explícito antes de esta migración).
-- ============================================================================

revoke execute on function public.set_concern_listening_priorities(uuid, text[]) from authenticated;
grant execute on function public.set_concern_listening_priorities(uuid, text[]) to public;

revoke execute on function public.set_concern_listening_detail(uuid, text, text, text, text, text, text, text) from authenticated;
grant execute on function public.set_concern_listening_detail(uuid, text, text, text, text, text, text, text) to public;

revoke execute on function public.set_concern_listening_context(uuid, text, text, text) from authenticated;
grant execute on function public.set_concern_listening_context(uuid, text, text, text) to public;

revoke execute on function public.set_concern_listening_completed(uuid) from authenticated;
grant execute on function public.set_concern_listening_completed(uuid) to public;

revoke execute on function public.set_general_participation_response(uuid, text, text, text, text) from authenticated;
grant execute on function public.set_general_participation_response(uuid, text, text, text, text) to public;

revoke execute on function public.set_measure_participation_response(uuid, uuid, text, text, text, text, text, text) from authenticated;
grant execute on function public.set_measure_participation_response(uuid, uuid, text, text, text, text, text, text) to public;

revoke execute on function public.set_response_priorities(uuid, uuid[]) from authenticated;
grant execute on function public.set_response_priorities(uuid, uuid[]) to public;

revoke execute on function public.set_participant_context(uuid, text, text) from authenticated;
grant execute on function public.set_participant_context(uuid, text, text) to public;

revoke execute on function public.set_concern_listening_survey_response(uuid, text[], text, text, uuid[], uuid, uuid, text, text, text) from authenticated;
grant execute on function public.set_concern_listening_survey_response(uuid, text[], text, text, uuid[], uuid, uuid, text, text, text) to public;

revoke execute on function public.set_next_block_vote(uuid, text) from authenticated;
grant execute on function public.set_next_block_vote(uuid, text) to public;

revoke execute on function public.set_concern_response(uuid, smallint) from authenticated;
grant execute on function public.set_concern_response(uuid, smallint) to public;

revoke execute on function public.set_measure_response(uuid, text, text) from authenticated;
grant execute on function public.set_measure_response(uuid, text, text) to public;

revoke execute on function public.get_measure_position_counts(uuid, uuid[]) from anon, authenticated;
grant execute on function public.get_measure_position_counts(uuid, uuid[]) to public;

revoke execute on function public.get_measure_urgency_counts(uuid, uuid[]) from anon, authenticated;
grant execute on function public.get_measure_urgency_counts(uuid, uuid[]) to public;

revoke execute on function public.get_measure_reason_counts(uuid, uuid[]) from anon, authenticated;
grant execute on function public.get_measure_reason_counts(uuid, uuid[]) to public;

revoke execute on function public.get_general_participation_results(uuid) from anon, authenticated;
grant execute on function public.get_general_participation_results(uuid) to public;

revoke execute on function public.get_priority_results(uuid) from anon, authenticated;
grant execute on function public.get_priority_results(uuid) to public;

revoke execute on function public.get_participation_summary(uuid) from anon, authenticated;
grant execute on function public.get_participation_summary(uuid) to public;

revoke execute on function public.get_concern_listening_survey_summary(uuid) from anon, authenticated;
grant execute on function public.get_concern_listening_survey_summary(uuid) to public;

revoke execute on function public.get_concern_listening_survey_total(uuid) from anon, authenticated;
grant execute on function public.get_concern_listening_survey_total(uuid) to public;

revoke execute on function public.get_concern_listening_survey_territory_breakdown(uuid, integer) from anon, authenticated;
grant execute on function public.get_concern_listening_survey_territory_breakdown(uuid, integer) to public;

revoke execute on function public.get_next_block_vote_total(uuid) from anon, authenticated;
grant execute on function public.get_next_block_vote_total(uuid) to public;

revoke execute on function public.get_next_block_vote_results(uuid) from anon, authenticated;
grant execute on function public.get_next_block_vote_results(uuid) to public;

-- ============================================================================
-- Reversión de §C: restaurar el cuerpo EXACTO de las 2 funciones tal como
-- estaban antes de 0042 — literal desde supabase/migrations/0033 (para
-- set_concern_listening_priorities, su última redefinición antes de 0042)
-- y supabase/migrations/0032 (para set_concern_listening_detail, nunca
-- redefinida desde esa migración). Sin la validación de option_code que
-- añade 0042 — esto es intencionadamente una reversión completa, no un
-- parche parcial.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_concern_listening_priorities(p_round_id uuid, p_option_codes text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

	-- Libera primero todos los rangos actuales del usuario en esta ronda:
	-- evita colisiones transitorias con UNIQUE(round_id, user_id, rank) al
	-- reordenar o sustituir prioridades en la misma llamada.
	update public.concern_listening_responses
	set rank = null, updated_at = now()
	where round_id = p_round_id
	and user_id = v_user_id
	and rank is not null;

	if v_count > 0 then
		insert into public.concern_listening_responses (round_id, user_id, option_code, rank)
		select p_round_id, v_user_id, u.code, u.ord::smallint
		from unnest(p_option_codes) with ordinality as u (code, ord)
		on conflict (round_id, option_code, user_id)
		do update set rank = excluded.rank, updated_at = now();
	end if;
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

commit;
