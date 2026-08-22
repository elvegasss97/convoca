-- 0067_rollback.sql
--
-- Rollback exacto y limitado de
-- supabase/migrations/0067_fedea_housing_proposals.sql.
--
-- Elimina únicamente la propuesta que 0067 insertó, identificada por su
-- source_url (clave natural, no hay id hardcodeado que revertir). El actor
-- 'fedea' solo se elimina si ninguna otra fila lo referencia todavía --
-- 0068 también lo usa, así que si 0068 sigue aplicada este DELETE es un
-- no-op seguro sobre proposal_actors.
--
-- Uso:
--   psql "$STAGING_OR_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/0067_rollback.sql

begin;

delete from public.topic_proposal_inputs
where source_url = 'https://fedea.net/el-acceso-a-la-vivienda/';

delete from public.proposal_actors
where slug = 'fedea'
	and not exists (
		select 1
		from public.topic_proposal_inputs
		where topic_proposal_inputs.actor_id = proposal_actors.id
	);

commit;
