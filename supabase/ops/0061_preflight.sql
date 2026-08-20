-- 0061_preflight.sql
-- Ejecutar ANTES de 0061_municipal_issue_review_context_unforgeable.sql.
-- Solo lectura. Debe fallar si 0060 no está realmente disponible.

do $$
begin
  if to_regprocedure('public.review_municipal_issue(uuid,text)') is null then
    raise exception 'STOP: falta review_municipal_issue(uuid,text); 0059/0060 no están aplicados.';
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
    raise exception 'STOP: falta el guard de camino auditado de 0060.';
  end if;

  if to_regclass('public._municipal_issue_review_authorizations') is not null then
    raise exception 'STOP: _municipal_issue_review_authorizations ya existe; 0061 no debería reaplicarse.';
  end if;
end
$$;

select
  status,
  count(*) as issue_count
from public.municipal_issues
group by status
order by status;
