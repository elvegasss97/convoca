-- 0060_municipal_issue_review_path_guard.sql
--
-- Cierra el último bypass de publicación del Radar Municipal: aunque un
-- miembro de staff tenga permiso de UPDATE sobre municipal_issues, una fila
-- `detected` no puede convertirse en pública (ni descartarse) mediante UPDATE
-- directo. La transición debe ocurrir dentro de review_municipal_issue(), que
-- exige staff + MFA/AAL2, fuente/punto canónico al publicar y deja auditoría.

-- ---------------------------------------------------------------------------
-- 1. Guard de transición: el contexto queda ligado a actor + issue + acción
-- ---------------------------------------------------------------------------

create or replace function public.enforce_municipal_issue_review_path()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_context text := current_setting('convoca.municipal_issue_review_context', true);
  v_expected_context text;
begin
  -- Los procesos de ingestión solo crean hallazgos internos. No existe una
  -- vía de INSERT que pueda nacer ya publicada o descartada.
  if tg_op = 'INSERT' then
    if new.status <> 'detected' then
      raise exception 'Los hallazgos municipales deben crearse como detected y pasar por revisión humana.';
    end if;
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  -- El ciclo público posterior puede evolucionar entre estados públicos sin
  -- reutilizar la decisión inicial de publicación.
  if old.status in ('verified', 'in_action', 'resolved')
     and new.status in ('verified', 'in_action', 'resolved') then
    return new;
  end if;

  -- Un hallazgo descartado queda cerrado hasta que exista un flujo explícito
  -- de reapertura. Evita reactivaciones accidentales por UPDATE directo.
  if old.status = 'dismissed' then
    raise exception 'Un hallazgo descartado no puede reactivarse mediante UPDATE directo.';
  end if;

  -- Tampoco se permite devolver una publicación a un estado interno sin un
  -- flujo específico y auditado.
  if old.status in ('verified', 'in_action', 'resolved')
     and new.status in ('detected', 'dismissed') then
    raise exception 'Un hallazgo público no puede volver a estado interno mediante UPDATE directo.';
  end if;

  if old.status = 'detected' and new.status = 'verified' then
    v_expected_context := coalesce(v_actor_id::text, '') || ':' || new.id::text || ':publish';
  elsif old.status = 'detected' and new.status = 'dismissed' then
    v_expected_context := coalesce(v_actor_id::text, '') || ':' || new.id::text || ':dismiss';
  else
    raise exception 'Transición municipal no permitida; utiliza el flujo de revisión correspondiente.';
  end if;

  if v_actor_id is null
     or not public.is_moderator_or_admin()
     or v_context is distinct from v_expected_context then
    raise exception 'La publicación o descarte de un hallazgo municipal debe pasar por la revisión auditada.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_municipal_issue_review_path() from public, anon, authenticated;

comment on function public.enforce_municipal_issue_review_path() is
  'Trigger invoker: impide publicar/descartar/reabrir municipal_issues por UPDATE directo. detected->verified/dismissed exige contexto actor+issue+acción establecido por review_municipal_issue.';

drop trigger if exists municipal_issues_a_review_path_guard on public.municipal_issues;
create trigger municipal_issues_a_review_path_guard
  before insert or update of status on public.municipal_issues
  for each row execute function public.enforce_municipal_issue_review_path();

-- ---------------------------------------------------------------------------
-- 2. La RPC auditada establece el contexto de una sola decisión/issue
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
  end if;

  -- `true` => transaction-local. El valor no sobrevive a la petición RPC y,
  -- además, queda ligado al usuario autenticado, al issue y a la acción.
  perform set_config(
    'convoca.municipal_issue_review_context',
    v_actor_id::text || ':' || p_issue_id::text || ':' || p_action,
    true
  );

  if p_action = 'publish' then
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
  'Única vía para sacar un hallazgo de detected: staff MFA/AAL2, publish|dismiss, contexto transaccional ligado a issue, fuente+punto canónico al publicar y audit_trail.';
