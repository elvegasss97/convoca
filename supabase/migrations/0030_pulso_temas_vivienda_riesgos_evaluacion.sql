-- 0030_pulso_temas_vivienda_riesgos_evaluacion.sql
--
-- Ampliación aditiva para completar huecos pendientes de la plantilla de
-- temas señalados tras revisar la página publicada de Vivienda:
--
--   1. `topic_risks` — riesgos generales del tema ("qué podría salir mal"),
--      estructurados en 4 partes (en qué consiste / señales / cómo
--      reducirlo / qué decisión tomar), en vez de una lista plana de texto.
--      Antes solo existía `topics.risks_overview text[]`, insuficiente para
--      mostrar las 4 partes por riesgo que pide la plantilla real.
--   2. `topics.evaluation_rules` — texto largo para las reglas de
--      comprobación (evaluación anual/bienal/intermedia/final, condiciones
--      para ampliar/modificar/suspender una medida), mostrado en su propio
--      acordeón de "Riesgos y comprobación" en vez de quedar solo dentro
--      del desglose económico.
--   3. `topic_timeline_phases.items` — sub-elementos de una fase del
--      calendario (p. ej. las 11 actuaciones de "Primeros 100 días"), para
--      poder mostrarlos como elementos separados en vez de un único bloque
--      de texto.
--
-- Sin filas semilla, sin contenido político — igual que las migraciones
-- anteriores de esta serie (0026-0029).

create table public.topic_risks (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	title text not null,
	description text,
	signals text,
	mitigation text,
	decision_trigger text,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.topic_risks is
	'Riesgos generales de un tema (no de una medida concreta), con 4 partes: en qué consiste, señales de alerta, cómo reducirlo, y qué decisión tomar si ocurre.';
comment on column public.topic_risks.description is '"En qué consiste" el riesgo.';
comment on column public.topic_risks.signals is '"Qué señales" permitirían detectarlo.';
comment on column public.topic_risks.mitigation is '"Cómo reducirlo".';
comment on column public.topic_risks.decision_trigger is '"Qué decisión debería tomarse" si el riesgo ocurre.';

alter table public.topic_risks enable row level security;

create index topic_risks_topic_id_idx on public.topic_risks (topic_id);

create trigger topic_risks_set_updated_at
	before update on public.topic_risks
	for each row
	execute function public.set_updated_at();

create policy "topic_risks_select_public_or_staff"
	on public.topic_risks for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_risks_write_staff"
	on public.topic_risks for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

alter table public.topics
	add column evaluation_rules text;

comment on column public.topics.evaluation_rules is
	'Reglas de comprobación del tema (evaluación anual/bienal/intermedia/final, condiciones para ampliar/modificar/suspender una medida). Texto largo, mostrado expandible igual que problem_intro.';

alter table public.topic_timeline_phases
	add column items text[] not null default '{}';

comment on column public.topic_timeline_phases.items is
	'Sub-elementos de una fase (p. ej. las actuaciones de "Primeros 100 días"), para mostrarlos por separado en vez de un único bloque de texto en description.';
