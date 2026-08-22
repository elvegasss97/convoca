-- 0068_fedea_youth_housing_proposals.sql
--
-- Añade las propuestas de vivienda surgidas del encuentro FEDEA-CGE sobre
-- oportunidades económicas de los jóvenes (18 de junio de 2025). Se mantiene
-- la coautoría del encuentro y el paquete entra sin vincular a medidas de
-- CONVOCA hasta revisar cada correspondencia.

begin;

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
	'Vivienda y emancipación juvenil — propuestas del Encuentro FEDEA–CGE',
	'https://fedea.net/los-expertos-reclaman-reformas-estructurales-para-garantizar-el-futuro-economico-de-los-jovenes/',
	'Paquete específico sobre acceso de los jóvenes a la vivienda presentado en junio de 2025: aumentar la vivienda asequible en zonas de alta demanda mediante más suelo disponible y colaboración público-privada; focalizar las ayudas al alquiler en jóvenes de menor renta y priorizar el parque público; y facilitar el acceso mediante exenciones, deducciones y avales públicos dirigidos a jóvenes con menor renta y ahorro.',
	'decomposing',
	'Estas propuestas proceden de un encuentro conjunto FEDEA–Consejo General de Economistas. CONVOCA conserva esa coautoría y no las atribuye a FEDEA en exclusiva. Su inclusión sirve para auditarlas y compararlas, no para respaldarlas.',
	true,
	21
from public.topics t
join public.proposal_actors a on a.slug = 'fedea'
where t.slug = 'vivienda-plan-vivienda-2036'
	and not exists (
		select 1
		from public.topic_proposal_inputs existing
		where existing.topic_id = t.id
			and existing.actor_id = a.id
			and existing.source_url = 'https://fedea.net/los-expertos-reclaman-reformas-estructurales-para-garantizar-el-futuro-economico-de-los-jovenes/'
	);

commit;
