-- Read-only postflight for 0059_municipal_issue_review_workflow.sql

select version,name
from supabase_migrations.schema_migrations
where version in ('0058','0059')
order by version;

select con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid=con.conrelid
join pg_namespace nsp on nsp.oid=rel.relnamespace
where nsp.nspname='public'
  and rel.relname in ('municipal_issues','audit_trail','write_rate_limits')
  and con.conname in (
    'municipal_issues_status_check',
    'municipal_issues_publication_consistency',
    'municipal_issues_public_location_required',
    'audit_trail_target_type_check',
    'audit_trail_action_check',
    'write_rate_limits_action_check'
  )
order by rel.relname,con.conname;

select
  to_regprocedure('public.review_municipal_issue(uuid,text)') is not null as review_rpc_present,
  to_regprocedure('public.guard_municipal_staff_map_resolution_server(uuid)') is not null as staff_guard_present,
  has_function_privilege('authenticated','public.review_municipal_issue(uuid,text)','EXECUTE') as review_authenticated_execute,
  has_function_privilege('anon','public.review_municipal_issue(uuid,text)','EXECUTE') as review_anon_execute,
  has_function_privilege('service_role','public.guard_municipal_staff_map_resolution_server(uuid)','EXECUTE') as guard_service_execute,
  has_function_privilege('authenticated','public.guard_municipal_staff_map_resolution_server(uuid)','EXECUTE') as guard_authenticated_execute;

select
  count(*) filter (where status in ('verified','in_action','resolved') and (municipality_ine_code is null or lat is null or lng is null)) as public_location_violations,
  count(*) filter (where status in ('detected','dismissed') and published_at is not null) as internal_publication_violations
from public.municipal_issues;

-- Expected:
-- 0058 + 0059 present
-- review: authenticated=true, anon=false
-- staff guard: service_role=true, authenticated=false
-- both violation counts = 0
