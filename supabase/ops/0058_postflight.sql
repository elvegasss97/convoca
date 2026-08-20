-- Postflight for 0058_municipal_detected_location_nullable.sql
-- Read-only verification after applying the migration.

select
  c.column_name,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'municipal_issues'
  and c.column_name in ('lat', 'lng')
order by c.column_name;

select
  con.conname,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'municipal_issues'
  and con.conname = 'municipal_issues_public_location_required';

select
  count(*) filter (where status = 'detected') as detected_total,
  count(*) filter (where status <> 'detected') as public_total,
  count(*) filter (where status <> 'detected' and municipality_ine_code is null) as public_without_ine,
  count(*) filter (where status <> 'detected' and (lat is null or lng is null)) as public_without_coords
from public.municipal_issues;

-- Expected:
-- - lat/lng: YES
-- - constraint present
-- - public_without_ine = 0
-- - public_without_coords = 0
