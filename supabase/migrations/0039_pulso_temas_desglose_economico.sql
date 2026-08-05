-- 0039_pulso_temas_desglose_economico.sql
--
-- Estructura el desglose económico de un tema, hoy solo texto narrativo
-- (`topics.budget_narrative`), para poder representarlo como gráfico
-- interactivo (donut por línea/por medida, selector de escenario, barra de
-- distribución temporal) en la sección "Coste" de la página pública.
--
-- No sustituye `budget_narrative`: sigue existiendo como desarrollo
-- completo en prosa ("Ver desglose económico completo"). Esta migración
-- añade la misma información ya publicada, pero también en forma
-- estructurada, para poder dibujarla sin parsear texto en cliente.
--
-- Mismo patrón de RLS que el resto de tablas hijas de `topics`
-- (`topic_sources`, `topic_data_points`, `topic_measures`): lectura pública
-- cuando el tema está publicado, escritura solo moderación/administración,
-- sin política de DELETE (se archiva el tema, no se borran sus filas).
--
-- Qué crea:
--   1. `public.topic_budget_lines` — líneas presupuestarias (p. ej. las 6 de
--      Vivienda: parque público, suelo, rehabilitación...).
--   2. `public.topic_budget_scenarios` — escenarios (mínimo/central/máximo).
--   3. `public.topic_budget_timeline` — distribución anual 2027–2036.
--   4. Columnas nuevas en `public.topic_measures`: `estimated_cost_min` y
--      `estimated_cost_max` (numeric), aditivas — `estimated_cost` (texto)
--      no se toca, sigue siendo la fuente para las tarjetas de medida y el
--      mapa interactivo.
--   5. Columna nueva en `public.topics`: `budget_double_count_rules
--      text[]`, mismo patrón que la ya existente `risks_overview text[]`.

-- ---------------------------------------------------------------------------
-- 1. topic_budget_lines — líneas presupuestarias
-- ---------------------------------------------------------------------------

create table public.topic_budget_lines (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	name text not null,
	min_amount numeric not null,
	max_amount numeric not null,
	description text,
	note text,
	-- Token de color del proyecto (p. ej. 'brand-700', 'accent-600'), nunca
	-- un hexadecimal suelto: el cliente lo resuelve a var(--color-*).
	color_token text not null,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint topic_budget_lines_amount_check check (max_amount >= min_amount)
);

comment on table public.topic_budget_lines is
	'Desglose estructurado de topics.budget_narrative por línea presupuestaria, para representarlo como gráfico. El texto narrativo completo sigue siendo la fuente de referencia.';

alter table public.topic_budget_lines enable row level security;

create index topic_budget_lines_topic_id_idx on public.topic_budget_lines (topic_id);

create trigger topic_budget_lines_set_updated_at
	before update on public.topic_budget_lines
	for each row
	execute function public.set_updated_at();

create policy "topic_budget_lines_select_public_or_staff"
	on public.topic_budget_lines for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_budget_lines_write_staff"
	on public.topic_budget_lines for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 2. topic_budget_scenarios — mínimo / central / máximo
-- ---------------------------------------------------------------------------

create table public.topic_budget_scenarios (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	key text not null check (key in ('min', 'central', 'max')),
	label text not null,
	-- Inversión media anual del escenario, en millones de euros.
	total numeric not null,
	description text,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint topic_budget_scenarios_topic_key_unique unique (topic_id, key)
);

comment on table public.topic_budget_scenarios is
	'Los 3 escenarios de inversión (mínimo/central/máximo) ya descritos en budget_narrative, para el selector interactivo de la sección Coste.';

alter table public.topic_budget_scenarios enable row level security;

create index topic_budget_scenarios_topic_id_idx on public.topic_budget_scenarios (topic_id);

create trigger topic_budget_scenarios_set_updated_at
	before update on public.topic_budget_scenarios
	for each row
	execute function public.set_updated_at();

create policy "topic_budget_scenarios_select_public_or_staff"
	on public.topic_budget_scenarios for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_budget_scenarios_write_staff"
	on public.topic_budget_scenarios for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 3. topic_budget_timeline — distribución anual 2027–2036
-- ---------------------------------------------------------------------------

create table public.topic_budget_timeline (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	year integer not null,
	min_amount numeric not null,
	max_amount numeric not null,
	note text,
	-- true cuando la cifra es la media de un tramo plurianual repartida a
	-- partes iguales para poder dibujarla año a año (la fuente da una media
	-- del periodo, no una cifra distinta por año) — el cliente debe avisarlo,
	-- nunca presentarlo como precisión que no existe.
	is_period_average boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint topic_budget_timeline_topic_year_unique unique (topic_id, year),
	constraint topic_budget_timeline_amount_check check (max_amount >= min_amount)
);

comment on table public.topic_budget_timeline is
	'Distribución temporal anual de la inversión (sección "Distribución temporal" de budget_narrative), para la barra interactiva de la sección Coste.';

alter table public.topic_budget_timeline enable row level security;

create index topic_budget_timeline_topic_id_idx on public.topic_budget_timeline (topic_id);

create trigger topic_budget_timeline_set_updated_at
	before update on public.topic_budget_timeline
	for each row
	execute function public.set_updated_at();

create policy "topic_budget_timeline_select_public_or_staff"
	on public.topic_budget_timeline for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_budget_timeline_write_staff"
	on public.topic_budget_timeline for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 4. topic_measures: inversión numérica aditiva
-- ---------------------------------------------------------------------------

alter table public.topic_measures
	add column estimated_cost_min numeric,
	add column estimated_cost_max numeric;

comment on column public.topic_measures.estimated_cost_min is
	'Límite inferior de estimated_cost en millones de euros, para gráficos. Aditivo: estimated_cost (texto) sigue siendo la fuente mostrada en las tarjetas de medida y el mapa interactivo.';

comment on column public.topic_measures.estimated_cost_max is
	'Límite superior de estimated_cost en millones de euros, para gráficos. Ver estimated_cost_min.';

-- ---------------------------------------------------------------------------
-- 5. topics: reglas para evitar doble contabilización
-- ---------------------------------------------------------------------------

alter table public.topics
	add column budget_double_count_rules text[] not null default '{}';

comment on column public.topics.budget_double_count_rules is
	'Lista de reglas ("qué no debe contabilizarse dos veces") ya presentes en budget_narrative, en forma de lista para el desplegable de la sección Coste. Mismo patrón que risks_overview.';
