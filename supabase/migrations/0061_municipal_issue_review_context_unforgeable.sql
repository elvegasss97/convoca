-- 0061_municipal_issue_review_context_unforgeable.sql
--
-- AUDITORÍA B (PR #34): 0060 introdujo un guard de transición para
-- `municipal_issues`, pero el "contexto" que compara es una cadena
-- enteramente predecible: `<auth.uid()>:<issue_id>:<publish|dismiss>`. Los
-- tres componentes son públicos/conocidos por cualquier staff con AAL2 (su
-- propio auth.uid(), el id del issue que ya puede leer, y el literal de la
-- acción). `set_config()` sobre un GUC "namespace.variable" no registrado es
-- ejecutable por CUALQUIER rol (no requiere privilegio especial), así que
-- un staff+AAL2 puede fijar ese contexto él mismo, sin llamar nunca a
-- `review_municipal_issue()`, y luego hacer el `UPDATE` directo que 0060
-- pretendía bloquear. Esto reabre exactamente el bypass que 0060 decía
-- cerrar: `detected -> verified/dismissed` sin fuente, sin punto canónico
-- exigido en el momento del guard y, sobre todo, SIN fila en `audit_trail`.
--
-- Reproducido en staging dentro de una transacción con ROLLBACK (auditoría
-- independiente, sin persistir cambios):
--   set_config('convoca.municipal_issue_review_context',
--              my_own_auth_uid || ':' || issue_id || ':publish', true);
--   update municipal_issues set status = 'verified', published_at = now()
--     where id = issue_id;
--   -- éxito: status pasa a 'verified' sin fuente adjunta y sin fila de
--   -- audit_trail para ese issue.
--
-- Corrección (acotada, sin tocar 0058/0059/0060): sustituir la cadena
-- adivinable por una autorización que NINGÚN rol de cliente puede escribir.
-- Se usa el mismo patrón ya empleado en este proyecto para `audit_trail`
-- (0049) y `municipal_map_points` (0056): una tabla sin ningún grant para
-- `anon`/`authenticated` y sin policies de RLS, escribible solo por el
-- dueño de la tabla (las funciones SECURITY DEFINER se ejecutan como ese
-- dueño y no dependen de GRANT/RLS). La comprobación además ata la
-- autorización a la transacción concreta (`txid_current()`), así que ni
-- siquiera copiar la fila entre pestañas/backends distintos sirve.

create table public._municipal_issue_review_authorizations (
  issue_id uuid not null references public.municipal_issues (id) on delete cascade,
  action text not null check (action in ('publish', 'dismiss')),
  actor_id uuid not null,
  txid bigint not null default txid_current(),
  created_at timestamptz not null default now(),
  primary key (issue_id, action, txid)
);

alter table public._municipal_issue_review_authorizations enable row level security;
revoke all on public._municipal_issue_review_authorizations from public, anon, authenticated;
-- Deliberadamente sin `create policy`: con RLS activo y cero policies,
-- ningún rol de cliente puede leer ni escribir ni una fila. Solo el dueño
-- de la tabla (las funciones SECURITY DEFINER de abajo) tiene acceso.

comment on table public._municipal_issue_review_authorizations is
  'Autorización de un solo uso, no legible/escribible por anon/authenticated, que enforce_municipal_issue_review_path() exige para dejar pasar detected->verified/dismissed. Sustituye al contexto por GUC de 0060 (adivinable: set_config() sobre un custom GUC no requiere privilegio alguno). Solo review_municipal_issue() puede crearla.';

-- ---------------------------------------------------------------------------
-- 1. Guard de transición: exige la autorización de solo-dueño, no un GUC
-- ---------------------------------------------------------------------------

create or replace function public.enforce_municipal_issue_review_path()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_action text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'detected' then
      raise exception 'Los hallazgos municipales deben crearse como detected y pasar por revisión humana.';
    end if;
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status in ('verified', 'in_action', 'resolved')
     and new.status in ('verified', 'in_action', 'resolved') then
    return new;
  end if;

  if old.status = 'dismissed' then
    raise exception 'Un hallazgo descartado no puede reactivarse mediante UPDATE directo.';
  end if;

  if old.status in ('verified', 'in_action', 'resolved')
     and new.status in ('detected', 'dismissed') then
    raise exception 'Un hallazgo público no puede volver a estado interno mediante UPDATE directo.';
  end if;

  if old.status = 'detected' and new.status = 'verified' then
    v_action := 'publish';
  elsif old.status = 'detected' and new.status = 'dismissed' then
    v_action := 'dismiss';
  else
    raise exception 'Transición municipal no permitida; utiliza el flujo de revisión correspondiente.';
  end if;

  if v_actor_id is null
     or not public.is_moderator_or_admin()
     or not exists (
       select 1
       from public._municipal_issue_review_authorizations a
       where a.issue_id = new.id
         and a.action = v_action
         and a.actor_id = v_actor_id
         and a.txid = txid_current()
     ) then
    raise exception 'La publicación o descarte de un hallazgo municipal debe pasar por la revisión auditada.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_municipal_issue_review_path() from public, anon, authenticated;

comment on function public.enforce_municipal_issue_review_path() is
  'Trigger invoker: impide publicar/descartar/reabrir municipal_issues por UPDATE directo. detected->verified/dismissed exige una fila en public._municipal_issue_review_authorizations (solo escribible por el dueño de la tabla, ver 0061) para el actor+issue+acción+transacción actuales.';

-- El trigger ya existe desde 0060 (mismo nombre, antes alfabéticamente que
-- municipal_issues_public_location_guard de 0056); no hace falta recrearlo,
-- CREATE OR REPLACE FUNCTION ya actualiza su comportamiento.

-- ---------------------------------------------------------------------------
-- 2. La RPC auditada escribe la autorización de solo-dueño, no un GUC
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

  -- Autorización de un solo uso: solo el dueño de la tabla puede escribir
  -- aquí (sin GRANT para anon/authenticated, sin policies de RLS), así que
  -- ningún cliente puede fabricarla por su cuenta como sí podía con el GUC
  -- de 0060. Atada además a esta transacción concreta (txid_current()).
  insert into public._municipal_issue_review_authorizations (issue_id, action, actor_id)
  values (p_issue_id, p_action, v_actor_id);

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

  -- Consumida: no deja crecer la tabla sin límite ni permite reutilizarla
  -- (el `txid` ya la ataba a esta transacción; esto es solo higiene).
  delete from public._municipal_issue_review_authorizations
  where issue_id = p_issue_id and action = p_action and txid = txid_current();

  return true;
end;
$$;

revoke all on function public.review_municipal_issue(uuid, text) from public, anon;
grant execute on function public.review_municipal_issue(uuid, text) to authenticated;

comment on function public.review_municipal_issue(uuid, text) is
  'Única vía para sacar un hallazgo de detected: staff MFA/AAL2, publish|dismiss, autorización de un solo uso en _municipal_issue_review_authorizations (no fabricable por el cliente), fuente+punto canónico al publicar y audit_trail.';
