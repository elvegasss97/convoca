-- ============================================================================
-- 0044_post_review_abuse_and_visibility_hardening.sql
--
-- Fuente de diseño: seguridad/41_post_review_hardening_plan.md (hardening
-- derivado de la revisión cruzada Kimi -> Claude, seguridad/40 y el hilo
-- "REVISIÓN KIMI — HALLAZGOS VERIFICADOS"), revisado y corregido en
-- seguridad/44_revision_0044_r2.md (0044-R2) antes de aplicarse — ver ese
-- documento para el detalle completo de las pruebas empíricas (concurrencia
-- real, ACL, normalización, round-trip de rollback) que respaldan cada
-- decisión de este archivo.
--
-- Alcance exacto (sin más cambios que estos):
--   §1 — get_attendance_counts: reproduce el mismo filtro de estado que ya
--        usa set_attendance (0014), para que no exponga conteos agregados
--        de eventos draft/pending_review/hidden/rejected.
--   §2 — set_concern_listening_survey_response: p_community se normaliza
--        (trim + '' -> NULL) ANTES de validarse contra el catálogo cerrado
--        de 19 comunidades/ciudades autónomas que usa el frontend
--        (src/lib/data/regions.ts) — evita que un valor inventado fuerce
--        la supresión completa de get_concern_listening_survey_territory_
--        breakdown, y evita rechazar valores válidos con espacios
--        incidentales.
--   §3 — Rate limiting DB-side para reports/channel_reports/concern_proposals,
--        mismo patrón ya probado en attendance_rate_limits (0014): tabla de
--        seguimiento append-only + trigger BEFORE INSERT, clave = auth.uid()
--        real (nunca un valor enviado por el cliente), serializado por
--        (auth.uid(), action) con un advisory lock transaccional — cierra
--        una carrera real confirmada empíricamente en 0044-R2 (10 inserts
--        concurrentes del mismo usuario bypasseaban el límite de 3/min por
--        completo sin el lock). ACL de write_rate_limits cerrada
--        explícitamente para PUBLIC/anon/authenticated. Mensajes de límite
--        neutrales (ventanas rolling, nunca prometen "mañana").
--
-- NO se toca: is_moderator_or_admin (REFUTADA en el análisis de origen),
-- atomicidad de delete-account (REFUTADA como problema de seguridad — el
-- mensaje de error se corrige aparte, en
-- supabase/functions/delete-account/index.ts, fuera de esta migración
-- porque no es SQL), votos/respuestas (ya protegidos por UNIQUE+upsert),
-- ni el diseño de set_attendance.
--
-- Rollback: seguridad/43_rollback_0044_candidata.sql (probado en
-- round-trip completo sobre un Postgres desechable antes de aplicar esta
-- migración — ver seguridad/44_revision_0044_r2.md §7).
-- ============================================================================

-- ----------------------------------------------------------------------
-- §1. get_attendance_counts — no debe reflejar eventos no públicos
-- ----------------------------------------------------------------------
-- Antes: agrupaba directamente sobre attendance_responses, sin comprobar el
-- estado del evento — a diferencia de set_attendance (0014), que sí exige
-- status not in ('draft','pending_review','hidden','rejected') antes de
-- aceptar una escritura. Con p_event_ids = null devolvía además el conteo
-- de TODOS los eventos de la tabla, incluidos sus id — filtrable por
-- cualquiera (anon o authenticated) sin conocer ningún UUID de antemano.
--
-- Denylist elegido deliberadamente sobre allowlist (0044-R2): es la MISMA
-- expresión, carácter a carácter, que ya usan events_select_public (0003)
-- y set_attendance (0014) para "visible públicamente" — la regla canónica
-- del proyecto. Un allowlist aquí divergería de esas dos y podría
-- desincronizarse silenciosamente si alguna cambia. El riesgo simétrico (un
-- estado nuevo que se añada sin actualizar las 3 apariciones quedaría
-- público por defecto) ya existe hoy en events_select_public/set_attendance
-- y no lo introduce este parche.

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
	join public.events e on e.id = ar.event_id
	where (p_event_ids is null or ar.event_id = any(p_event_ids))
	and e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
	group by ar.event_id;
$$;

comment on function public.get_attendance_counts is
	'Contadores agregados de asistencia (ESTIMACIONES, nunca listas de asistentes). Solo eventos en estado público (mismo filtro que set_attendance y events_select_public) — nunca refleja draft/pending_review/hidden/rejected, se conozca o no su id, ni con p_event_ids=null.';

-- Mismo signature, mismos grants ya existentes (0010) — CREATE OR REPLACE
-- los conserva, no hace falta volver a otorgarlos.

-- ----------------------------------------------------------------------
-- §2. set_concern_listening_survey_response — p_community, catálogo cerrado
-- ----------------------------------------------------------------------
-- Antes: solo char_length(p_community) <= 120. get_concern_listening_
-- survey_territory_breakdown (0043) asume un catálogo cerrado como premisa
-- de su protección anti-resta: si CUALQUIER grupo de `community` tiene
-- menos de greatest(p_min_threshold, 30) respuestas, se suprime la
-- distribución COMPLETA de la ronda. Un valor inventado crea un grupo de
-- tamaño 1 a voluntad, forzando esa supresión bajo demanda para cualquier
-- ronda — disponibilidad/integridad del propio informe de transparencia,
-- no fuga de datos privados ni de otros usuarios.
--
-- La normalización (trim + '' -> NULL) ocurre ANTES de validar contra el
-- catálogo (0044-R2 — una versión anterior la aplicaba solo al insertar,
-- después de validar, y rechazaba valores válidos con espacios
-- incidentales como ' Cataluña ').

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

	-- Paso 6: contexto voluntario. `community` se normaliza (trim + '' ->
	-- NULL) ANTES de validar contra el catálogo cerrado (mismo listado que
	-- src/lib/data/regions.ts, 19 comunidades/ciudades autónomas: 17
	-- comunidades autónomas + Ceuta + Melilla).
	p_community := nullif(trim(p_community), '');
	if p_community is not null and p_community not in (
		'Andalucía', 'Aragón', 'Principado de Asturias', 'Islas Baleares', 'Canarias',
		'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Comunidad Valenciana',
		'Extremadura', 'Galicia', 'Comunidad de Madrid', 'Región de Murcia',
		'Comunidad Foral de Navarra', 'País Vasco', 'La Rioja', 'Ciudad de Ceuta', 'Ciudad de Melilla'
	) then
		raise exception 'Selecciona una comunidad autónoma válida.';
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
		nullif(trim(p_missing_improvement), ''), p_community, p_area_type
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

-- Mismo signature, mismos grants ya existentes (0042) — CREATE OR REPLACE
-- los conserva.

-- ----------------------------------------------------------------------
-- §3. Rate limiting DB-side: reports, channel_reports, concern_proposals
-- ----------------------------------------------------------------------
-- Mismo patrón exacto que attendance_rate_limits (0014): tabla append-only
-- (nunca UPSERT, para que el conteo refleje intentos reales), clave =
-- auth.uid() real (no un valor que el cliente controle), sin política RLS
-- propia + ACL de tabla explícitamente cerrada a PUBLIC/anon/authenticated.

create table public.write_rate_limits (
	id bigint generated always as identity primary key,
	user_id uuid not null,
	action text not null check (action in ('reports', 'channel_reports', 'concern_proposals')),
	called_at timestamptz not null default now()
);

comment on table public.write_rate_limits is
	'Registro de intentos ACEPTADOS de escritura en reports/channel_reports/concern_proposals por auth.uid(), solo para limitar frecuencia. Append-only a propósito, mismo patrón que attendance_rate_limits (0014). Sin política RLS y sin ACL directa para anon/authenticated: solo la accede la función SECURITY DEFINER enforce_write_rate_limit(), vía trigger. Los intentos RECHAZADOS por el propio trigger hacen ROLLBACK de su fila (misma transacción que el INSERT que los originó), así que esta tabla nunca cuenta intentos fallidos, solo aceptados.';

alter table public.write_rate_limits enable row level security;

revoke all on public.write_rate_limits from public, anon, authenticated;

create index write_rate_limits_user_action_time_idx on public.write_rate_limits (user_id, action, called_at);

-- Límites: ráfaga corta (permite corregir un error de un clic sin más) +
-- tope diario amplio pero real, ambos ROLLING (relativos a now(), no
-- alineados a ningún límite de reloj/calendario). `concern_proposals` es
-- más restrictivo porque proponer una preocupación ciudadana es una acción
-- deliberada y poco frecuente incluso para un usuario muy comprometido;
-- `reports`/`channel_reports` permiten algo más de margen porque alguien
-- puede legítimamente reportar varias convocatorias o canales distintos en
-- una sesión de uso normal.
create or replace function public.enforce_write_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_action text := tg_argv[0];
	v_max_short integer;
	v_max_long integer;
	v_count_short integer;
	v_count_long integer;
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión.';
	end if;

	-- Serializa únicamente las transacciones concurrentes del MISMO
	-- usuario + MISMA acción. Sin esto, dos (o diez) inserts simultáneos
	-- del mismo usuario pueden contarse el uno al otro como "no
	-- comprometido todavía" bajo READ COMMITTED y saltarse el límite por
	-- completo — confirmado empíricamente en 0044-R2: 10 reports
	-- concurrentes reales (pgbench, 10 conexiones ya establecidas,
	-- disparadas a la vez) -> 10 aceptados con un límite de ráfaga de
	-- 3/min, antes de este cambio. Ámbito de TRANSACCIÓN
	-- (pg_advisory_xact_lock, no de sesión): se libera solo al
	-- COMMIT/ROLLBACK de la propia inserción, sin desbloqueo manual.
	-- Claves independientes por usuario y por acción (dos enteros de 32
	-- bits, hashtext de cada valor por separado, no concatenados) para que
	-- usuarios distintos y acciones distintas del mismo usuario nunca se
	-- bloqueen entre sí — no es un lock global.
	perform pg_advisory_xact_lock(hashtext(v_user_id::text), hashtext(v_action));

	if v_action = 'concern_proposals' then
		v_max_short := 1;
		v_max_long := 5;
	else
		v_max_short := 3;
		v_max_long := 15;
	end if;

	insert into public.write_rate_limits (user_id, action) values (v_user_id, v_action);

	select count(*) into v_count_short
	from public.write_rate_limits
	where user_id = v_user_id and action = v_action and called_at > now() - interval '1 minute';
	if v_count_short > v_max_short then
		raise exception 'Has alcanzado el límite temporal para esta acción. Inténtalo de nuevo más tarde.';
	end if;

	select count(*) into v_count_long
	from public.write_rate_limits
	where user_id = v_user_id and action = v_action and called_at > now() - interval '1 day';
	if v_count_long > v_max_long then
		raise exception 'Has alcanzado el límite temporal para esta acción. Inténtalo de nuevo más tarde.';
	end if;

	return new;
end;
$$;

revoke execute on function public.enforce_write_rate_limit() from public, anon, authenticated;

create trigger enforce_reports_rate_limit
	before insert on public.reports
	for each row execute function public.enforce_write_rate_limit('reports');

create trigger enforce_channel_reports_rate_limit
	before insert on public.channel_reports
	for each row execute function public.enforce_write_rate_limit('channel_reports');

create trigger enforce_concern_proposals_rate_limit
	before insert on public.concern_proposals
	for each row execute function public.enforce_write_rate_limit('concern_proposals');

-- Purga programada, mismo patrón que purge_old_attendance_rate_limits (0014).
create or replace function public.purge_old_write_rate_limits()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	delete from public.write_rate_limits where called_at < now() - interval '2 days';
end;
$$;

revoke execute on function public.purge_old_write_rate_limits() from public, anon, authenticated;

select cron.schedule(
	'purge-old-write-rate-limits',
	'20 3 * * *',
	$$select public.purge_old_write_rate_limits();$$
)
where not exists (
	select 1 from cron.job where jobname = 'purge-old-write-rate-limits'
);

-- ============================================================================
-- Fin de 0044.
-- ============================================================================
