-- 0066_rollback.sql
--
-- Rollback exacto y limitado de
-- supabase/migrations/0066_proposal_sources.sql.
--
-- Elimina las dos tablas nuevas (topic_proposal_inputs primero, por su FK
-- hacia proposal_actors) junto con sus políticas, triggers y grants, que se
-- eliminan automáticamente al hacer DROP TABLE. No toca ninguna tabla
-- preexistente: 0066 no altera public.topics ni public.topic_measures.
--
-- Uso:
--   psql "$STAGING_OR_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/0066_rollback.sql

begin;

drop table if exists public.topic_proposal_inputs;
drop table if exists public.proposal_actors;

commit;
