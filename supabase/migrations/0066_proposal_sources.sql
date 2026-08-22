-- 0066_proposal_sources.sql
--
-- Crea una capa diferenciada para las "fuentes propositivas": actores externos
-- que plantean soluciones (think tanks, administraciones, sindicatos,
-- universidades, ciudadanía, etc.). No se confunden con `topic_sources`, que
-- documenta datos y evidencia. Que una propuesta aparezca aquí no implica que
-- CONVOCA la respalde: registra su procedencia y el estado de su contraste.

begin;

create table public.proposal_actors (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	name text not null,
	actor_type text not null,
	website_url text,
	self_description text,
	declared_orientation text,
	orientation_source_url text,
	is_published boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint proposal_actors_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	constraint proposal_actors_name_not_blank check (btrim(name) <> ''),
	constraint proposal_actors_actor_type_valid check (
		actor_type in (
			'government',
			'political_party',
			'think_tank',
			'union',
			'business_association',
			'university',
			'civil_society',
			'citizen',
			'company',
			'other'
		)
	),
	constraint proposal_actors_website_url_http check (
		website_url is null or website_url ~* '^https?://'
	),
	constraint proposal_actors_orientation_source_url_http check (
		orientation_source_url is null or orientation_source_url ~* '^https?://'
	)
);

comment on table public.proposal_actors is
	'Actores externos que formulan propuestas. Su presencia no implica adhesión ni respaldo de CONVOCA.';
comment on column public.proposal_actors.declared_orientation is
	'Autodefinición u orientación declarada por el propio actor; debe poder trazarse a orientation_source_url.';

create trigger proposal_actors_set_updated_at
	before update on public.proposal_actors
	for each row execute function public.set_updated_at();

create table public.topic_proposal_inputs (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics (id) on delete cascade,
	measure_id uuid references public.topic_measures (id) on delete set null,
	actor_id uuid not null references public.proposal_actors (id) on delete restrict,
	title text not null,
	source_url text not null,
	summary text,
	audit_status text not null default 'registered',
	evidence_note text,
	external_contrast_note text,
	cost_review_note text,
	legal_review_note text,
	editorial_note text,
	is_published boolean not null default false,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint topic_proposal_inputs_title_not_blank check (btrim(title) <> ''),
	constraint topic_proposal_inputs_source_url_http check (source_url ~* '^https?://'),
	constraint topic_proposal_inputs_audit_status_valid check (
		audit_status in (
			'registered',
			'decomposing',
			'evidence_review',
			'cost_review',
			'legal_review',
			'compared',
			'audited',
			'discarded'
		)
	)
);

comment on table public.topic_proposal_inputs is
	'Propuestas externas registradas por tema para ser descompuestas, contrastadas y auditadas antes de una posible incorporación.';
comment on column public.topic_proposal_inputs.measure_id is
	'Vínculo opcional a una medida de CONVOCA únicamente cuando la relación haya sido revisada; null durante la recepción/descomposición inicial.';
comment on column public.topic_proposal_inputs.audit_status is
	'Estado editorial del contraste de la propuesta; no expresa apoyo político ni aceptación de CONVOCA.';

create index topic_proposal_inputs_topic_sort_idx
	on public.topic_proposal_inputs (topic_id, sort_order, created_at);
create index topic_proposal_inputs_actor_idx
	on public.topic_proposal_inputs (actor_id);
create index topic_proposal_inputs_measure_idx
	on public.topic_proposal_inputs (measure_id)
	where measure_id is not null;

create trigger topic_proposal_inputs_set_updated_at
	before update on public.topic_proposal_inputs
	for each row execute function public.set_updated_at();

-- Desde 2026 las tablas nuevas no deben depender de exposición implícita al
-- Data API: los GRANT se declaran de forma explícita y RLS limita las filas.
revoke all on public.proposal_actors from public, anon, authenticated;
revoke all on public.topic_proposal_inputs from public, anon, authenticated;

grant select on public.proposal_actors to anon, authenticated;
grant select on public.topic_proposal_inputs to anon, authenticated;
grant insert, update, delete on public.proposal_actors to authenticated;
grant insert, update, delete on public.topic_proposal_inputs to authenticated;
grant all on public.proposal_actors to service_role;
grant all on public.topic_proposal_inputs to service_role;

alter table public.proposal_actors enable row level security;
alter table public.topic_proposal_inputs enable row level security;

create policy "proposal_actors_select_public_or_staff"
	on public.proposal_actors for select
	to anon, authenticated
	using (is_published or public.is_moderator_or_admin());

create policy "proposal_actors_insert_staff"
	on public.proposal_actors for insert
	to authenticated
	with check (public.is_moderator_or_admin());
create policy "proposal_actors_update_staff"
	on public.proposal_actors for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());
create policy "proposal_actors_delete_staff"
	on public.proposal_actors for delete
	to authenticated
	using (public.is_moderator_or_admin());

create policy "topic_proposal_inputs_select_public_or_staff"
	on public.topic_proposal_inputs for select
	to anon, authenticated
	using (
		public.is_moderator_or_admin()
		or (
			is_published
			and exists (
				select 1
				from public.topics t
				where t.id = topic_proposal_inputs.topic_id
					and t.status in ('open', 'reviewed')
			)
			and exists (
				select 1
				from public.proposal_actors a
				where a.id = topic_proposal_inputs.actor_id
					and a.is_published
			)
		)
	);

create policy "topic_proposal_inputs_insert_staff"
	on public.topic_proposal_inputs for insert
	to authenticated
	with check (public.is_moderator_or_admin());
create policy "topic_proposal_inputs_update_staff"
	on public.topic_proposal_inputs for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());
create policy "topic_proposal_inputs_delete_staff"
	on public.topic_proposal_inputs for delete
	to authenticated
	using (public.is_moderator_or_admin());

-- Primer caso de uso. Se registra el propio encuadre público de Atenea y su
-- informe de vivienda, sin atribuir todavía ninguna medida concreta de CONVOCA.
insert into public.proposal_actors (
	slug,
	name,
	actor_type,
	website_url,
	self_description,
	declared_orientation,
	orientation_source_url,
	is_published
)
values (
	'atenea-centro-estudios',
	'Centro de Estudios ATENEA',
	'think_tank',
	'https://atenea.org/',
	'Entidad social civil que participa en el debate público mediante informes, propuestas y actividades.',
	'Valores liberal-conservadores',
	'https://atenea.org/',
	true
)
on conflict (slug) do update set
	name = excluded.name,
	actor_type = excluded.actor_type,
	website_url = excluded.website_url,
	self_description = excluded.self_description,
	declared_orientation = excluded.declared_orientation,
	orientation_source_url = excluded.orientation_source_url,
	is_published = excluded.is_published;

insert into public.topic_proposal_inputs (
	topic_id,
	actor_id,
	title,
	source_url,
	summary,
	audit_status,
	editorial_note,
	is_published,
	sort_order
)
select
	t.id,
	a.id,
	'La vivienda tiene solución',
	'https://atenea.org/wp-content/uploads/2026/05/ATENEA.-Informe-sobre-VIVIENDA.pdf',
	'Informe externo que plantea un paquete de reformas sobre oferta de vivienda, suelo, alquiler, financiación, fiscalidad, seguridad jurídica y vivienda protegida. CONVOCA lo registra para descomponer sus medidas y contrastarlas por separado.',
	'decomposing',
	'La inclusión de este informe solo registra una propuesta externa. No implica que CONVOCA comparta su diagnóstico, sus medidas ni su orientación.',
	true,
	10
from public.topics t
join public.proposal_actors a on a.slug = 'atenea-centro-estudios'
where t.slug = 'vivienda-plan-vivienda-2036'
	and not exists (
		select 1
		from public.topic_proposal_inputs existing
		where existing.topic_id = t.id
			and existing.actor_id = a.id
			and existing.source_url = 'https://atenea.org/wp-content/uploads/2026/05/ATENEA.-Informe-sobre-VIVIENDA.pdf'
	);

commit;
