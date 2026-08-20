-- 0059_municipal_issue_review_workflow.sql
--
-- Flujo humano de revisión del Radar Municipal.
-- Un hallazgo `detected` nunca se publica automáticamente: staff con MFA/AAL2
-- debe decidir explícitamente entre `publish` y `dismiss`.

-- ---------------------------------------------------------------------------
-- 1. Estado interno descartado: conserva fuentes/trazabilidad sin publicarlo
-- ---------------------------------------------------------------------------

alter table public.municipal_issues
  drop constraint municipal_issues_status_check;
alter table public.municipal_issues
  add constraint municipal_issues_status_check
  check (status in ('detected', 'verified', 'in_action', 'resolved', 'dismissed'));

alter table public.municipal_issues
  drop constraint municipal_issues_publication_consistency;
alter table public.municipal_issues
  add constraint municipal_issues_publication_consistency
  check (
    (status in ('detected', 'dismissed') and published_at is null)
    or (status in ('verified', 'in_action', 'resolved') and published_at is not null)
  );

alter table public.municipal_issues
  drop constraint municipal_issues_public_location_required;
alter table public.municipal_issues
  add constraint municipal_issues_public_location_required
  check (
    status in ('detected', 'dismissed')
    or (
      municipality_ine_code is not null
      and lat is not null
      and lng is not null
    )
  );

comment on constraint municipal_issues_public_location_required on public.municipal_issues is
  'Hallazgos internos detected/dismissed pueden no estar geocodificados; cualquier estado público exige INE y coordenadas canónicas.';

-- ---------------------------------------------------------------------------
-- 2. Auditoría de las decisiones de Radar
-- ---------------------------------------------------------------------------

alter table public.audit_trail drop constraint audit_trail_target_type_check;
alter table public.audit_trail add constraint audit_trail_target_type_check
  check (target_type in ('open_voice_contribution', 'verification_document', 'municipal_petition', 'municipal_issue'));

alter table public.audit_trail drop constraint audit_trail_action_check;
alter table public.audit_trail add constraint audit_trail_action_check
  check (action in (
    'open_voice_moderation_update',
    'verification_document_review',
    'verification_document_signed_url_issued',
    'municipal_petition_report_dismissed',
    'municipal_petition_hidden',
    'municipal_issue_verified',
    'municipal_issue_dismissed'
  ));

-- ---------------------------------------------------------------------------
-- 3. Decisión humana: publish / dismiss
-- ---------------------------------------------------------------------------

create or replace function public.review_municipal_issue(
  p_issue_id uuid,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_issue public.municipal_issues%rowtype;
begin
  if v_actor_id is null or not public.is_moderator_or_admin() then
    raise exception 'Acceso restringido a moderación.';
  end if;

  if p_action not in ('publish', 'dismiss') then
    raise exception 'Acción de revisión no válida.';
  end if;

  select * into v_issue
  from public.municipal_issues
  where id = p_issue_id and status = 'detected'
  for update;

  if not found then
    raise exception 'El hallazgo ya no está pendiente de revisión.';
  end if;

  if p_action = 'publish' then
    if v_issue.municipality_ine_code is null then
      raise exception 'El hallazgo necesita un municipio INE antes de publicarse.';
    end if;

    if not exists (
      select 1 from public.municipal_issue_sources s where s.issue_id = p_issue_id
    ) then
      raise exception 'Añade al menos una fuente verificable antes de publicar.';
    end if;

    if not exists (
      select 1 from public.municipal_map_points p
      where p.municipality_ine_code = v_issue.municipality_ine_code
    ) then
      raise exception 'Verifica primero la ubicación canónica del municipio.';
    end if;

    update public.municipal_issues
    set status = 'verified', published_at = now()
    where id = p_issue_id;

    insert into public.audit_trail(
      target_type, target_id, action, actor_type, actor_id, metadata
    ) values (
      'municipal_issue', p_issue_id, 'municipal_issue_verified', 'human', v_actor_id,
      jsonb_build_object('previous_status', 'detected', 'new_status', 'verified')
    );
  else
    update public.municipal_issues
    set status = 'dismissed', published_at = null, resolved_at = null
    where id = p_issue_id;

    insert into public.audit_trail(
      target_type, target_id, action, actor_type, actor_id, metadata
    ) values (
      'municipal_issue', p_issue_id, 'municipal_issue_dismissed', 'human', v_actor_id,
      jsonb_build_object('previous_status', 'detected', 'new_status', 'dismissed')
    );
  end if;

  return true;
end;
$$;

revoke all on function public.review_municipal_issue(uuid, text) from public, anon;
grant execute on function public.review_municipal_issue(uuid, text) to authenticated;

comment on function public.review_municipal_issue(uuid, text) is
  'Decisión humana MFA/AAL2 sobre un hallazgo detected. Publicar exige fuente y punto municipal canónico; descartar conserva trazabilidad interna.';

-- ---------------------------------------------------------------------------
-- 4. Rate-limit de CartoCiudad para publicaciones del panel staff
-- ---------------------------------------------------------------------------

alter table public.write_rate_limits drop constraint write_rate_limits_action_check;
alter table public.write_rate_limits add constraint write_rate_limits_action_check
  check (action in (
    'reports', 'channel_reports', 'concern_proposals', 'open_voice_contributions',
    'municipal_petitions', 'municipal_map_resolutions', 'municipal_petition_reports',
    'municipal_staff_map_resolutions'
  ));

create or replace function public.guard_municipal_staff_map_resolution_server(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_short_count integer;
  v_day_count integer;
begin
  if p_user_id is null or not exists (
    select 1 from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = p_user_id and p.role in ('moderator', 'admin')
  ) then
    raise exception 'La cuenta de staff no es válida.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text), hashtext('municipal_staff_map_resolutions'));
  insert into public.write_rate_limits(user_id, action)
  values (p_user_id, 'municipal_staff_map_resolutions');

  select count(*) into v_short_count
  from public.write_rate_limits
  where user_id = p_user_id
    and action = 'municipal_staff_map_resolutions'
    and called_at > now() - interval '10 minutes';
  if v_short_count > 20 then
    raise exception 'Demasiadas verificaciones municipales seguidas.';
  end if;

  select count(*) into v_day_count
  from public.write_rate_limits
  where user_id = p_user_id
    and action = 'municipal_staff_map_resolutions'
    and called_at > now() - interval '1 day';
  if v_day_count > 100 then
    raise exception 'Límite diario de verificaciones municipales alcanzado.';
  end if;

  return true;
end;
$$;

revoke all on function public.guard_municipal_staff_map_resolution_server(uuid) from public, anon, authenticated;
grant execute on function public.guard_municipal_staff_map_resolution_server(uuid) to service_role;

comment on function public.guard_municipal_staff_map_resolution_server(uuid) is
  'Gate service_role-only para limitar I/O externo de CartoCiudad iniciado por staff. La Edge Function comprueba previamente rol + MFA/AAL2 con el JWT del caller.';
