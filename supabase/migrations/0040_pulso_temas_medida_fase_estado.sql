-- 0040_pulso_temas_medida_fase_estado.sql
--
-- Estructura el cruce "en qué estado está cada medida en cada fase del
-- calendario" para poder representarlo como vista Gantt interactiva en la
-- sección "Calendario" de la página pública. Hoy ese cruce solo existía
-- como datos ya curados a mano en el cliente
-- (src/lib/data/planMapData.ts, campo phaseStates), derivados en su día
-- del texto libre de topic_measures.timeframe — nunca se ha parseado ese
-- texto en tiempo de carga de página, pero tampoco vivía en Supabase.
--
-- Mismo patrón de RLS que el resto de tablas hijas de `topics`
-- (`topic_sources`, `topic_data_points`, `topic_budget_lines`): lectura
-- pública cuando el tema está publicado, escritura solo
-- moderación/administración, sin política de DELETE.
--
-- Qué crea:
--   1. `public.topic_measure_phase_status` — una fila por (medida, fase) en
--      la que esa medida está activa, con su estado.
--   2. Datos para las 8 medidas de Vivienda × sus 5 fases (32 filas),
--      validados con el usuario contra src/lib/data/planMapData.ts antes
--      de esta migración. Sanidad no se puebla aquí: su cruce
--      medida×fase×estado sigue pendiente de revisión propia (igual que
--      sanidadMapData en planMapData.ts, marcado como borrador).

create table public.topic_measure_phase_status (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	measure_id uuid not null references public.topic_measures (id) on delete cascade,
	phase_id uuid not null references public.topic_timeline_phases (id) on delete cascade,
	status text not null check (
		status in ('preparacion', 'piloto', 'despliegue', 'consolidacion', 'evaluacion')
	),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint topic_measure_phase_status_measure_phase_unique unique (measure_id, phase_id)
);

comment on table public.topic_measure_phase_status is
	'En qué estado (preparación/piloto/despliegue/consolidación/evaluación) está cada medida en cada fase del calendario, para la vista Gantt de la sección Calendario. Una medida sin fila en una fase no tiene actuación documentada en esa fase.';

alter table public.topic_measure_phase_status enable row level security;

create index topic_measure_phase_status_topic_id_idx on public.topic_measure_phase_status (topic_id);
create index topic_measure_phase_status_measure_id_idx on public.topic_measure_phase_status (measure_id);
create index topic_measure_phase_status_phase_id_idx on public.topic_measure_phase_status (phase_id);

create trigger topic_measure_phase_status_set_updated_at
	before update on public.topic_measure_phase_status
	for each row
	execute function public.set_updated_at();

create policy "topic_measure_phase_status_select_public_or_staff"
	on public.topic_measure_phase_status for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_measure_phase_status_write_staff"
	on public.topic_measure_phase_status for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- Datos: Vivienda 2036 — 8 medidas × 5 fases (32 filas)
--
-- Guarda de reproducibilidad clean-room (seguridad/27, seguridad/28): el
-- tema "Vivienda" y sus medidas/fases se crean vía aplicación, no por
-- migración (ver seguridad/27 §1) — en una instancia sin ese contenido
-- (fork nuevo, shadow DB de `supabase db diff`) este INSERT fallaría por FK.
-- La condición exige el topic Y las 8 medidas Y las 5 fases exactas que
-- usan las 32 filas de abajo; si falta cualquiera, se omite el INSERT
-- completo (no se inserta parcialmente ni se crean filas padre). Si todo
-- existe, el INSERT es exactamente el mismo que ya corrió en
-- staging/producción, sin cambios de efecto.
-- ---------------------------------------------------------------------------

do $$
begin
	if exists (
		select 1 from public.topics where id = '22578e3c-91a2-4b30-ab1b-9aae2f510f0e'::uuid
	)
	and not exists (
		select 1 from unnest(array[
			'f8aae7fb-b10e-4bc3-aa0f-392f40a2909f',
			'75d63251-606a-4183-b15f-bd20483e7a7e',
			'1dc4e177-62b2-4dce-bcdd-ed6e6326e45e',
			'83961c13-3549-4721-a621-a9fd6484c160',
			'69407eba-ce7a-485d-bdcb-f878cb287c99',
			'c9a35a5e-5219-41e8-afb2-f007dd84984a',
			'c7b13817-5499-49ef-9c2b-22cb5a975a8b',
			'd152d8e4-efda-41a7-8ae3-bbffb74cff2e'
		]::uuid[]) as required_measure_id
		where not exists (
			select 1 from public.topic_measures m where m.id = required_measure_id
		)
	)
	and not exists (
		select 1 from unnest(array[
			'26c3164c-ec2b-46f8-91c5-ce2e3634ce0c',
			'4ef0d125-56dc-461d-8619-87c703e3ef81',
			'5b252ef8-c0bd-404e-9858-684e7951461d',
			'bd172f2b-4f2e-46c9-9128-1e52498ef2a4',
			'fbd4a0ce-cead-4bc3-b52f-2d4288c33919'
		]::uuid[]) as required_phase_id
		where not exists (
			select 1 from public.topic_timeline_phases p where p.id = required_phase_id
		)
	)
	then

insert into public.topic_measure_phase_status (topic_id, measure_id, phase_id, status)
select
	'22578e3c-91a2-4b30-ab1b-9aae2f510f0e'::uuid as topic_id,
	v.measure_id::uuid,
	v.phase_id::uuid,
	v.status
from (
	values
		-- 1. Crear un parque público que nunca pueda venderse
		('f8aae7fb-b10e-4bc3-aa0f-392f40a2909f', '26c3164c-ec2b-46f8-91c5-ce2e3634ce0c', 'preparacion'),
		('f8aae7fb-b10e-4bc3-aa0f-392f40a2909f', '4ef0d125-56dc-461d-8619-87c703e3ef81', 'piloto'),
		('f8aae7fb-b10e-4bc3-aa0f-392f40a2909f', '5b252ef8-c0bd-404e-9858-684e7951461d', 'despliegue'),
		('f8aae7fb-b10e-4bc3-aa0f-392f40a2909f', 'bd172f2b-4f2e-46c9-9128-1e52498ef2a4', 'despliegue'),
		('f8aae7fb-b10e-4bc3-aa0f-392f40a2909f', 'fbd4a0ce-cead-4bc3-b52f-2d4288c33919', 'consolidacion'),
		-- 2. Construir mucho más donde realmente hace falta
		('75d63251-606a-4183-b15f-bd20483e7a7e', '26c3164c-ec2b-46f8-91c5-ce2e3634ce0c', 'preparacion'),
		('75d63251-606a-4183-b15f-bd20483e7a7e', '4ef0d125-56dc-461d-8619-87c703e3ef81', 'preparacion'),
		('75d63251-606a-4183-b15f-bd20483e7a7e', '5b252ef8-c0bd-404e-9858-684e7951461d', 'despliegue'),
		('75d63251-606a-4183-b15f-bd20483e7a7e', 'bd172f2b-4f2e-46c9-9128-1e52498ef2a4', 'despliegue'),
		('75d63251-606a-4183-b15f-bd20483e7a7e', 'fbd4a0ce-cead-4bc3-b52f-2d4288c33919', 'consolidacion'),
		-- 3. Un alquiler seguro para las dos partes (sin fase 4)
		('1dc4e177-62b2-4dce-bcdd-ed6e6326e45e', '26c3164c-ec2b-46f8-91c5-ce2e3634ce0c', 'piloto'),
		('1dc4e177-62b2-4dce-bcdd-ed6e6326e45e', '4ef0d125-56dc-461d-8619-87c703e3ef81', 'piloto'),
		('1dc4e177-62b2-4dce-bcdd-ed6e6326e45e', '5b252ef8-c0bd-404e-9858-684e7951461d', 'despliegue'),
		('1dc4e177-62b2-4dce-bcdd-ed6e6326e45e', 'bd172f2b-4f2e-46c9-9128-1e52498ef2a4', 'consolidacion'),
		-- 4. Contener precios mientras llega nueva oferta (sin fase 100 días)
		('83961c13-3549-4721-a621-a9fd6484c160', '4ef0d125-56dc-461d-8619-87c703e3ef81', 'despliegue'),
		('83961c13-3549-4721-a621-a9fd6484c160', '5b252ef8-c0bd-404e-9858-684e7951461d', 'evaluacion'),
		('83961c13-3549-4721-a621-a9fd6484c160', 'bd172f2b-4f2e-46c9-9128-1e52498ef2a4', 'evaluacion'),
		('83961c13-3549-4721-a621-a9fd6484c160', 'fbd4a0ce-cead-4bc3-b52f-2d4288c33919', 'consolidacion'),
		-- 5. Movilizar vivienda vacía (solo fases 1 y 2)
		('69407eba-ce7a-485d-bdcb-f878cb287c99', '4ef0d125-56dc-461d-8619-87c703e3ef81', 'piloto'),
		('69407eba-ce7a-485d-bdcb-f878cb287c99', '5b252ef8-c0bd-404e-9858-684e7951461d', 'consolidacion'),
		-- 6. Regular pisos turísticos barrio por barrio (sin fase 100 días)
		('c9a35a5e-5219-41e8-afb2-f007dd84984a', '4ef0d125-56dc-461d-8619-87c703e3ef81', 'despliegue'),
		('c9a35a5e-5219-41e8-afb2-f007dd84984a', '5b252ef8-c0bd-404e-9858-684e7951461d', 'despliegue'),
		('c9a35a5e-5219-41e8-afb2-f007dd84984a', 'bd172f2b-4f2e-46c9-9128-1e52498ef2a4', 'evaluacion'),
		('c9a35a5e-5219-41e8-afb2-f007dd84984a', 'fbd4a0ce-cead-4bc3-b52f-2d4288c33919', 'evaluacion'),
		-- 7. Ayudar a los jóvenes sin inflar precios (sin fases 100 días ni 4)
		('c7b13817-5499-49ef-9c2b-22cb5a975a8b', '4ef0d125-56dc-461d-8619-87c703e3ef81', 'piloto'),
		('c7b13817-5499-49ef-9c2b-22cb5a975a8b', '5b252ef8-c0bd-404e-9858-684e7951461d', 'despliegue'),
		('c7b13817-5499-49ef-9c2b-22cb5a975a8b', 'bd172f2b-4f2e-46c9-9128-1e52498ef2a4', 'consolidacion'),
		-- 8. Evitar que una emergencia termine en desahucio
		('d152d8e4-efda-41a7-8ae3-bbffb74cff2e', '26c3164c-ec2b-46f8-91c5-ce2e3634ce0c', 'piloto'),
		('d152d8e4-efda-41a7-8ae3-bbffb74cff2e', '4ef0d125-56dc-461d-8619-87c703e3ef81', 'despliegue'),
		('d152d8e4-efda-41a7-8ae3-bbffb74cff2e', '5b252ef8-c0bd-404e-9858-684e7951461d', 'despliegue'),
		('d152d8e4-efda-41a7-8ae3-bbffb74cff2e', 'bd172f2b-4f2e-46c9-9128-1e52498ef2a4', 'consolidacion'),
		('d152d8e4-efda-41a7-8ae3-bbffb74cff2e', 'fbd4a0ce-cead-4bc3-b52f-2d4288c33919', 'evaluacion')
	) as v (measure_id, phase_id, status);

	end if;
end $$;
