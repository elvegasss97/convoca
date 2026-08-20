-- Read-only preflight for 0059_municipal_issue_review_workflow.sql

select
  exists(select 1 from supabase_migrations.schema_migrations where version='0058') as has_0058,
  exists(select 1 from supabase_migrations.schema_migrations where version='0059') as has_0059;

select
  status,
  count(*) as total
from public.municipal_issues
group by status
order by status;

select
  count(*) filter (where status <> 'detected' and (municipality_ine_code is null or lat is null or lng is null)) as public_location_violations,
  count(*) filter (where status = 'detected' and published_at is not null) as detected_publication_violations
from public.municipal_issues;

-- Expected before 0059:
-- has_0058=true, has_0059=false
-- public_location_violations=0
-- detected_publication_violations=0
