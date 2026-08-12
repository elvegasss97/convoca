# 45 — Resultados de aplicación y validación de 0044 en staging

**Estado: `0044` aplicada realmente a `<proyecto-staging>` y validada con sesiones reales de `supabase-js`. Producción no se ha tocado en ningún momento — no se ha ejecutado `db push` contra producción, no se ha hecho `vercel deploy --prod`, no se ha hecho merge a `main`.** Rama: `fix/post-review-hardening-0044` (creada desde `main` en `b486686`, confirmado `main == origin/main` antes de empezar). Continúa `seguridad/41`/`42`/`43`/`44`.

---

## 1. Estado base (antes de empezar)

- Rama: `main`, HEAD `b486686` (`docs(open-source): registrar apertura pública (OSR-3)`).
- `main == origin/main` (0 commits de diferencia en ambas direcciones).
- Repositorio público (`elvegasss97/convoca`, confirmado vía `gh repo view`).
- `git status`: sin cambios en archivos ya trackeados, solo untracked históricos (no tocados por esta fase).
- Staging (`<proyecto-staging>`): `migration list` → 43 migraciones, `local == remote` en las 43, `0044` ausente. `db push --dry-run` → exclusivamente `0044_post_review_abuse_and_visibility_hardening.sql` pendiente.
- Producción: **no verificable directamente en esta sesión** — no existe `.env.production.secrets` ni ningún `SUPABASE_ACCESS_TOKEN`/contraseña de base de datos de producción en este entorno (mismo patrón ya documentado en `seguridad/25_pre_b_produccion_resultados.md`: el acceso de escritura o incluso de lectura directa a producción requiere una autorización y credenciales aparte, no disponibles por diseño). Argumento indirecto pero sólido: `supabase/migrations/` no contenía ningún archivo `0044` hasta esta sesión, así que producción no puede haber ido más allá de `0043` a través del pipeline normal de despliegue (`db push` solo aplica lo que existe en el repo). No se ha intentado ni se intentará obtener esas credenciales como parte de esta tarea.

---

## 2. Precheck histórico — `community` en staging (§7)

Consulta read-only ejecutada contra `<proyecto-staging>` (conexión directa vía contenedor Docker efímero, `--rm`, sin persistencia; ninguna sentencia de escritura). Resultado:

```
public.concern_listening_survey_responses → 0 filas en total (tabla vacía en staging)
```

**No hay ningún dato histórico que clasificar.** `0` VALID, `0` NULL, `0` INVALID. No aplica ningún saneamiento — la migración se aplica sobre una tabla sin filas previas para esta funcionalidad. La consulta preparada en `seguridad/44_revision_0044_r2.md` §4 queda lista para reutilizarse si en el futuro hay datos reales que clasificar (en staging con más uso, o en producción cuando se autorice ese paso por separado).

---

## 3. Aplicación de 0044 a staging (§8)

```
supabase db push --db-url <staging>
→ Applying migration 0044_post_review_abuse_and_visibility_hardening.sql...
→ inicio: 2026-08-12T21:34:19Z · fin: 2026-08-12T21:34:24Z (~5s)
→ exit code 0, sin warnings ni errores
```

**Post-check — `migration list`:** 44 migraciones (`0001`…`0044`), `local == remote` en las 44.
**Post-check — `db push --dry-run`:** `{"upToDate":true,"migrations":[]}` — ninguna pendiente.

---

## 4. Tests estructurales en staging real (§9)

Todos verificados por consulta directa a catálogos del sistema (`pg_class`, `pg_proc`, `pg_trigger`, `pg_policies`, `cron.job`), tras aplicar `0044`:

| Verificación | Resultado |
|---|---|
| `write_rate_limits` existe | Sí |
| RLS activo en `write_rate_limits` | Sí (`relrowsecurity = true`) |
| Policies propias de `write_rate_limits` | 0 |
| ACL directa de `write_rate_limits` | `{postgres=arwdDxtm, service_role=arwdDxtm}` — **sin PUBLIC, sin anon, sin authenticated** |
| Las 4 funciones (`get_attendance_counts`, `set_concern_listening_survey_response`, `enforce_write_rate_limit`, `purge_old_write_rate_limits`) | `security_definer = true`, `search_path = public` fijado, en las 4 |
| `EXECUTE` de `enforce_write_rate_limit`/`purge_old_write_rate_limits` | Solo `postgres`, `service_role` — **sin anon, sin authenticated** |
| `EXECUTE` de `get_attendance_counts` | `postgres`, `anon`, `authenticated`, `service_role` — igual que antes de `0044` |
| `EXECUTE` de `set_concern_listening_survey_response` | `postgres`, `authenticated`, `service_role` — **sin anon** |
| 3 triggers (`enforce_reports_rate_limit`, `enforce_channel_reports_rate_limit`, `enforce_concern_proposals_rate_limit`) | Presentes, habilitados (`tgenabled = 'O'`), sobre `reports`/`channel_reports`/`concern_proposals` respectivamente |
| Cron `purge-old-write-rate-limits` | Presente, activo, `20 3 * * *` |
| Definición de `get_attendance_counts` contiene el filtro `status not in ('draft', ...)` | Sí |
| Definición de `set_concern_listening_survey_response` contiene el catálogo cerrado y la normalización previa a la validación | Sí, ambas |
| Definición de `enforce_write_rate_limit` contiene `pg_advisory_xact_lock` | Sí |

**10/10 verificaciones estructurales — todas coinciden exactamente con lo validado previamente en el entorno desechable de `44_revision_0044_r2.md`.**

---

## 5. Tests funcionales en staging real (§10) y concurrencia real (§11)

Script Node.js con `@supabase/supabase-js` real, contra la URL/`anon key`/`service_role key` reales de `<proyecto-staging>` (leídas de `.env.staging.secrets`, nunca impresas). Fixtures propios (3 usuarios reales de `auth.users`, 1 organizador, 5 eventos — uno por cada estado relevante —, 1 canal de comunicación, 1 ronda de escucha abierta), **sesiones reales obtenidas con `signInWithPassword`**. Todas las llamadas de prueba pasan por la API PostgREST/RPC real (`anon`/sesión autenticada), nunca por impersonación de rol en `psql`.

**Attendance:**
| # | Prueba | Resultado |
|---|---|---|
| 1 | `get_attendance_counts()` (`p_event_ids=NULL`) | Solo el evento público, conteo correcto |
| 2 | `get_attendance_counts(<4 IDs no públicos>)` | 0 filas |
| 3 | `get_attendance_counts([<ID público>])` | Conteo correcto, sin regresión |

**Community:**
| # | Prueba | Resultado |
|---|---|---|
| 4 | Las 19 entradas del catálogo, una a una | Las 19 aceptadas |
| 5-7 | `NULL`, `''`, `'   '` | Las 3 aceptadas |
| 8 | `'categoria_inventada'` | Rechazado (`Selecciona una comunidad autónoma válida.`) |
| 9 | Verificación en tabla: ninguna fila con categoría inventada | Confirmado |

**Rate limit (secuencial):**
| # | Prueba | Resultado |
|---|---|---|
| 10 | `reports`: intentos 1-3 | `[true,true,true,false]` — 3 PASS, 4º FAIL |
| 11 | `channel_reports`: mismo patrón | `[true,true,true,false]` |
| 12 | `concern_proposals`: intento 1-2 | `[true,false]` — 1 PASS, 2º FAIL |
| 13 | `SELECT` directo a `write_rate_limits`, autenticado | `permission denied for table write_rate_limits` |
| 14 | `SELECT` directo a `write_rate_limits`, `anon` | `permission denied for table write_rate_limits` |
| 15 | Usuario B reporta mientras usuario A ya agotó su cupo | Aceptado — independiente |

**Concurrencia real (§11, el defecto principal de R1):**
| # | Prueba | Resultado |
|---|---|---|
| 16 | Ronda 1 — 10 `reports` simultáneos (`Promise.all`, mismo usuario) | **3 OK / 7 FAIL** |
| 17 | Ronda 2 — repetido | **3 OK / 7 FAIL** |
| 18 | Ronda 3 — repetido | **3 OK / 7 FAIL** |
| 19 | Dos usuarios distintos, 10 simultáneos cada uno, a la vez | **3/3 cada uno** — sin interferencia mutua |
| 20 | `reports` (10) + `concern_proposals` (5) simultáneos, mismo usuario | **3 / 1** — límites independientes, sin bloqueo cruzado |

**20/20 pruebas PASS.** Ningún fallo. La propiedad más crítica (concurrencia real sin bypass) se sostiene de forma determinista en las 3 rondas — consistente con que el advisory lock elimina la dependencia del timing exacto: con la corrección, el resultado es el mismo se solapen las peticiones o no.

---

## 6. Cleanup de staging (§12)

Limpieza ejecutada en un bloque `finally` del propio script (se ejecuta incluso si alguna prueba falla). Verificación posterior por conteo directo, vía consulta de solo lectura contra staging:

| Tabla | Filas de prueba restantes |
|---|---|
| `auth.users` (`email like 'test0044_%'`) | **0** |
| `events` (`slug like 'test0044_%'`) | **0** |
| `organizers` (de los usuarios de prueba) | **0** |
| `reports` | **0** |
| `channel_reports` | **0** |
| `concern_proposals` | **0** |
| `concern_listening_rounds` (`version_label like 'test0044_%'`) | **0** |
| `write_rate_limits` (de los usuarios de prueba) | **0** |

**0 en las 8 tablas.** Ningún dato real preexistente de staging fue tocado — todas las operaciones de la prueba filtraron explícitamente por los IDs/etiquetas de los fixtures propios.

---

## 7. Rollback — revalidación contra el estado real post-0044 (§13)

**No se ha ejecutado el rollback contra staging** (no hizo falta — `0044` se aplicó sin errores y todas las pruebas pasaron). Revalidado en su lugar que `seguridad/43_rollback_0044_candidata.sql` sigue correspondiéndose exactamente con lo que existe ahora en staging:

- Los 7 objetos que el rollback busca revertir (tabla `write_rate_limits`, 3 triggers, cron job, funciones `enforce_write_rate_limit` y `purge_old_write_rate_limits`) **están presentes**, con los nombres exactos que el script espera.
- Las 2 funciones que el rollback reemplaza (`get_attendance_counts`, `set_concern_listening_survey_response`) tienen, en staging, exactamente las definiciones nuevas de `0044` (confirmado por huella `md5` de `pg_get_functiondef`, capturada en esta sesión).
- El propio rollback ya se probó en round-trip completo (PRE → `0044` → rollback → diff vacío contra PRE) en el entorno desechable de `44_revision_0044_r2.md` §7, antes de aplicar nada a staging.

**Rollback listo para ejecutarse contra staging si alguna vez hiciera falta — no ha sido necesario.**

---

## 8. Security Baseline, build, tests y auditoría (§14)

Ejecutados en la rama `fix/post-review-hardening-0044`, con el commit real ya creado (los checks basados en diff de la Security Baseline comparan contra el commit, no contra el árbol de trabajo):

```
pnpm test                → 129/129 tests PASS
pnpm build                → build de producción real, sin errores
pnpm security:baseline    → SECURITY BASELINE P0 — PASS (12/12 checks)
pnpm audit --prod         → sin vulnerabilidades conocidas
```

Detalle relevante de `security:baseline`:
- `migrations-structure` — incluye los 4 tripwires nuevos de `0044` (§10 de `seguridad/44`, ya implementados en `check-migrations-structure.mjs`): los 4 en `ok` (REVOKE ALL presente, advisory lock presente, catálogo de `p_community` presente, filtro de `get_attendance_counts` presente).
- `security-definer` — detectó correctamente las 4 funciones `SECURITY DEFINER` nuevas/modificadas y los 3 triggers críticos + su función compartida (recién registrados en `security-baseline/manifests/critical-triggers.json`), las 8 con override registrado en el commit (`WARN`, no `FAIL` — el mecanismo de override funcionó exactamente como está diseñado).
- `cleanroom`/`rls-cleanroom` — las 44 migraciones se reconstruyen limpio desde cero.
- `dependencies` — mismas 4 excepciones ya registradas y vigentes hasta 2026-11-09 (`fast-uri`, `brace-expansion` ×2, `nanoid`, todas `build-tooling-no-path-to-bundle`), **ninguna excepción nueva**.
- `secrets` — 116 commits escaneados, sin fugas.

**Ninguna excepción nueva creada para hacer pasar esta implementación.**

---

## 9. Alcance de lo modificado en esta fase

- `supabase/migrations/0044_post_review_abuse_and_visibility_hardening.sql` (nuevo) — contenido lógicamente idéntico a `seguridad/42_migracion_candidata_0044.sql` (confirmado por diff excluyendo comentarios), con el encabezado ajustado para reflejar que ya no es una candidata.
- `seguridad/41`/`42`/`43`/`44` — actualizados en la revisión 0044-R2 (ver esos documentos), sin cambios adicionales en esta fase salvo lo ya descrito ahí.
- `scripts/security/check-migrations-structure.mjs` — 4 tripwires nuevos (§10 de `seguridad/44`).
- `security-baseline/manifests/critical-triggers.json` — 3 triggers nuevos registrados.
- `supabase/functions/delete-account/index.ts` — comentario de cabecera y mensaje de error genéricos, corregidos para cubrir las 3 FK `RESTRICT` reales (antes solo mencionaba `events`). **No desplegada** — el cambio vive en el repo, listo para desplegar cuando se autorice, sin relación con Supabase/producción hasta entonces.

No se incorporó `set_attendance` ni ningún otro hallazgo fuera del alcance ya cerrado en `41`/`44`.

---

## 10. Riesgos residuales

- **Producción no verificada directamente** en esta sesión (§1) — limitación de credenciales, no de metodología. El propio código confirma que no puede estar por delante de `0043`.
- **`set_attendance` (`0014`) tiene el mismo patrón `INSERT→COUNT` sin advisory lock** que tenía `enforce_write_rate_limit` antes de esta corrección — misma clase de carrera, no confirmada empíricamente contra staging porque está fuera del alcance de `0044`. Queda anotado como hallazgo colateral para una revisión futura, igual que ya se documentó en `seguridad/44` §1.
- **Datos históricos de `community`**: staging no tenía ninguno que clasificar; la consulta de precheck queda lista pero no ejecutada contra producción — ese paso requiere autorización y credenciales aparte.
- **Edge Function `delete-account`**: el cambio de código está listo pero no desplegado a ningún entorno — desplegarlo es un paso operativo independiente, no cubierto por esta fase.

---

# 0044 — STAGING VALIDADO, PR LISTO PARA REVISIÓN
