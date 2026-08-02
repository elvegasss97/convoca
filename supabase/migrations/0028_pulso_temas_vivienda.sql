-- 0028_pulso_temas_vivienda.sql
--
-- Amplía el esquema de "Temas" (0027) con lo que exige la plantilla real de
-- un plan con medidas agrupadas en ejes, calendario, riesgos/indicadores e
-- historial de versiones. Todo aditivo: no borra ni reescribe ninguna
-- columna ni fila existente. Sin contenido político — ninguna fila
-- semilla, igual que 0026/0027.
--
-- Qué crea/cambia:
--   1. `topics`: campos de cabecera del plan (documento, inversión, % PIB,
--      objetivo de referencia) y dos listas topic-wide ("qué podría salir
--      mal" / "cómo sabríamos si funciona").
--   2. `topic_measure_axes` — los ejes que agrupan visualmente las medidas
--      (p. ej. "Construir más vivienda"). Puramente organizativo: no son
--      medidas nuevas.
--   3. `topic_measures`: resumen breve, problema que resuelve, cómo
--      funciona, indicadores propios, y el eje al que pertenece.
--   4. `topic_timeline_phases` — fases del calendario (100 días /
--      implantación / objetivo), sin reparto presupuestario inventado.
--   5. `topic_versions` — historial real de publicaciones (una fila por
--      "publicar nueva versión" desde el panel).
--   6. `topic_measure_sources` — vincula fuentes ya existentes
--      (`topic_sources`) a una medida concreta.
--   7. `topic_measure_alternatives`: gana `topic_id` (siempre presente) y
--      `measure_id` pasa a ser opcional — permite reutilizar el mismo
--      sistema de alternativas tanto para "modificaría esta medida" como
--      para "proponer una modificación general" del tema completo.

-- ---------------------------------------------------------------------------
-- 1. topics — cabecera del plan
-- ---------------------------------------------------------------------------

alter table public.topics
	add column document_title text,
	add column investment_range text,
	add column investment_gdp_percent text,
	add column reference_goal text,
	add column risks_overview text[] not null default '{}',
	add column success_indicators text[] not null default '{}';

comment on column public.topics.document_title is
	'Nombre del documento/plan (p. ej. "Plan Vivienda 2036"), distinto del título corto del tema.';
comment on column public.topics.risks_overview is
	'"Qué podría salir mal": lista de riesgos a nivel de todo el tema (no de una medida concreta).';
comment on column public.topics.success_indicators is
	'"Cómo sabríamos si funciona": indicadores de seguimiento a nivel de todo el tema.';

-- ---------------------------------------------------------------------------
-- 2. topic_measure_axes — agrupación visual de medidas
-- ---------------------------------------------------------------------------

create table public.topic_measure_axes (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	title text not null,
	sort_order integer not null default 0,
	created_at timestamptz not null default now()
);

comment on table public.topic_measure_axes is
	'Ejes que agrupan visualmente las medidas de un tema (p. ej. "Construir más vivienda"). Organización de presentación, no medidas adicionales.';

alter table public.topic_measure_axes enable row level security;

create index topic_measure_axes_topic_id_idx on public.topic_measure_axes (topic_id);

create policy "topic_measure_axes_select_public_or_staff"
	on public.topic_measure_axes for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_measure_axes_write_staff"
	on public.topic_measure_axes for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 3. topic_measures — campos adicionales de cada medida
-- ---------------------------------------------------------------------------

alter table public.topic_measures
	add column axis_id uuid references public.topic_measure_axes (id) on delete set null,
	add column summary text,
	add column problem_addressed text,
	add column how_it_works text,
	add column indicators text[] not null default '{}';

comment on column public.topic_measures.summary is
	'Resumen breve para la tarjeta colapsada, distinto de la explicación completa.';
comment on column public.topic_measures.problem_addressed is
	'Problema concreto que esta medida intenta resolver.';
comment on column public.topic_measures.indicators is
	'"Indicadores para medirla": lista propia de esta medida (distinta de los indicadores generales del tema).';

create index topic_measures_axis_id_idx on public.topic_measures (axis_id);

-- ---------------------------------------------------------------------------
-- 4. topic_timeline_phases — calendario del plan
-- ---------------------------------------------------------------------------

create table public.topic_timeline_phases (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	title text not null,
	description text not null default '',
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.topic_timeline_phases is
	'Fases del calendario de despliegue de un tema (p. ej. "Primeros 100 días"). Sin reparto presupuestario: solo título y descripción.';

alter table public.topic_timeline_phases enable row level security;

create index topic_timeline_phases_topic_id_idx on public.topic_timeline_phases (topic_id);

create trigger topic_timeline_phases_set_updated_at
	before update on public.topic_timeline_phases
	for each row
	execute function public.set_updated_at();

create policy "topic_timeline_phases_select_public_or_staff"
	on public.topic_timeline_phases for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_timeline_phases_write_staff"
	on public.topic_timeline_phases for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 5. topic_versions — historial real de publicaciones
-- ---------------------------------------------------------------------------

create table public.topic_versions (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	version_label text not null,
	note text,
	published_by uuid references auth.users (id) on delete set null,
	published_at timestamptz not null default now()
);

comment on table public.topic_versions is
	'Historial real de versiones publicadas de un tema. Una fila por cada "publicar nueva versión" desde el panel — nunca contenido inventado.';

alter table public.topic_versions enable row level security;

create index topic_versions_topic_id_idx on public.topic_versions (topic_id);

create policy "topic_versions_select_public_or_staff"
	on public.topic_versions for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_versions_insert_staff"
	on public.topic_versions for insert
	to authenticated
	with check (public.is_moderator_or_admin());

-- Sin política de UPDATE/DELETE: un historial de versiones no se reescribe.

-- ---------------------------------------------------------------------------
-- 6. topic_measure_sources — fuentes vinculadas a una medida concreta
-- ---------------------------------------------------------------------------

create table public.topic_measure_sources (
	measure_id uuid not null references public.topic_measures (id) on delete cascade,
	source_id uuid not null references public.topic_sources (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (measure_id, source_id)
);

comment on table public.topic_measure_sources is
	'Relación N:M entre medidas y las fuentes verificables del tema (topic_sources) — reutiliza la misma fuente en varias medidas sin duplicarla.';

alter table public.topic_measure_sources enable row level security;

create index topic_measure_sources_source_id_idx on public.topic_measure_sources (source_id);

create policy "topic_measure_sources_select_public_or_staff"
	on public.topic_measure_sources for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (
			select 1 from public.topic_measures m
			join public.topics t on t.id = m.topic_id
			where m.id = measure_id and t.status in ('open', 'reviewed')
		)
	);

create policy "topic_measure_sources_write_staff"
	on public.topic_measure_sources for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 7. topic_measure_alternatives — generaliza a "modificación general del tema"
-- ---------------------------------------------------------------------------

alter table public.topic_measure_alternatives
	add column topic_id uuid references public.topics (id) on delete cascade;

-- Backfill defensivo (la tabla está vacía en este momento, pero deja la
-- migración correcta si alguna vez hay filas previas): resuelve el tema a
-- partir de la medida ya existente en cada fila.
update public.topic_measure_alternatives ma
set topic_id = m.topic_id
from public.topic_measures m
where ma.measure_id = m.id
and ma.topic_id is null;

alter table public.topic_measure_alternatives
	alter column topic_id set not null;

alter table public.topic_measure_alternatives
	alter column measure_id drop not null;

comment on column public.topic_measure_alternatives.measure_id is
	'null = alternativa general sobre el tema completo ("proponer una modificación general"), no ligada a una medida concreta.';

create index topic_measure_alternatives_topic_id_idx on public.topic_measure_alternatives (topic_id);

-- La política de lectura pública original solo consideraba 'approved' sin
-- mirar el tema; se sustituye por una that funciona igual para
-- alternativas generales (measure_id null) y de medida.
drop policy "topic_measure_alternatives_select_approved_own_or_staff" on public.topic_measure_alternatives;

create policy "topic_measure_alternatives_select_approved_own_or_staff"
	on public.topic_measure_alternatives for select
	to anon, authenticated
	using (
		status = 'approved'
		or (auth.uid() is not null and proposer_user_id = auth.uid())
		or public.is_moderator_or_admin()
	);

-- El trigger de inserción (enforce_topic_measure_alternative_insert, 0027)
-- ya fuerza status/reviewer_* sin tocar topic_id/measure_id: sigue
-- funcionando igual, no requiere cambios.
