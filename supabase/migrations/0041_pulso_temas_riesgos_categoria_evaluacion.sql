-- 0041_pulso_temas_riesgos_categoria_evaluacion.sql
--
-- Estructura tres piezas de la sección "Riesgos y comprobación" que hoy
-- viven como agrupación hardcodeada en el cliente o como texto narrativo,
-- para poder representarlas como mapa de riesgos filtrable y tarjetas de
-- evaluación/condiciones en la página pública.
--
-- Mismo patrón de RLS que el resto de tablas hijas de `topics`
-- (`topic_sources`, `topic_risks`, `topic_budget_lines`): lectura pública
-- cuando el tema está publicado, escritura solo moderación/administración,
-- sin política de DELETE.
--
-- Qué crea/cambia:
--   1. `public.topic_risks.category` — antes vivía como un mapa
--      título→categoría hardcodeado en +page.svelte
--      (RISK_CATEGORY_BY_TITLE), ya en producción. Se estructura tal cual,
--      sin cambiar ninguna categoría ni asignación.
--   2. `public.topic_evaluation_moments` — los 4 momentos de evaluación
--      (anual/bienal/intermedia/final), antes solo texto narrativo dentro
--      de `topics.evaluation_rules`. Se pobla con el texto literal ya
--      existente, sin resumir ni añadir información nueva.
--   3. `public.topic_measure_change_conditions` — las 3 condiciones
--      (ampliar/modificar/suspender), mismo origen y mismo criterio que el
--      punto anterior. `evaluation_rules` sigue existiendo como texto
--      completo de referencia, no se toca ni se sustituye.

-- ---------------------------------------------------------------------------
-- 1. topic_risks.category
-- ---------------------------------------------------------------------------

alter table public.topic_risks
	add column category text;

comment on column public.topic_risks.category is
	'Categoría del riesgo (p. ej. "Ejecución y presupuesto"), para el mapa de riesgos filtrable. Antes vivía como mapa título→categoría hardcodeado en +page.svelte; misma asignación, ahora estructurada.';

update public.topic_risks set category = 'Ejecución y presupuesto'
	where title in (
		'Retrasos y falta de capacidad administrativa',
		'Sobrecostes',
		'Falta de mantenimiento del parque público',
		'Sostenibilidad presupuestaria'
	);

update public.topic_risks set category = 'Territorio y planificación'
	where title in (
		'Escasez de suelo preparado',
		'Construcción en territorios sin demanda suficiente',
		'Diferencias territoriales de ejecución',
		'Concentración y segregación residencial'
	);

update public.topic_risks set category = 'Mercado y acceso'
	where title in (
		'Traslado de ayudas a los precios',
		'Reducción o desplazamiento de la oferta de alquiler'
	);

update public.topic_risks set category = 'Integridad y datos'
	where title in (
		'Fraude y manipulación de registros',
		'Falta de datos fiables',
		'Incumplimiento de la protección permanente'
	);

update public.topic_risks set category = 'Continuidad jurídica y política'
	where title in (
		'Conflictos competenciales o jurídicos',
		'Dependencia de cambios políticos'
	);

-- ---------------------------------------------------------------------------
-- 2. topic_evaluation_moments — anual / bienal / intermedia / final
-- ---------------------------------------------------------------------------

create table public.topic_evaluation_moments (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	key text not null check (key in ('anual', 'bienal', 'intermedia', 'final')),
	title text not null,
	frequency_label text not null,
	description text not null,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint topic_evaluation_moments_topic_key_unique unique (topic_id, key)
);

comment on table public.topic_evaluation_moments is
	'Los momentos de evaluación del plan (anual/bienal/intermedia/final), ya descritos en topics.evaluation_rules, estructurados para las tarjetas de "Cuándo se revisa".';

alter table public.topic_evaluation_moments enable row level security;

create index topic_evaluation_moments_topic_id_idx on public.topic_evaluation_moments (topic_id);

create trigger topic_evaluation_moments_set_updated_at
	before update on public.topic_evaluation_moments
	for each row
	execute function public.set_updated_at();

create policy "topic_evaluation_moments_select_public_or_staff"
	on public.topic_evaluation_moments for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_evaluation_moments_write_staff"
	on public.topic_evaluation_moments for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

insert into public.topic_evaluation_moments (topic_id, key, title, frequency_label, description, sort_order)
values
	(
		'22578e3c-91a2-4b30-ab1b-9aae2f510f0e',
		'anual',
		'Evaluación anual',
		'Cada año',
		'Cada año se publicará: grado de ejecución, resultados, retrasos, sobrecostes, diferencias territoriales, medidas modificadas, proyectos cancelados, y el motivo de las decisiones.',
		0
	),
	(
		'22578e3c-91a2-4b30-ab1b-9aae2f510f0e',
		'bienal',
		'Revisión bienal',
		'Cada dos años',
		'Cada dos años se revisará: presupuesto, distribución, capacidad de ejecución, evolución del mercado, efecto de las ayudas sobre precios, oferta de alquiler, necesidad de mantener zonas tensionadas, y sostenibilidad fiscal.',
		1
	),
	(
		'22578e3c-91a2-4b30-ab1b-9aae2f510f0e',
		'intermedia',
		'Evaluación intermedia',
		'2031',
		'En 2031 se realizará una evaluación completa. Podrá recomendar ampliar una medida, modificarla, reducirla, sustituirla o suspenderla.',
		2
	),
	(
		'22578e3c-91a2-4b30-ab1b-9aae2f510f0e',
		'final',
		'Evaluación final',
		'2036',
		'En 2036 se compararán los resultados con la línea de base de 2026. La evaluación deberá incluir también: objetivos incumplidos, costes superiores a lo previsto, efectos no deseados, diferencias entre territorios, y aprendizajes para el siguiente periodo.',
		3
	);

-- ---------------------------------------------------------------------------
-- 3. topic_measure_change_conditions — ampliar / modificar / suspender
-- ---------------------------------------------------------------------------

create table public.topic_measure_change_conditions (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	key text not null check (key in ('ampliar', 'modificar', 'suspender')),
	title text not null,
	items text[] not null default '{}',
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint topic_measure_change_conditions_topic_key_unique unique (topic_id, key)
);

comment on table public.topic_measure_change_conditions is
	'Condiciones bajo las que una medida se amplía, modifica o suspende, ya descritas en topics.evaluation_rules, estructuradas para las tarjetas de "Qué puede pasar con una medida".';

alter table public.topic_measure_change_conditions enable row level security;

create index topic_measure_change_conditions_topic_id_idx on public.topic_measure_change_conditions (topic_id);

create trigger topic_measure_change_conditions_set_updated_at
	before update on public.topic_measure_change_conditions
	for each row
	execute function public.set_updated_at();

create policy "topic_measure_change_conditions_select_public_or_staff"
	on public.topic_measure_change_conditions for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_measure_change_conditions_write_staff"
	on public.topic_measure_change_conditions for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

insert into public.topic_measure_change_conditions (topic_id, key, title, items, sort_order)
values
	(
		'22578e3c-91a2-4b30-ab1b-9aae2f510f0e',
		'ampliar',
		'Cuándo se amplía una medida',
		array[
			'Cumple sus objetivos',
			'Mantiene un coste razonable',
			'No genera efectos adversos graves',
			'Existe capacidad para ejecutarla'
		],
		0
	),
	(
		'22578e3c-91a2-4b30-ab1b-9aae2f510f0e',
		'modificar',
		'Cuándo se modifica una medida',
		array[
			'La ayuda se traslada a los precios',
			'Reduce significativamente la oferta residencial',
			'Genera discriminación',
			'No llega a los hogares previstos',
			'Tiene costes desproporcionados',
			'Existen grandes diferencias territoriales',
			'Aumenta el fraude'
		],
		1
	),
	(
		'22578e3c-91a2-4b30-ab1b-9aae2f510f0e',
		'suspender',
		'Cuándo se suspende una medida',
		array[
			'No existe evidencia de mejora',
			'Sus efectos adversos superan los beneficios',
			'No puede ejecutarse con garantías',
			'Incumple la normativa',
			'Duplica otro programa sin aportar valor'
		],
		2
	);
