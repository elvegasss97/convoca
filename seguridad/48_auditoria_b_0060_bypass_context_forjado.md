# Auditoría B independiente — PR #34 (`feat/municipal-radar-ingestion-0058`)

Fecha: 2026-08-20. Auditor: sesión independiente de Claude Code, sin participación en la implementación de 0058/0059/0060. Alcance de este documento: un único hallazgo CRITICAL en `0060_municipal_issue_review_path_guard.sql` y su corrección (`0061`). El resto de la auditoría (RLS, Edge Function, mapa/UX, tipos, quality gates) se reportó por otro canal y no se repite aquí.

## Hallazgo

`enforce_municipal_issue_review_path()` (0060) compara un GUC de transacción:

```sql
v_expected_context := coalesce(v_actor_id::text, '') || ':' || new.id::text || ':' || 'publish'|'dismiss';
...
if v_context is distinct from v_expected_context then raise exception ...;
```

Los tres componentes de `v_expected_context` son conocidos por el propio staff (su `auth.uid()`, el `id` del issue que ya puede leer, y el literal `publish`/`dismiss`). `set_config()` sobre un GUC con formato `namespace.variable` no registrado por ningún módulo no exige ningún privilegio en PostgreSQL — lo puede ejecutar cualquier rol, incluido `authenticated`.

Consecuencia: un miembro de staff con rol y AAL2 legítimos puede construir ese mismo string él mismo, **sin llamar nunca a `review_municipal_issue()`**, y hacer un `UPDATE` directo que:

- pasa `detected -> verified` (o `dismissed`) saltándose el guard;
- **no exige fuente** (`municipal_issue_sources`);
- **no exige punto municipal canónico** más allá de lo que ya deje pasar el trigger de 0056;
- **no deja fila en `audit_trail`**.

Esto reabre exactamente el bypass que 0060 dice cerrar (staff con `UPDATE` directo saltándose la RPC auditada), solo que sustituyendo "cualquier `UPDATE` directo" por "cualquier `UPDATE` directo con una línea extra de `set_config`".

Reproducido contra staging (`hapxitzmmifuddvbfphc`) dentro de `BEGIN`/`ROLLBACK`, sin persistir cambios ni tocar los hallazgos reales:

```sql
select set_config('convoca.municipal_issue_review_context',
                   my_own_auth_uid || ':' || issue_id || ':publish', true);
update municipal_issues set status = 'verified', published_at = now() where id = issue_id;
```

Resultado observado: `status` pasa a `verified`, `sources` asociadas = 0, `audit_trail` para ese issue = 0.

## Corrección (0061, no toca 0058/0059/0060)

Se sustituye el GUC adivinable por una fila de autorización de un solo uso en una tabla nueva, sin ningún `GRANT` para `anon`/`authenticated` y sin `policy` de RLS. La autorización queda restringida al dueño de la tabla y a la función `SECURITY DEFINER` de revisión, que se ejecuta como ese mismo dueño.

```
public._municipal_issue_review_authorizations (issue_id, action, actor_id, txid, created_at)
```

- `review_municipal_issue()` inserta la fila **después** de todas las comprobaciones de elegibilidad de publicación (INE, fuente, punto canónico) y **antes** del `UPDATE`; la borra inmediatamente después de auditar. Si cualquier comprobación previa falla, nunca llega a insertarse — no hay forma de dejar una autorización huérfana.
- `enforce_municipal_issue_review_path()` ya no lee ningún GUC: exige `exists(... where issue_id=new.id and action=<publish|dismiss> and actor_id=auth.uid() and txid=txid_current())`.
- La autorización queda además atada a `txid_current()`: ni siquiera copiar la fila entre transacciones distintas serviría (aunque fuera legible, que no lo es).

## Verificación (clean-room local, Docker, migraciones 0001→0061)

Todo dentro de transacciones con `ROLLBACK`, usando fixtures temporales (nunca los issues reales):

- `set_config` forjado con el string exacto `actor:issue:publish` → bloqueado; el trigger de 0061 ya no lee ese GUC.
- `INSERT`/`SELECT` directo de `authenticated` contra `_municipal_issue_review_authorizations` → `permission denied` en ambos casos.
- `review_municipal_issue(..., 'publish')` con fuente + punto canónico, y `review_municipal_issue(..., 'dismiss')` → funcionan igual que antes de 0061, dejan fila en `audit_trail` con actor/acción correctos.
- Filas en `_municipal_issue_review_authorizations` tras un publish/dismiss exitoso: **0** (consumida). Tras un intento de publish fallido (sin fuente): **0** (nunca se creó). Tras el `ROLLBACK` completo de la sesión de prueba: **0**.
- Contexto de un issue no reutilizable para otro (`leftover authorization from A cannot publish B`): bloqueado.
- Resto de la matriz de 0060 (AAL1 bloqueado, `verified→in_action→resolved`, `resolved/dismissed→detected` bloqueado, `INSERT` obligado a `detected`, `guard_municipal_staff_map_resolution_server` inalcanzable desde `authenticated`): sigue en verde.
- `pnpm security:baseline` completo: 13/13 `ok` con 0061 presente en el árbol de migraciones.

## Revisión C de la corrección

Antes de promover 0061 se comprobó el comportamiento real de los default privileges de Supabase staging. Las tablas nuevas en `public` reciben DML para `service_role` por defecto, por lo que revocar únicamente `anon` y `authenticated` no hacía literalmente cierta la invariante “solo el dueño puede escribir”. La Edge `review-municipal-issue` usa `service_role` únicamente para catálogo/caché CartoCiudad y ejecuta la decisión final con el JWT original del moderador, así que `service_role` no necesita esta capacidad.

La versión revisada de 0061 por tanto:

- revoca también `service_role` sobre `_municipal_issue_review_authorizations`;
- revoca `EXECUTE` de `review_municipal_issue` a `service_role`;
- exige en postflight RLS activo, cero policies, cero DML para `anon`/`authenticated`/`service_role`, RPC `SECURITY DEFINER` y mismo owner entre tabla y RPC;
- añade una regresión automática en `municipalReviewPathGuard.test.ts` para fijar estas invariantes y la eliminación del GUC adivinable.

## Estado en staging

**0061 no se ha aplicado a staging en el momento de esta revisión documental.** Staging permanece en 0060, con los mismos 7 `detected` / 0 `dismissed` / 0 públicos de antes de esta auditoría. La promoción de 0061 requiere que el HEAD final vuelva a superar PR Quality y Security Baseline antes del preflight de staging.

Security-Baseline-Override: security-definer:review_municipal_issue
Security-Baseline-Override: security-definer:guard_municipal_staff_map_resolution_server
Security-Baseline-Override: service-role:review-municipal-issue
