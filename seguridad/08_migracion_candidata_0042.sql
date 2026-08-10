-- ============================================================================
-- 0042_security_hardening_review3.sql (HISTÓRICO — YA APLICADA)
--
-- Estado actualizado: esta migración ya se aplicó y se validó, tanto en
-- staging como en producción, y forma parte de
-- supabase/migrations/0042_security_hardening_review3.sql en el historial
-- real de migraciones del repositorio. Este archivo se conserva en
-- /seguridad íntegro, sin modificar su SQL, como registro del proceso de
-- revisión que llevó a esa versión final (incluida la corrección crítica
-- descrita más abajo, encontrada antes de aplicar nada) — no como una
-- migración pendiente de ejecutar. El contenido normativo vive en
-- supabase/migrations/, no aquí.
--
-- Tercera revisión, tal como se escribió en su momento (sin modificar
-- desde entonces):
--
-- CORRECCIÓN CRÍTICA respecto a la versión anterior de este archivo: la
-- versión anterior agrupaba 12 funciones de lectura de agregados junto con
-- funciones de escritura y les revocaba EXECUTE de `anon` sin distinguir
-- comportamiento real. Eso habría ROTO en producción 3 páginas públicas sin
-- sesión: /pulso/soluciones/[slug], /pulso/escucha/[categoria] (sanidad) y
-- /pulso/proximo-bloque — las tres llaman a funciones de agregados sin
-- comprobar sesión (confirmado leyendo el código fuente real de esas
-- rutas, no por suposición). Esta versión corrige la clasificación: ver
-- 06_revision_critica.md §2 para la tabla completa función por función con
-- la cita exacta del archivo cliente que la invoca sin sesión.
--
-- Requisito previo obligatorio: ejecutar TODO 07_preflight_produccion.sql
-- en staging (y revisar el bloque §8 de diagnóstico histórico de abajo) y
-- confirmar que:
--   (a) has_schema_privilege('anon'/'authenticated', 'public', 'CREATE') = false
--   (b) las consultas de diagnóstico de H-02 (bloque siguiente) devuelven 0 filas
-- Si (a) es true, o (b) devuelve filas, NO aplicar este archivo tal cual —
-- ver 06_revision_critica.md §6 y §8 de este archivo.
--
-- Atomicidad: todo el archivo se ejecuta dentro de una única transacción
-- (begin/commit explícitos). Si cualquier sentencia falla, no queda ningún
-- cambio aplicado.
--
-- No destructivo: no se borra ni modifica ninguna fila de datos, no se
-- eliminan columnas ni tablas, no se cambia ningún tipo. Los únicos cambios
-- son (1) GRANT/REVOKE de permisos de ejecución sobre funciones existentes,
-- y (2) `create or replace function` sobre 2 funciones existentes, añadiendo
-- validación nueva sin quitar ninguna validación previa.
--
-- Esta migración NO toca RT-009 (condición de carrera en
-- set_concern_listening_priorities): sigue siendo una hipótesis pendiente
-- de verificación en staging, no una corrección aplicada — ver
-- 06_revision_critica.md §5 y 09_pruebas_parche_0042.md §Concurrencia.
-- No se añade ningún `select ... for update` ni cambio de bloqueo aquí.
--
-- AÑADIDO EN ESTA REVISIÓN (§A2): `set_concern_response` y
-- `set_measure_response`, encontradas ejecutables por `anon` al ejecutar
-- 07_preflight_produccion.sql §6 REALMENTE contra convoca-staging (ver
-- seguridad/11_resultados_preflight_staging.md) — no detectables leyendo
-- solo las migraciones locales. Ambas funciones ya tenían `grant ... to
-- authenticated` explícito en 0026/0027, sin `anon` — pero seguían siendo
-- ejecutables por `anon` en la base real porque Supabase concede EXECUTE a
-- `anon`/`authenticated` por defecto (`alter default privileges`) sobre
-- cualquier función nueva en el momento de crearse, y un `revoke ... from
-- public` no revoca ese privilegio concedido directamente al rol `anon` —
-- hace falta `revoke ... from anon` explícito, que 0026/0027 nunca
-- incluyeron. Mismo guardián interno (`auth.uid() is null`) que el resto de
-- §A, verificado con `pg_get_functiondef` contra la base real antes de
-- añadirlas aquí — no es una función nueva ni un cambio de lógica, solo el
-- mismo patrón de revoke/grant que §A, aplicado a 2 funciones más.
-- ============================================================================


-- ============================================================================
-- §DIAGNÓSTICO (solo lectura, informativo) — ejecutar y revisar el
-- resultado ANTES de decidir si aplicar §C de este archivo. No forma parte
-- de la transacción de escritura (deliberadamente fuera del begin/commit).
-- Duplicado de 07_preflight_produccion.sql §8 por conveniencia, para no
-- tener que saltar de archivo al revisar esta migración candidata.
-- ============================================================================

select cr.id as round_id, cr.category, clr.option_code, count(*)
from public.concern_listening_responses clr
join public.concern_listening_rounds cr on cr.id = clr.round_id
where cr.category = 'vivienda'
and clr.option_code not in (
	'precio_alquiler', 'dificultad_compra', 'emancipacion_juvenil', 'falta_vivienda_publica',
	'inestabilidad_impagos', 'sinhogarismo', 'presion_turistica', 'viviendas_vacias',
	'mal_estado_accesibilidad', 'falta_vivienda_rural'
)
group by cr.id, cr.category, clr.option_code;

select id, round_id, option_code
from public.concern_listening_responses
where option_code is null or trim(option_code) = '' or option_code <> trim(option_code);

select cr.category, count(*) as filas_afectadas
from public.concern_listening_responses clr
join public.concern_listening_rounds cr on cr.id = clr.round_id
where cr.category <> 'vivienda'
group by cr.category;

-- REQUIERE_DECISION_PRODUCTO: si cualquiera de las 3 consultas de arriba
-- devuelve filas, el bloque §C (validación de option_code) seguirá
-- aplicándose igual (protege escrituras FUTURAS), pero las filas históricas
-- inválidas seguirán existiendo hasta un plan de limpieza explícito y
-- revisado a mano — ver NO_EJECUTAR_SIN_REVISAR al final de §C.


begin;


-- ============================================================================
-- §A — Escritura privada: 10 funciones. EXECUTE exclusivamente para
-- `authenticated`. Patrón completo por función: revoke from public; revoke
-- from anon; grant to authenticated — el `revoke from anon` se añade de
-- forma explícita (no solo implícita vía `from public`) en esta revisión,
-- para que el propio texto de la migración sea una prueba autocontenida de
-- que `anon` queda sin acceso, sin depender de que quien la lea infiera que
-- "revocar de public" cubre a `anon`. Ninguna de estas 10 se invoca nunca
-- sin sesión desde el código cliente — todas escriben datos de
-- participación/voto atribuidos a auth.uid(), y las 9 originales (H-03)
-- más `set_next_block_vote` ya exigen `auth.uid() is not null` como primera
-- comprobación interna; este parche cierra además la superficie de sondeo
-- gratuito para `anon` que describía RT-004 del equipo rojo. Firmas
-- confirmadas contra la definición MÁS RECIENTE de cada función (0033/0034
-- sustituyen a 0031/0032 donde aplica). Ver 06_revision_critica.md §2 para
-- la cita exacta de archivo:línea de cada función.
-- ============================================================================

revoke execute on function public.set_concern_listening_priorities(uuid, text[]) from public;
revoke execute on function public.set_concern_listening_priorities(uuid, text[]) from anon;
grant execute on function public.set_concern_listening_priorities(uuid, text[]) to authenticated;

revoke execute on function public.set_concern_listening_detail(uuid, text, text, text, text, text, text, text) from public;
revoke execute on function public.set_concern_listening_detail(uuid, text, text, text, text, text, text, text) from anon;
grant execute on function public.set_concern_listening_detail(uuid, text, text, text, text, text, text, text) to authenticated;

revoke execute on function public.set_concern_listening_context(uuid, text, text, text) from public;
revoke execute on function public.set_concern_listening_context(uuid, text, text, text) from anon;
grant execute on function public.set_concern_listening_context(uuid, text, text, text) to authenticated;

revoke execute on function public.set_concern_listening_completed(uuid) from public;
revoke execute on function public.set_concern_listening_completed(uuid) from anon;
grant execute on function public.set_concern_listening_completed(uuid) to authenticated;

revoke execute on function public.set_general_participation_response(uuid, text, text, text, text) from public;
revoke execute on function public.set_general_participation_response(uuid, text, text, text, text) from anon;
grant execute on function public.set_general_participation_response(uuid, text, text, text, text) to authenticated;

revoke execute on function public.set_measure_participation_response(uuid, uuid, text, text, text, text, text, text) from public;
revoke execute on function public.set_measure_participation_response(uuid, uuid, text, text, text, text, text, text) from anon;
grant execute on function public.set_measure_participation_response(uuid, uuid, text, text, text, text, text, text) to authenticated;

revoke execute on function public.set_response_priorities(uuid, uuid[]) from public;
revoke execute on function public.set_response_priorities(uuid, uuid[]) from anon;
grant execute on function public.set_response_priorities(uuid, uuid[]) to authenticated;

revoke execute on function public.set_participant_context(uuid, text, text) from public;
revoke execute on function public.set_participant_context(uuid, text, text) from anon;
grant execute on function public.set_participant_context(uuid, text, text) to authenticated;

revoke execute on function public.set_concern_listening_survey_response(uuid, text[], text, text, uuid[], uuid, uuid, text, text, text) from public;
revoke execute on function public.set_concern_listening_survey_response(uuid, text[], text, text, uuid[], uuid, uuid, text, text, text) from anon;
grant execute on function public.set_concern_listening_survey_response(uuid, text[], text, text, uuid[], uuid, uuid, text, text, text) to authenticated;

revoke execute on function public.set_next_block_vote(uuid, text) from public;
revoke execute on function public.set_next_block_vote(uuid, text) from anon;
grant execute on function public.set_next_block_vote(uuid, text) to authenticated;


-- ============================================================================
-- §A2 — Escritura privada, encontradas vía preflight real contra staging
-- (no vía análisis estático): 2 funciones más. Ver nota al inicio del
-- archivo. Mismo patrón exacto que §A.
-- ============================================================================

revoke execute on function public.set_concern_response(uuid, smallint) from public;
revoke execute on function public.set_concern_response(uuid, smallint) from anon;
grant execute on function public.set_concern_response(uuid, smallint) to authenticated;

revoke execute on function public.set_measure_response(uuid, text, text) from public;
revoke execute on function public.set_measure_response(uuid, text, text) from anon;
grant execute on function public.set_measure_response(uuid, text, text) to authenticated;


-- ============================================================================
-- §B — Lectura pública agregada: 11 funciones. EXECUTE para `anon` Y
-- `authenticated` (revocando primero de `public`/`anon` implícito y
-- volviendo a conceder explícitamente a ambos roles, siguiendo el patrón
-- pedido: revoke from public; revoke from anon; grant to anon, authenticated).
--
-- Cada una de estas 11 está confirmada, por lectura directa del código
-- cliente (no por el prefijo `get_` del nombre), como invocada desde una
-- ruta pública sin comprobación de sesión:
--
--   get_measure_position_counts, get_measure_urgency_counts,
--   get_measure_reason_counts (las 3 vía getMeasureParticipationResults,
--     src/lib/services/participationService.ts:429-435) y
--   get_general_participation_results, get_priority_results,
--   get_participation_summary (src/lib/services/participationService.ts:462,
--     484, 492) — todas llamadas incondicionalmente (si hay `round`) desde
--   src/routes/pulso/soluciones/[slug]/+page.ts:82-85, ruta sin `ssr=false`
--   y sin ninguna comprobación de `authService.getSession()`.
--
--   get_concern_listening_survey_summary, get_concern_listening_survey_total,
--   get_concern_listening_survey_territory_breakdown — vía
--   src/lib/components/pulso/SanidadListeningResults.svelte:38-40, montado
--   por SanidadListeningFlow.svelte dentro de
--   src/routes/pulso/escucha/[categoria]/+page.svelte (misma ruta pública
--   sin sesión que carga src/routes/pulso/escucha/[categoria]/+page.ts).
--
--   get_next_block_vote_total, get_next_block_vote_results — vía
--   src/lib/services/nextBlockVoteService.ts:159,174, llamadas desde
--   src/routes/pulso/proximo-bloque/+page.ts:21-25 sin comprobación de
--   sesión (el total se pide siempre; los resultados solo si
--   round.status='closed', pero esa condición es de ESTADO de la ronda,
--   no de si hay sesión).
--
-- Ninguna expone datos individuales/identificables — todas son
-- count(*)/avg(...) con group by (ver verificación exhaustiva en
-- 10_respuesta_equipo_rojo.md, sección RT-003).
-- ============================================================================

revoke execute on function public.get_measure_position_counts(uuid, uuid[]) from public;
revoke execute on function public.get_measure_position_counts(uuid, uuid[]) from anon;
grant execute on function public.get_measure_position_counts(uuid, uuid[]) to anon, authenticated;

revoke execute on function public.get_measure_urgency_counts(uuid, uuid[]) from public;
revoke execute on function public.get_measure_urgency_counts(uuid, uuid[]) from anon;
grant execute on function public.get_measure_urgency_counts(uuid, uuid[]) to anon, authenticated;

revoke execute on function public.get_measure_reason_counts(uuid, uuid[]) from public;
revoke execute on function public.get_measure_reason_counts(uuid, uuid[]) from anon;
grant execute on function public.get_measure_reason_counts(uuid, uuid[]) to anon, authenticated;

revoke execute on function public.get_general_participation_results(uuid) from public;
revoke execute on function public.get_general_participation_results(uuid) from anon;
grant execute on function public.get_general_participation_results(uuid) to anon, authenticated;

revoke execute on function public.get_priority_results(uuid) from public;
revoke execute on function public.get_priority_results(uuid) from anon;
grant execute on function public.get_priority_results(uuid) to anon, authenticated;

revoke execute on function public.get_participation_summary(uuid) from public;
revoke execute on function public.get_participation_summary(uuid) from anon;
grant execute on function public.get_participation_summary(uuid) to anon, authenticated;

revoke execute on function public.get_concern_listening_survey_summary(uuid) from public;
revoke execute on function public.get_concern_listening_survey_summary(uuid) from anon;
grant execute on function public.get_concern_listening_survey_summary(uuid) to anon, authenticated;

revoke execute on function public.get_concern_listening_survey_total(uuid) from public;
revoke execute on function public.get_concern_listening_survey_total(uuid) from anon;
grant execute on function public.get_concern_listening_survey_total(uuid) to anon, authenticated;

revoke execute on function public.get_concern_listening_survey_territory_breakdown(uuid, integer) from public;
revoke execute on function public.get_concern_listening_survey_territory_breakdown(uuid, integer) from anon;
grant execute on function public.get_concern_listening_survey_territory_breakdown(uuid, integer) to anon, authenticated;

revoke execute on function public.get_next_block_vote_total(uuid) from public;
revoke execute on function public.get_next_block_vote_total(uuid) from anon;
grant execute on function public.get_next_block_vote_total(uuid) to anon, authenticated;

revoke execute on function public.get_next_block_vote_results(uuid) from public;
revoke execute on function public.get_next_block_vote_results(uuid) from anon;
grant execute on function public.get_next_block_vote_results(uuid) to anon, authenticated;

-- Total §A + §A2 + §B = 23 funciones (10 + 2 escritura privada + 11 lectura
-- pública agregada). NOTA: 06_revision_critica.md y 09_pruebas_parche_0042.md
-- todavía dicen 21 (10+11) — no actualizados en esta revisión, solo se pidió
-- ampliar 08. Si se necesita ese ajuste, avisar explícitamente.


-- ============================================================================
-- §C — H-02 completo: valida `option_code` en AMBAS funciones
-- (set_concern_listening_priorities Y set_concern_listening_detail),
-- aplica la decisión de producto:
--   - category = 'vivienda'  -> valida contra el catálogo confirmado
--   - category = 'sanidad'   -> no debería llegar aquí nunca (usa su propio
--                                mecanismo, 0037); si llegara, se rechaza
--                                igual que cualquier categoría no soportada
--   - cualquier otra category -> rechazada con excepción explícita
--
-- CAMBIO DE ESTA REVISIÓN: `set search_path = ''` en vez de
-- `set search_path to 'public'`. Con search_path vacío, CUALQUIER
-- referencia sin calificar a un objeto que no sea de pg_catalog (siempre
-- implícito, ver comentario de Postgres: "the system catalog schema,
-- pg_catalog, is always effectively part of the search path") fallaría al
-- prepararse o ejecutarse por primera vez — PL/pgSQL no resuelve los
-- nombres de las sentencias SQL embebidas en el momento de `create
-- function` (solo valida la sintaxis del bloque plpgsql), así que el fallo
-- ocurriría en la primera invocación real, no al crear la función. Sigue
-- siendo una defensa más estricta que fijar a 'public' (falla explícita en
-- vez de resolver contra un esquema equivocado), independiente de si
-- `anon`/`authenticated` tienen CREATE sobre public (ver
-- 07_preflight_produccion.sql §4). Todas las tablas se referencian como
-- `public.<tabla>`, y `auth.uid()` como `auth.uid()` — ya lo eran en la
-- versión anterior de este parche (no hay ninguna referencia sin calificar
-- en el cuerpo real, así que este matiz es sobre cuándo fallaría *si* la
-- hubiera, no una advertencia de que exista), así
-- que el cambio de search_path no requiere ningún otro ajuste al cuerpo.
--
-- REQUIERE_DECISION_PRODUCTO (sigue sin resolver): el catálogo de abajo se
-- extrajo de src/lib/data/viviendaListeningOptions.ts. Confirmar que sigue
-- siendo la fuente de verdad vigente antes de aplicar. Ver
-- 06_revision_critica.md §7 para la recomendación de mover esto a una tabla
-- de catálogo en el futuro.
-- ============================================================================

create or replace function public.set_concern_listening_priorities(
	p_round_id uuid,
	p_option_codes text[]
) returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
	v_user_id uuid := auth.uid();
	v_count integer;
	v_distinct_count integer;
	v_round_category text;
	-- Extraído de src/lib/data/viviendaListeningOptions.ts — confirmar
	-- contra el archivo real antes de aplicar.
	v_valid_vivienda_codes text[] := array[
		'precio_alquiler', 'dificultad_compra', 'emancipacion_juvenil', 'falta_vivienda_publica',
		'inestabilidad_impagos', 'sinhogarismo', 'presion_turistica', 'viviendas_vacias',
		'mal_estado_accesibilidad', 'falta_vivienda_rural'
	];
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	-- Validaciones existentes sin cambios (0033_fix_listening_priorities_rank_order.sql):
	v_count := coalesce(array_length(p_option_codes, 1), 0);
	if v_count > 3 then
		raise exception 'Puedes elegir como máximo tres preocupaciones.';
	end if;

	select count(distinct c) into v_distinct_count from unnest(p_option_codes) as c;
	if v_distinct_count <> v_count then
		raise exception 'No puedes elegir la misma preocupación más de una vez.';
	end if;

	-- Antes: `select 1 ... where status='open'` (solo existencia). Ahora
	-- también se recupera category para el gate nuevo de abajo — mismo
	-- criterio de "ronda abierta", sin relajarlo. Referencia calificada por
	-- esquema (search_path = '').
	select category into v_round_category
	from public.concern_listening_rounds
	where id = p_round_id and status = 'open';

	if v_round_category is null then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	-- NUEVO (H-02 + decisión de producto): rechazar cualquier categoría sin
	-- catálogo confirmado. 'sanidad' usa set_concern_listening_survey_response
	-- (0037), nunca debería invocar esta función — si ocurre, es un bug de
	-- llamada, no un caso válido a soportar en silencio.
	if v_round_category <> 'vivienda' then
		raise exception 'Esta categoría todavía no admite este tipo de participación.';
	end if;

	-- NUEVO (H-02): catálogo cerrado, ya no se acepta texto arbitrario.
	if v_count > 0 and exists (
		select 1 from unnest(p_option_codes) as c where not (c = any (v_valid_vivienda_codes))
	) then
		raise exception 'Selecciona preocupaciones válidas.';
	end if;

	-- Resto de la función sin cambios (0033), referencias ya calificadas:
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
set search_path = ''
as $function$
declare
	v_user_id uuid := auth.uid();
	v_round_category text;
	-- Mismo catálogo que set_concern_listening_priorities — ver nota de
	-- REQUIERE_DECISION_PRODUCTO arriba sobre mantenerlo sincronizado.
	v_valid_vivienda_codes text[] := array[
		'precio_alquiler', 'dificultad_compra', 'emancipacion_juvenil', 'falta_vivienda_publica',
		'inestabilidad_impagos', 'sinhogarismo', 'presion_turistica', 'viviendas_vacias',
		'mal_estado_accesibilidad', 'falta_vivienda_rural'
	];
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	-- Validaciones existentes sin cambios (0032_escucha_vivienda.sql):
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

	-- Antes: `select 1 ... where status='open'` (solo existencia). Ahora
	-- también se recupera category, mismo criterio de "ronda abierta".
	-- Referencia calificada por esquema (search_path = '').
	select category into v_round_category
	from public.concern_listening_rounds
	where id = p_round_id and status = 'open';

	if v_round_category is null then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	-- NUEVO (H-02 + decisión de producto): mismo gate de categoría que
	-- set_concern_listening_priorities.
	if v_round_category <> 'vivienda' then
		raise exception 'Esta categoría todavía no admite este tipo de participación.';
	end if;

	-- NUEVO (H-02, requisito explícito del encargo: "no confiar únicamente
	-- en que el código se insertó previamente mediante otra función").
	-- Validación INDEPENDIENTE del option_code recibido, no solo de que ya
	-- exista una fila con ese código: así una fila histórica con un código
	-- inválido (insertada antes de este parche) tampoco puede recibir
	-- nueva profundización a través de esta función.
	if not (p_option_code = any (v_valid_vivienda_codes)) then
		raise exception 'Selecciona una preocupación válida.';
	end if;

	-- Validación existente sin cambios: la preocupación debe estar
	-- seleccionada como prioridad antes de poder profundizar en ella.
	-- Referencia calificada por esquema.
	if not exists (
		select 1 from public.concern_listening_responses
		where round_id = p_round_id and user_id = v_user_id and option_code = p_option_code and rank is not null
	) then
		raise exception 'Selecciona antes esta preocupación como prioridad.';
	end if;

	-- Resto de la función sin cambios (0032), referencia ya calificada:
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


-- NO_EJECUTAR_SIN_REVISAR: `set_concern_listening_context` y
-- `set_concern_listening_completed` NO se tocan en §C — no reciben
-- `option_code` como parámetro, así que H-02 (validación de catálogo) no
-- les aplica directamente. Se consideró añadirles también el gate de
-- categoría por consistencia, pero eso excedería el alcance exacto de H-02
-- — se deja fuera deliberadamente; si se quiere esa consistencia
-- adicional, es una decisión de producto separada.


commit;


-- ============================================================================
-- Verificación posterior recomendada (staging), ver 09_pruebas_parche_0042.md
-- para el detalle completo:
--   1. Repetir la consulta §3 de 07_preflight_produccion.sql (ampliada con
--      set_concern_response y set_measure_response, ver §A2) — las 12 filas
--      "escritura_privada" deben dar anon_execute=false; las 11 filas
--      "lectura_publica" deben dar anon_execute=true Y
--      authenticated_execute=true. set_concern_response/set_measure_response
--      en particular deben pasar de anon_execute=true (confirmado en
--      seguridad/11_resultados_preflight_staging.md) a false.
--   2. Cargar /pulso/soluciones/[slug], /pulso/escucha/sanidad y
--      /pulso/proximo-bloque SIN sesión (navegador en incógnito o curl sin
--      Authorization) y confirmar que las 3 páginas siguen mostrando los
--      agregados públicos sin error 401/403 — esta es la prueba que la
--      versión anterior de esta migración habría roto.
--   3. select set_concern_listening_priorities('<round_id_vivienda_abierta>', array['no_existe']);
--      -> debe lanzar 'Selecciona preocupaciones válidas.'
--   4. select set_concern_listening_priorities('<round_id_vivienda_abierta>', array['precio_alquiler']);
--      -> debe seguir funcionando exactamente igual que antes del parche.
--   5. select set_concern_listening_detail('<round_id_no_vivienda_si_existe>', 'cualquier_codigo');
--      -> debe lanzar 'Esta categoría todavía no admite este tipo de participación.'
-- ============================================================================
