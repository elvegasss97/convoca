-- 0067_fedea_housing_proposals.sql
--
-- Registra FEDEA como fuente propositiva y el paquete conjunto FEDEA-CGE
-- sobre acceso a la vivienda (5 de marzo de 2025). La atribución conjunta se
-- conserva expresamente y no se vincula todavía a medidas concretas de
-- CONVOCA: el documento entra en fase de descomposición y contraste.

begin;

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
	'fedea',
	'Fundación de Estudios de Economía Aplicada (FEDEA)',
	'think_tank',
	'https://fedea.net/',
	'Fundación privada dedicada a la investigación aplicada sobre cuestiones económicas y sociales y a trasladar sus resultados al diseño de políticas públicas.',
	'Racionalidad económica; defensa de la economía de mercado y de un Estado de bienestar eficiente y sostenible',
	'https://fedea.net/programa-fedea-junior-research-fellow-abrimos-la-convocatoria-para-el-curso-2026-2027/',
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
	'El acceso a la vivienda — 10 líneas de actuación (Encuentro FEDEA–CGE)',
	'https://fedea.net/el-acceso-a-la-vivienda/',
	'Paquete conjunto presentado por FEDEA y el Consejo General de Economistas en marzo de 2025. Incluye reforma de la Ley de Suelo, movilización de suelo público, menor carga fiscal sobre vivienda, industrialización de la construcción, agilización de licencias, estabilidad normativa, colaboración público-privada, más financiación para vivienda asequible, ampliación del alquiler social y un acuerdo político estable sobre suelo y vivienda.',
	'decomposing',
	'La autoría de este paquete es compartida entre FEDEA y el Consejo General de Economistas (CGE). Se registra bajo FEDEA para iniciar su análisis dentro de esta fuente propositiva, pero CONVOCA no atribuye estas diez líneas a FEDEA en exclusiva ni las respalda por incluirlas.',
	true,
	20
from public.topics t
join public.proposal_actors a on a.slug = 'fedea'
where t.slug = 'vivienda-plan-vivienda-2036'
	and not exists (
		select 1
		from public.topic_proposal_inputs existing
		where existing.topic_id = t.id
			and existing.actor_id = a.id
			and existing.source_url = 'https://fedea.net/el-acceso-a-la-vivienda/'
	);

commit;
