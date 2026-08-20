# Auditoría B independiente — PR #34 (`feat/municipal-radar-ingestion-0058`)

Fecha: 2026-08-20. Auditor B: sesión independiente de Claude Code. Revisión C y promoción a staging: ChatGPT. Alcance: bypass CRITICAL encontrado en `0060_municipal_issue_review_path_guard.sql`, corrección `0061` y verificación posterior.

## Hallazgo CRITICAL de Auditor B

`0060` comparaba un GUC transaccional construido con `auth.uid():issue_id:publish|dismiss`. Los tres componentes son conocidos por el propio staff y `set_config()` sobre un custom GUC no registrado no exige privilegio especial.

Un staff+AAL2 podía por tanto fijar el mismo valor y ejecutar directamente `detected -> verified/dismissed` sin pasar por `review_municipal_issue()`, saltándose fuente y `audit_trail`.

El ataque fue reproducido contra staging dentro de `BEGIN/ROLLBACK`, sin persistir datos:

```sql
select set_config('convoca.municipal_issue_review_context',
                   my_own_auth_uid || ':' || issue_id || ':publish', true);
update municipal_issues set status = 'verified', published_at = now() where id = issue_id;
```

Resultado antes del fix: el issue podía pasar a `verified` sin fuente y sin auditoría.

## Corrección 0061

`0061_municipal_issue_review_context_unforgeable.sql` no modifica 0058/0059/0060. Sustituye el GUC adivinable por una autorización de un solo uso:

```text
public._municipal_issue_review_authorizations
(issue_id, action, actor_id, txid, created_at)
```

`review_municipal_issue()` crea la autorización después de validar MFA/rol y, para publish, INE + fuente + punto canónico. El trigger exige una fila ligada al actor, issue, acción y `txid_current()`. Tras el UPDATE y el `audit_trail`, la autorización se elimina. Un fallo previo a la autorización no deja fila residual y un rollback revierte toda la operación.

## Revisión C

Se comprobó en staging que los default privileges de Supabase conceden DML a `service_role` sobre tablas nuevas. Como la Edge usa `service_role` solo para catálogo/caché CartoCiudad y ejecuta la decisión humana final con el JWT original del moderador, `service_role` no necesita acceso a la autorización ni EXECUTE sobre `review_municipal_issue`.

La versión final de 0061:

- revoca DML sobre `_municipal_issue_review_authorizations` a `public`, `anon`, `authenticated` y `service_role`;
- mantiene RLS activa y deliberadamente cero policies;
- revoca EXECUTE de `review_municipal_issue` a `anon` y `service_role`, dejando únicamente `authenticated` como rol API invocador;
- exige `SECURITY DEFINER` y mismo owner entre RPC y tabla interna;
- mantiene `search_path = pg_catalog, public`;
- conserva fuente, punto canónico y `audit_trail`;
- añade regresión automática que impide volver al GUC adivinable.

## Validación de staging — 0061

Staging `hapxitzmmifuddvbfphc` fue promovido de 0060 a **0061** tras superar PR Quality, Security Baseline y Preview sobre el código revisado.

Postflight estructural:

- RLS activa y cero policies en la tabla interna;
- cero SELECT/INSERT/UPDATE/DELETE para `anon`, `authenticated` y `service_role`;
- tabla y RPC comparten owner;
- RPC sigue siendo `SECURITY DEFINER`;
- `anon` y `service_role` sin EXECUTE de la decisión humana;
- `authenticated` conserva EXECUTE;
- trigger ya no contiene `convoca.municipal_issue_review_context`;
- 7 `detected`, 0 `dismissed`, 0 públicos y 0 autorizaciones sobrantes.

Matriz funcional dentro de `BEGIN/ROLLBACK`:

- AAL1 publish por RPC: bloqueado;
- staff+AAL2 + GUC antiguo forjado + UPDATE directo: bloqueado;
- autorización de issue A reutilizada sobre issue B: bloqueada;
- publish por RPC con fuente + punto canónico: funciona, canonicaliza y audita;
- publish sin fuente: bloqueado antes de crear autorización;
- dismiss por RPC: funciona y audita;
- autorizaciones sobrantes tras publish/dismiss/fallo: 0;
- `verified -> in_action -> resolved`: permitido;
- `resolved -> detected`: bloqueado;
- `dismissed -> detected`: bloqueado;
- `service_role` sin DML de autorización y sin EXECUTE de review RPC.

Se repitió además con **`SET LOCAL ROLE authenticated` real** y JWT AAL2 de un perfil staff de staging: el GUC puede seguir fijándose, pero no autoriza el UPDATE; el rol no puede leer la tabla interna y la RPC legítima sí publica y audita.

Tras todos los rollbacks: 0 fixtures, 0 puntos de mapa de test, 0 autorizaciones, y los 7 hallazgos reales permanecen intactos en `detected`.

## Tipos y advisors

`database.types.ts` se regeneró y formateó mecánicamente desde una Supabase local desechable reconstruida con migraciones 0001→0061. El esquema generado incluye `_municipal_issue_review_authorizations` y conserva las firmas municipales actuales.

El Security Advisor de staging solo marca la nueva tabla con `rls_enabled_no_policy` (INFO), comportamiento deliberado para esta tabla owner-only. `review_municipal_issue` aparece únicamente en el aviso de SECURITY DEFINER ejecutable por `authenticated`, que es intencional porque la función valida staff+AAL2 internamente. No apareció exposición anónima nueva para esta RPC.

## Estado final de este checkpoint

- Staging: **0061**.
- Datos reales Radar en staging: 7 `detected`, 0 `dismissed`, 0 públicos.
- Producción: permanece en **0057**; no ha sido tocada por 0058–0061.
- PR #34 continúa draft y sin merge hasta autorización explícita de producción.

Security-Baseline-Override: security-definer:review_municipal_issue
Security-Baseline-Override: security-definer:guard_municipal_staff_map_resolution_server
Security-Baseline-Override: service-role:review-municipal-issue
