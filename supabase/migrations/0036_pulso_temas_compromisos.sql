-- 0036_pulso_temas_compromisos.sql
--
-- Añade "compromisos" (los cinco compromisos comprobables de un tema, p.
-- ej. Plan Sanidad 2036), como puente entre el diagnóstico y las medidas.
-- Mismo patrón exacto que `topic_risks`/`topic_timeline_phases`: tabla
-- propia, RLS pública si el tema no está en borrador, escritura solo
-- staff. Aditivo y no destructivo: no toca ninguna tabla ni fila
-- existente. Vivienda no tendrá filas aquí, así que su página no cambia.
create table public.topic_commitments (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	title text not null,
	description text not null,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.topic_commitments is
	'Compromisos comprobables de un tema (p. ej. los cinco compromisos de Plan Sanidad 2036): puente entre el diagnóstico y las medidas concretas. Compromisos propuestos, no resultados alcanzados.';

alter table public.topic_commitments enable row level security;

create index topic_commitments_topic_id_idx on public.topic_commitments (topic_id);

create trigger topic_commitments_set_updated_at
	before update on public.topic_commitments
	for each row
	execute function public.set_updated_at();

create policy "topic_commitments_select_public_or_staff"
	on public.topic_commitments for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or exists (select 1 from public.topics t where t.id = topic_id and t.status in ('open', 'reviewed'))
	);

create policy "topic_commitments_write_staff"
	on public.topic_commitments for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());
