-- Preserve the most precise known location for municipal issues.
-- Explicit issue coordinates win; municipal_map_points is only a fallback.

alter table public.municipal_issues
  add column if not exists location_label text;

alter table public.municipal_issues
  add column if not exists location_precision text;

alter table public.municipal_issues
  add column if not exists location_source_url text;

alter table public.municipal_issues
  add column if not exists location_source_provider text;

alter table public.municipal_issues
  drop constraint if exists municipal_issues_location_precision_check;

alter table public.municipal_issues
  add constraint municipal_issues_location_precision_check
  check (
    location_precision is null
    or location_precision in (
      'exact',
      'address',
      'site',
      'street',
      'neighborhood',
      'multi_site',
      'municipal_seat'
    )
  );

create or replace function public.normalize_public_municipal_issue_location()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_municipality public.ine_municipalities%rowtype;
  v_lat double precision;
  v_lng double precision;
begin
  if (new.lat is null) <> (new.lng is null) then
    raise exception 'La ubicación debe incluir latitud y longitud juntas.';
  end if;

  if new.status in ('verified', 'in_action', 'resolved') then
    if new.municipality_ine_code is null then
      raise exception 'Un problema municipal público necesita código INE.';
    end if;

    select *
      into v_municipality
      from public.ine_municipalities
     where ine_code = new.municipality_ine_code;

    if not found then
      raise exception 'El municipio del problema no existe en el catálogo INE.';
    end if;

    new.municipality_name := v_municipality.name;
    new.province_code := v_municipality.province_code;

    -- Never replace a more precise issue location with the municipality centroid/seat.
    if new.lat is null then
      select lat, lng
        into v_lat, v_lng
        from public.municipal_map_points
       where municipality_ine_code = new.municipality_ine_code;

      if not found then
        raise exception 'Verifica primero la ubicación canónica del municipio antes de publicar el problema.';
      end if;

      new.lat := v_lat;
      new.lng := v_lng;
      new.location_precision := coalesce(new.location_precision, 'municipal_seat');
      new.location_label := coalesce(new.location_label, v_municipality.name);
      new.location_source_provider := coalesce(new.location_source_provider, 'municipal_map_points');
    end if;
  end if;

  return new;
end;
$$;
