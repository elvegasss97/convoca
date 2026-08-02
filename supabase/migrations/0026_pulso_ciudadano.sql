-- 0026_pulso_ciudadano.sql
--
-- "Pulso ciudadano": mide qué preocupa a la comunidad ANTES de que exista
-- una movilización (preocupación → apoyo ciudadano → resultado colectivo →
-- convocatoria). No es una encuesta representativa de España: solo agrega
-- respuestas de quien participa en Convoca (ver `publisher_label` y el
-- aviso obligatorio que renderiza el cliente en cada pantalla de resultados).
--
-- Qué crea (nada destructivo, solo tablas/funciones nuevas):
--   1. `public.concerns` — preguntas ("preocupaciones") publicadas por
--      Convoca (nunca libremente por usuarios, ver `concern_proposals`).
--   2. `public.concern_responses` — una respuesta activa por cuenta y
--      preocupación (nivel 1-5). Sigue el mismo patrón de
--      `attendance_responses`/`set_attendance` (0009): sin política de
--      escritura directa, todo pasa por `set_concern_response()`, que usa
--      `auth.uid()` internamente — el cliente nunca puede indicar de quién
--      es la respuesta. A diferencia de `attendance_responses` (anónima,
--      sin cuenta), aquí SÍ hay `user_id`, porque el encargo exige cuenta
--      autenticada para votar; aun así, no hay política de SELECT pública
--      — los resultados individuales nunca se exponen, solo agregados vía
--      `get_concern_results()`.
--   3. `public.concern_proposals` — propuestas ciudadanas de nuevas
--      preocupaciones, en revisión (pending/approved/rejected). Nunca se
--      publican solas: si se aprueban, moderación crea la `concern` real.
--   4. `public.concern_events` — relación N:M entre preocupaciones y
--      convocatorias relacionadas.
--
-- Autorización: reutiliza `public.is_moderator_or_admin()` (0001), el mismo
-- rol que ya protege `/moderacion` — no se crea ningún sistema de roles
-- nuevo. Cómo se asciende a alguien a moderador/admin: igual que hoy (ver
-- comentario de 0001), a mano vía SQL Editor de Supabase:
--   update public.profiles set role = 'admin' where id = '<uuid-del-usuario>';

-- ---------------------------------------------------------------------------
-- 1. concerns
-- ---------------------------------------------------------------------------

create table public.concerns (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	category text not null check (
		category in ('vivienda', 'sanidad', 'empleo', 'educacion', 'seguridad', 'coste_vida', 'transporte', 'medioambiente')
	),
	question text not null,
	description text not null default '',
	-- "Quién la publica": inicialmente siempre "Convoca" (el encargo es
	-- explícito: las preguntas principales solo las publica Convoca). Campo
	-- de texto, no un id de organizador, porque no es un perfil público de
	-- organizador — es la propia plataforma.
	publisher_label text not null default 'Convoca',
	scope_type text not null default 'nacional' check (
		scope_type in ('nacional', 'comunidad_autonoma', 'provincia', 'municipio')
	),
	-- Nombre de la comunidad/provincia/municipio (ver `src/lib/data/regions.ts`
	-- para comunidades y provincias reales, y `src/lib/data/cities.ts` para
	-- municipios). null cuando scope_type = 'nacional'.
	scope_value text,
	status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
	starts_at timestamptz not null default now(),
	-- null = "permanece activa" (sin fecha de cierre). Ver tarjetas públicas.
	closes_at timestamptz,
	-- Cuenta de moderación/administración que la creó. Nullable: las 8
	-- preocupaciones semilla de esta misma migración no están ligadas a una
	-- cuenta humana real.
	created_by uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint concerns_scope_value_consistency check (
		(scope_type = 'nacional' and scope_value is null)
		or (scope_type <> 'nacional' and scope_value is not null)
	),
	constraint concerns_closes_after_starts check (closes_at is null or closes_at > starts_at)
);

comment on table public.concerns is
	'"Pulso ciudadano": preguntas publicadas por Convoca para medir preocupación ciudadana. Nunca representativas de toda España — solo participantes de la plataforma.';
comment on column public.concerns.publisher_label is
	'Texto de "quién publica". Siempre "Convoca" por ahora (las preguntas principales no las crean usuarios).';

alter table public.concerns enable row level security;

create index concerns_status_idx on public.concerns (status);
create index concerns_scope_idx on public.concerns (scope_type, scope_value);

create trigger concerns_set_updated_at
	before update on public.concerns
	for each row
	execute function public.set_updated_at();

-- Lectura pública de lo publicado; moderación/administración ven también
-- borradores y archivadas (necesario para el panel de gestión).
create policy "concerns_select_public_or_staff"
	on public.concerns for select
	to anon, authenticated
	using (status = 'published' or public.is_moderator_or_admin());

create policy "concerns_insert_staff"
	on public.concerns for insert
	to authenticated
	with check (public.is_moderator_or_admin());

create policy "concerns_update_staff"
	on public.concerns for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- Sin política de DELETE para nadie: igual que las convocatorias, una
-- preocupación se despublica/archiva, nunca se borra (conserva el
-- historial de respuestas).

-- ---------------------------------------------------------------------------
-- 2. concern_responses
-- ---------------------------------------------------------------------------

create table public.concern_responses (
	id uuid primary key default gen_random_uuid(),
	concern_id uuid not null references public.concerns (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	level smallint not null check (level between 1 and 5),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (concern_id, user_id)
);

comment on table public.concern_responses is
	'Una respuesta activa por cuenta y preocupación (nivel 1-5). Sin política de escritura directa: toda mutación pasa por set_concern_response(). Nunca expuesta individualmente, solo agregada vía get_concern_results().';

alter table public.concern_responses enable row level security;

create index concern_responses_concern_id_idx on public.concern_responses (concern_id);
create index concern_responses_user_id_idx on public.concern_responses (user_id);

create trigger concern_responses_set_updated_at
	before update on public.concern_responses
	for each row
	execute function public.set_updated_at();

-- Solo la propia cuenta puede ver su respuesta (para el estado "ya
-- respondida" y precargar el nivel al cambiarla) o moderación/administración
-- (para poder contar respuestas totales sin depender solo del agregado, sin
-- que la interfaz llegue a mostrar qué respondió cada persona). Sin
-- políticas de insert/update/delete: solo la función de abajo escribe.
create policy "concern_responses_select_own_or_staff"
	on public.concern_responses for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- set_concern_response(): único punto de escritura de concern_responses.
-- SECURITY DEFINER + auth.uid() interno: el cliente solo puede votar como
-- sí mismo, nunca en nombre de otra cuenta. El upsert sobre (concern_id,
-- user_id) hace que cambiar de opinión actualice la misma fila — nunca
-- suma un participante nuevo.
-- ---------------------------------------------------------------------------

create or replace function public.set_concern_response(p_concern_id uuid, p_level smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para responder.';
	end if;

	if p_level is null or p_level < 1 or p_level > 5 then
		raise exception 'Selecciona un nivel de respuesta válido.';
	end if;

	if not exists (
		select 1 from public.concerns c
		where c.id = p_concern_id
		and c.status = 'published'
		and c.starts_at <= now()
		and (c.closes_at is null or c.closes_at > now())
	) then
		raise exception 'Esta preocupación no admite respuestas en este momento.';
	end if;

	insert into public.concern_responses (concern_id, user_id, level)
	values (p_concern_id, v_user_id, p_level)
	on conflict (concern_id, user_id)
	do update set level = excluded.level, updated_at = now();
end;
$$;

comment on function public.set_concern_response is
	'Único punto de escritura de concern_responses. auth.uid() interno: el id de usuario nunca llega como parámetro del cliente.';

revoke execute on function public.set_concern_response(uuid, smallint) from public;
grant execute on function public.set_concern_response(uuid, smallint) to authenticated;
-- Explícitamente NO se concede a `anon`: solo cuentas autenticadas votan.

-- ---------------------------------------------------------------------------
-- get_concern_results(): agregado público (recuento por nivel), igual que
-- get_attendance_counts (0010) — expone conteos, nunca filas individuales.
-- ---------------------------------------------------------------------------

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

revoke execute on function public.get_concern_results(uuid[]) from public;
grant execute on function public.get_concern_results(uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_pulso_participant_count(): número total de personas distintas que han
-- respondido al menos una preocupación. Dato real (nunca inventado) para la
-- cabecera de /pulso.
-- ---------------------------------------------------------------------------

create or replace function public.get_pulso_participant_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
	select count(distinct user_id) from public.concern_responses;
$$;

revoke execute on function public.get_pulso_participant_count() from public;
grant execute on function public.get_pulso_participant_count() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. concern_proposals
-- ---------------------------------------------------------------------------

create table public.concern_proposals (
	id uuid primary key default gen_random_uuid(),
	proposer_user_id uuid not null references auth.users (id) on delete cascade,
	title text not null,
	proposed_question text not null,
	category text not null check (
		category in ('vivienda', 'sanidad', 'empleo', 'educacion', 'seguridad', 'coste_vida', 'transporte', 'medioambiente')
	),
	description text not null default '',
	scope_type text not null default 'nacional' check (
		scope_type in ('nacional', 'comunidad_autonoma', 'provincia', 'municipio')
	),
	scope_value text,
	reason text not null,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	reviewer_note text,
	reviewed_by uuid references auth.users (id) on delete set null,
	reviewed_at timestamptz,
	-- Si se aprueba y moderación crea la concern real a partir de ella.
	resulting_concern_id uuid references public.concerns (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint concern_proposals_scope_value_consistency check (
		(scope_type = 'nacional' and scope_value is null)
		or (scope_type <> 'nacional' and scope_value is not null)
	)
);

comment on table public.concern_proposals is
	'Propuestas ciudadanas de nuevas preocupaciones a medir. Nunca se publican solas: requieren revisión y, si se aprueban, una concern real creada por moderación.';

alter table public.concern_proposals enable row level security;

create index concern_proposals_status_idx on public.concern_proposals (status);
create index concern_proposals_proposer_idx on public.concern_proposals (proposer_user_id);

create trigger concern_proposals_set_updated_at
	before update on public.concern_proposals
	for each row
	execute function public.set_updated_at();

create policy "concern_proposals_select_own_or_staff"
	on public.concern_proposals for select
	to authenticated
	using (proposer_user_id = auth.uid() or public.is_moderator_or_admin());

create policy "concern_proposals_insert_own"
	on public.concern_proposals for insert
	to authenticated
	with check (proposer_user_id = auth.uid());

create policy "concern_proposals_update_staff"
	on public.concern_proposals for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- Defensa en profundidad: aunque no hay ninguna política que permita a
-- quien propone fijar `status`/`reviewed_*` directamente (solo pueden
-- insertar, y la política de update es solo para moderación), este trigger
-- fuerza esos campos en cada INSERT sea cual sea el payload recibido.
create or replace function public.enforce_concern_proposal_insert()
returns trigger
language plpgsql
as $$
begin
	new.status := 'pending';
	new.reviewer_note := null;
	new.reviewed_by := null;
	new.reviewed_at := null;
	new.resulting_concern_id := null;
	return new;
end;
$$;

create trigger concern_proposals_enforce_insert
	before insert on public.concern_proposals
	for each row
	execute function public.enforce_concern_proposal_insert();

-- Ni siquiera moderación puede reasignar de quién es la propuesta original.
create or replace function public.prevent_concern_proposal_reassignment()
returns trigger
language plpgsql
as $$
begin
	if new.proposer_user_id is distinct from old.proposer_user_id then
		raise exception 'No se puede reasignar una propuesta a otra cuenta.';
	end if;
	return new;
end;
$$;

create trigger concern_proposals_prevent_reassignment
	before update on public.concern_proposals
	for each row
	execute function public.prevent_concern_proposal_reassignment();

-- ---------------------------------------------------------------------------
-- 4. concern_events — relación N:M con convocatorias relacionadas
-- ---------------------------------------------------------------------------

create table public.concern_events (
	concern_id uuid not null references public.concerns (id) on delete cascade,
	event_id uuid not null references public.events (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (concern_id, event_id)
);

comment on table public.concern_events is
	'Relación N:M entre preocupaciones y convocatorias relacionadas. Gestionada solo por moderación/administración.';

alter table public.concern_events enable row level security;

create index concern_events_event_id_idx on public.concern_events (event_id);

-- Visible cuando la preocupación es pública (o para moderación/administración).
create policy "concern_events_select_public_or_staff"
	on public.concern_events for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.concerns c where c.id = concern_id and c.status = 'published')
	);

create policy "concern_events_insert_staff"
	on public.concern_events for insert
	to authenticated
	with check (public.is_moderator_or_admin());

create policy "concern_events_delete_staff"
	on public.concern_events for delete
	to authenticated
	using (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- Semillas: 8 preocupaciones iniciales, una por categoría, formuladas de
-- forma neutral (contenido claramente de desarrollo/arranque — sin ligar a
-- ninguna cuenta real, `created_by` queda null a propósito). Ámbito
-- nacional: son la medición base antes de segmentar por territorio.
-- ---------------------------------------------------------------------------

insert into public.concerns (slug, category, question, description, status, starts_at)
values
	(
		'vivienda-asequible',
		'vivienda',
		'¿Cuánto te preocupa actualmente el acceso a una vivienda asequible?',
		'Mide la preocupación ciudadana por el precio y la disponibilidad de vivienda, ya sea en alquiler o en compra.',
		'published',
		now()
	),
	(
		'sanidad-tiempos-espera',
		'sanidad',
		'¿Cuánto te preocupan los tiempos de espera en la sanidad pública?',
		'Mide la preocupación por las listas de espera para consultas, pruebas diagnósticas e intervenciones.',
		'published',
		now()
	),
	(
		'coste-de-vida',
		'coste_vida',
		'¿Cuánto te preocupa el aumento del coste de vida?',
		'Mide la preocupación por la evolución de precios de bienes y servicios básicos frente a los ingresos.',
		'published',
		now()
	),
	(
		'empleo-estabilidad',
		'empleo',
		'¿Cuánto te preocupa la estabilidad y calidad del empleo?',
		'Mide la preocupación por la temporalidad, las condiciones laborales y las perspectivas de empleo.',
		'published',
		now()
	),
	(
		'transporte-publico',
		'transporte',
		'¿Cuánto te preocupa el acceso al transporte público en tu zona?',
		'Mide la preocupación por la frecuencia, cobertura y precio del transporte público.',
		'published',
		now()
	),
	(
		'calidad-educacion',
		'educacion',
		'¿Cuánto te preocupa la calidad de la educación?',
		'Mide la preocupación por los recursos, el profesorado y las condiciones del sistema educativo.',
		'published',
		now()
	),
	(
		'seguridad-entorno',
		'seguridad',
		'¿Cuánto te preocupa la seguridad en tu entorno?',
		'Mide la percepción de seguridad en el barrio, municipio o zona donde vives.',
		'published',
		now()
	),
	(
		'cambio-climatico-zona',
		'medioambiente',
		'¿Cuánto te preocupan los efectos del cambio climático en tu zona?',
		'Mide la preocupación por sequías, olas de calor, inundaciones u otros efectos locales del cambio climático.',
		'published',
		now()
	);
