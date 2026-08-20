-- 0061_postflight.sql
-- Ejecutar DESPUÉS de 0061_municipal_issue_review_context_unforgeable.sql.
-- Solo lectura/validación estructural.

do $$
declare
  v_review_def text;
  v_guard_def text;
  v_table_owner oid;
  v_review_owner oid;
  v_review_secdef boolean;
  v_rls_enabled boolean;
begin
  if to_regclass('public._municipal_issue_review_authorizations') is null then
    raise exception 'FAIL: falta la tabla de autorización de un solo uso.';
  end if;

  select c.relowner, c.relrowsecurity
    into v_table_owner, v_rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = '_municipal_issue_review_authorizations';

  if not coalesce(v_rls_enabled, false) then
    raise exception 'FAIL: RLS no está habilitado en la tabla de autorización.';
  end if;

  if exists (
    select 1 from pg_policy
    where polrelid = 'public._municipal_issue_review_authorizations'::regclass
  ) then
    raise exception 'FAIL: la tabla de autorización no debe exponer ninguna policy RLS.';
  end if;

  if has_table_privilege('anon', 'public._municipal_issue_review_authorizations', 'SELECT')
     or has_table_privilege('anon', 'public._municipal_issue_review_authorizations', 'INSERT')
     or has_table_privilege('anon', 'public._municipal_issue_review_authorizations', 'UPDATE')
     or has_table_privilege('anon', 'public._municipal_issue_review_authorizations', 'DELETE')
     or has_table_privilege('authenticated', 'public._municipal_issue_review_authorizations', 'SELECT')
     or has_table_privilege('authenticated', 'public._municipal_issue_review_authorizations', 'INSERT')
     or has_table_privilege('authenticated', 'public._municipal_issue_review_authorizations', 'UPDATE')
     or has_table_privilege('authenticated', 'public._municipal_issue_review_authorizations', 'DELETE')
     or has_table_privilege('service_role', 'public._municipal_issue_review_authorizations', 'SELECT')
     or has_table_privilege('service_role', 'public._municipal_issue_review_authorizations', 'INSERT')
     or has_table_privilege('service_role', 'public._municipal_issue_review_authorizations', 'UPDATE')
     or has_table_privilege('service_role', 'public._municipal_issue_review_authorizations', 'DELETE') then
    raise exception 'FAIL: un rol API conserva DML sobre la tabla de autorización; deja de ser owner-only.';
  end if;

  select p.proowner, p.prosecdef
    into v_review_owner, v_review_secdef
  from pg_proc p
  where p.oid = 'public.review_municipal_issue(uuid,text)'::regprocedure;

  if not coalesce(v_review_secdef, false) then
    raise exception 'FAIL: review_municipal_issue debe seguir siendo SECURITY DEFINER.';
  end if;

  if v_table_owner is distinct from v_review_owner then
    raise exception 'FAIL: la tabla de autorización y la RPC SECURITY DEFINER no comparten owner.';
  end if;

  select pg_get_functiondef('public.enforce_municipal_issue_review_path()'::regprocedure)
    into v_guard_def;
  if position('_municipal_issue_review_authorizations' in v_guard_def) = 0
     or position('is_moderator_or_admin' in v_guard_def) = 0
     or position('txid_current' in v_guard_def) = 0 then
    raise exception 'FAIL: el trigger no exige la autorización de un solo uso ligada a la transacción.';
  end if;

  if position('convoca.municipal_issue_review_context' in v_guard_def) <> 0 then
    raise exception 'FAIL: el trigger todavía confía en el GUC adivinable de 0060.';
  end if;

  select pg_get_functiondef('public.review_municipal_issue(uuid,text)'::regprocedure)
    into v_review_def;
  if position('_municipal_issue_review_authorizations' in v_review_def) = 0
     or position('municipal_issue_sources' in v_review_def) = 0
     or position('municipal_map_points' in v_review_def) = 0
     or position('audit_trail' in v_review_def) = 0 then
    raise exception 'FAIL: review_municipal_issue no conserva todas las invariantes de 0059/0060/0061.';
  end if;

  if has_function_privilege('anon', 'public.review_municipal_issue(uuid,text)', 'EXECUTE') then
    raise exception 'FAIL: anon conserva EXECUTE sobre review_municipal_issue.';
  end if;

  if has_function_privilege('service_role', 'public.review_municipal_issue(uuid,text)', 'EXECUTE') then
    raise exception 'FAIL: service_role no necesita ejecutar la decisión humana auditada.';
  end if;

  if not has_function_privilege('authenticated', 'public.review_municipal_issue(uuid,text)', 'EXECUTE') then
    raise exception 'FAIL: authenticated no puede invocar la RPC auditada.';
  end if;
end
$$;

select
  '0061_postflight_ok' as check_name,
  count(*) filter (where status = 'detected') as detected_pending,
  count(*) filter (where status = 'dismissed') as dismissed_internal,
  count(*) filter (where status in ('verified', 'in_action', 'resolved')) as public_issues,
  (select count(*) from public._municipal_issue_review_authorizations) as leftover_authorizations
from public.municipal_issues;
