-- 0068_rollback.sql
--
-- Rollback exacto y limitado de
-- supabase/migrations/0068_fedea_youth_housing_proposals.sql.
--
-- Elimina únicamente la propuesta que 0068 insertó, identificada por su
-- source_url. No toca proposal_actors: 0068 no crea al actor 'fedea', solo
-- lo referencia (ya insertado por 0067).
--
-- Uso:
--   psql "$STAGING_OR_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/0068_rollback.sql

begin;

delete from public.topic_proposal_inputs
where source_url = 'https://fedea.net/los-expertos-reclaman-reformas-estructurales-para-garantizar-el-futuro-economico-de-los-jovenes/';

commit;
