-- 0058_municipal_detected_location_nullable.sql
--
-- Permite que la bandeja interna del Radar (`status = detected`) conserve
-- hallazgos todavía no geocodificados/verificados sin inventar coordenadas.
-- Antes de cualquier estado público, el trigger de 0056 sigue resolviendo y
-- sobrescribiendo lat/lng desde municipal_map_points (INE + CartoCiudad/CNIG).

alter table public.municipal_issues
  alter column lat drop not null,
  alter column lng drop not null;

alter table public.municipal_issues
  drop constraint if exists municipal_issues_public_location_required;

alter table public.municipal_issues
  add constraint municipal_issues_public_location_required
  check (
    status = 'detected'
    or (
      municipality_ine_code is not null
      and lat is not null
      and lng is not null
    )
  );

comment on column public.municipal_issues.lat is
  'Puede ser NULL mientras status=detected. Para estados públicos se deriva del punto municipal canónico mediante municipal_issues_public_location_guard.';

comment on column public.municipal_issues.lng is
  'Puede ser NULL mientras status=detected. Para estados públicos se deriva del punto municipal canónico mediante municipal_issues_public_location_guard.';

comment on constraint municipal_issues_public_location_required on public.municipal_issues is
  'Un hallazgo interno puede esperar geocodificación; cualquier problema público exige INE y coordenadas canónicas.';
