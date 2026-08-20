-- 0060_preflight.sql
-- Ejecutar ANTES de 0060_municipal_issue_review_path_guard.sql.
-- Solo lectura. Debe fallar si 0059 no está realmente disponible.

do $$
begin
  if to_regprocedure('public.review_municipal_issue(uuid,text)') is null then
    raise exception 'STOP: falta review_municipal_issue(uuid,text); 0059 no está aplicado.';
  end if;

  if to_regprocedure('public.is_moderator_or_admin()') is null then
    raise exception 'STOP: falta la puerta staff/MFA is_moderator_or_admin().';
  end if;

  if to_regclass('public.municipal_issue_sources') is null
     or to_regclass('public.municipal_map_points') is null
     or to_regclass('public.audit_trail') is null then
    raise exception 'STOP: faltan dependencias del flujo auditado municipal.';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'municipal_issues'
      and t.tgname = 'municipal_issues_public_location_guard'
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) then
    raise exception 'STOP: falta el trigger de ubicación municipal canónica de 0056.';
  end if;
end
$$;

select
  status,
  count(*) as issue_count
from public.municipal_issues
group by status
order by status;

select
  count(*) filter (where status = 'detected') as detected_pending,
  count(*) filter (where status = 'dismissed') as dismissed_internal,
  count(*) filter (where status in ('verified', 'in_action', 'resolved')) as public_issues
from public.municipal_issues;
