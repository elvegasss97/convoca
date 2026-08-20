-- Read-only preflight for 0058_municipal_detected_location_nullable.sql
-- Run before applying 0058. It should not mutate data.

select
  count(*) filter (where status = 'detected') as detected_total,
  count(*) filter (where status <> 'detected') as public_total,
  count(*) filter (where status <> 'detected' and municipality_ine_code is null) as public_without_ine,
  count(*) filter (where status <> 'detected' and (lat is null or lng is null)) as public_without_coords
from public.municipal_issues;

-- Expected invariant before 0058: public_without_ine = 0 and public_without_coords = 0.
-- Any non-zero value means stop and investigate before migration.
