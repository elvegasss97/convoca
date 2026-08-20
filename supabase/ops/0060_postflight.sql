-- 0060_postflight.sql
-- Ejecutar DESPUÉS de 0060_municipal_issue_review_path_guard.sql.
-- Solo lectura/validación estructural.

do $$
declare
  v_review_def text;
  v_guard_def text;
begin
  if to_regprocedure('public.enforce_municipal_issue_review_path()') is null then
    raise exception 'FAIL: falta enforce_municipal_issue_review_path().';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'municipal_issues'
      and t.tgname = 'municipal_issues_a_review_path_guard'
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) then
    raise exception 'FAIL: el guard de camino auditado no existe o está deshabilitado.';
  end if;

  select pg_get_functiondef('public.enforce_municipal_issue_review_path()'::regprocedure)
    into v_guard_def;
  if position('municipal_issue_review_context' in v_guard_def) = 0
     or position('is_moderator_or_admin' in v_guard_def) = 0 then
    raise exception 'FAIL: el trigger no exige contexto de revisión + puerta staff.';
  end if;

  select pg_get_functiondef('public.review_municipal_issue(uuid,text)'::regprocedure)
    into v_review_def;
  if position('set_config' in v_review_def) = 0
     or position('municipal_issue_review_context' in v_review_def) = 0
     or position('municipal_issue_sources' in v_review_def) = 0
     or position('municipal_map_points' in v_review_def) = 0
     or position('audit_trail' in v_review_def) = 0 then
    raise exception 'FAIL: review_municipal_issue no conserva todas las invariantes de 0060.';
  end if;

  if has_function_privilege('anon', 'public.review_municipal_issue(uuid,text)', 'EXECUTE') then
    raise exception 'FAIL: anon conserva EXECUTE sobre review_municipal_issue.';
  end if;

  if not has_function_privilege('authenticated', 'public.review_municipal_issue(uuid,text)', 'EXECUTE') then
    raise exception 'FAIL: authenticated no puede invocar la RPC auditada.';
  end if;
end
$$;

select
  '0060_postflight_ok' as check_name,
  count(*) filter (where status = 'detected') as detected_pending,
  count(*) filter (where status = 'dismissed') as dismissed_internal,
  count(*) filter (where status in ('verified', 'in_action', 'resolved')) as public_issues
from public.municipal_issues;
