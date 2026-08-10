# 34 — Resultados de implementación y validación de 0043 (local + staging: completo)

**Estado: implementación local completa, tracking de staging reconciliado, `0043` aplicada realmente a `convoca-staging` y validada con sesiones JWT reales.** No se ha tocado producción. No se ha modificado `0042` (solo se reconcilió su registro de tracking, sin re-ejecutar su SQL). Commit/push/PR: ver §13.

---

## 1. Archivos modificados

**Rama:** `fix/privacy-prelaunch-0043` (creada desde `main` en `e54db62`, confirmado `main == origin/main` antes de empezar).

**Nuevos:**
- `supabase/migrations/0043_privacidad_umbral_acceso_reportante.sql`
- `seguridad/33_rollback_0043.sql`
- `seguridad/34_resultados_privacidad_0043_staging.md` (este archivo)

**Modificados:**
- `src/lib/services/moderationService.ts` — `listReportedEvents`/`listReportsForEvent` leen `reports_moderation`; `createReport` pide columnas explícitas en vez de `select('*')`.
- `src/lib/services/channelsService.ts` — mismo patrón para `channel_reports_moderation`/`reportChannel`.
- `src/lib/supabase/database.types.ts` — añadidas las 2 vistas nuevas al bloque `Views` (generadas contra un Postgres desechable real con 0043 aplicada, no escritas a mano).
- `src/lib/components/pulso/ConcernResultsChart.svelte`, `GeneralParticipationBlock.svelte`, `SimpleGeneralParticipationBlock.svelte`, `TopicMeasureCard.svelte`, `SimpleMeasureCard.svelte`, `NextBlockVoteFlow.svelte` — mensajes de "sin respuestas" corregidos a neutros (no afirman 0 cuando puede haber una distribución suprimida).
- `src/lib/components/pulso/SanidadListeningResults.svelte` — mismo ajuste para el desglose territorial (ahora todo-o-nada).
- `src/lib/components/pulso/ProposeConcernDialog.svelte`, `ViviendaListeningFlow.svelte` — aviso de PII corregido/añadido en los campos de texto libre que no lo tenían.

---

## 2. Corrección crítica encontrada durante la implementación (no en la revisión previa)

El plan 32 v2 asumía que `community` en `concern_listening_survey_responses` (usado por `get_concern_listening_survey_territory_breakdown`) era texto libre, y por eso mantenía supresión por celda ahí en vez de supresión completa. **Es falso** — comprobado leyendo el formulario real (`SanidadListeningFlow.svelte`): `community` es un `<select>` sobre un catálogo cerrado de 20 comunidades/ciudades autónomas (`src/lib/data/regions.ts`). Con un total público exacto (`get_concern_listening_survey_total`) y un catálogo cerrado, el ataque de resta del encargo original aplica igual que en `next_block_votes`. **Corregido en 0043**: `territory_breakdown` pasa a supresión completa de la ronda (misma firma, mismo `greatest(p_min_threshold, 30)`, sin cambio de cliente). Documentado también en `SanidadListeningResults.svelte`.

## 3. Bug real encontrado y corregido durante la prueba desechable

`get_next_block_vote_results` (plpgsql): `group by option_code` dentro del bloque `if exists (...)` era ambiguo — Postgres declara implícitamente los nombres de columna de `returns table(...)` como variables plpgsql, y `option_code` coincidía con la columna de la tabla. Fallaba en tiempo de ejecución con `column reference "option_code" is ambiguous`, no en tiempo de creación (por eso no lo detectó la Security Baseline ni el clean-room, que no ejecutan las funciones, solo las crean). **Corregido**: se calificó con alias (`v.round_id`, `v.option_code`), igual que ya hacía el `return query` de la misma función. Encontrado únicamente porque el encargo exigía probar los casos 0 vs. 1-4 de verdad, no asumir que el diseño en papel funcionaba.

---

## 4. Resultado de Security Baseline P0

```
SECURITY BASELINE P0 — PASS
```
Ejecutada dos veces (antes y después de corregir el bug de §3), ambas en PASS. Incluye:
- `migrations-structure` — ok
- `cleanroom` (0001→0043, vía `supabase db diff --db-url <inalcanzable>`) — ok
- `rls-cleanroom` — ok
- `security-definer`, `using-true`, `session-architecture`, `edge-functions`, `storage` — ok
- `install`, `build` — ok (build de producción real, sin errores)
- `dependencies` — ok (mismas 4 excepciones ya registradas y vigentes hasta 2026-11-09; **ninguna excepción nueva**)
- `secrets` — ok (104 commits escaneados, sin fugas)

**Ninguna excepción nueva creada para hacer pasar esta implementación**, como exigía la instrucción.

Además, localmente: `pnpm test` (129/129), `pnpm check` (0 errores tras corregir los tipos de las 2 vistas nuevas — ver §6), `eslint`/`prettier` limpios sobre los 12 archivos tocados.

---

## 5. Pruebas funcionales en PostgreSQL desechable (real, no simulado)

Contenedor `postgres:17-alpine` con roles reales (`citizen_a`, `citizen_b`, `moderator_a`, todos en rol `authenticated`), mock de `auth.uid()`/`is_moderator_or_admin()` vía GUC de sesión, y las 13 tablas reales con su estado pre-0043 exacto. **Los archivos `0043` y `33_rollback_0043.sql` se aplicaron verbatim** (no reescritos a mano para la prueba).

| # | Prueba | Resultado |
|---|---|---|
| 1 | `get_concern_results`: concern con una categoría en 3 (1-4) y otra en 6 | **0 filas** — supresión completa correcta |
| 2 | `get_concern_results`: concern con categorías en 5 y 7 | **2 filas completas** — correcto |
| 3 | `get_priority_results`: medida con 3 respuestas y medida con 6 | Solo la de 6 aparece — **supresión por fila, no arrastra a la otra** — correcto |
| 4 | `next_block_votes`, caso **0**: 4 opciones a 10, 1 opción **ausente (0)** | **4 filas mostradas** — el 0 no bloquea, tal como exige la aclaración A del encargo |
| 5 | `next_block_votes`, caso **1-4**: 4 opciones a 10, 1 opción con **3 votos** | **0 filas** — bloqueo completo correcto; `get_next_block_vote_total` sigue dando el real (43) |
| 6 | `territory_breakdown`: 2 comunidades ≥30, 1 con 5 (<30) | **0 filas** — confirma la corrección de §2 |
| 7 | `territory_breakdown`: intento de manipulación `p_min_threshold=1` sobre el caso anterior | **Sigue en 0 filas** — `greatest()` no cede |
| 8 | `territory_breakdown`: 2 comunidades, ambas ≥30 | **2 filas completas** |
| 9 | RLS: `moderator_a` sobre `concern_responses` de `citizen_a` | **0 filas** — bypass de staff retirado, confirmado |
| 10 | `moderator_a`: `select *` directo sobre tabla base `reports` | **`permission denied for table reports`** — fallo seguro, confirmado |
| 11 | `moderator_a` vía `reports_moderation`: `select *` | **7 columnas seguras**, ambos reportes visibles |
| 12 | `moderator_a` vía `reports_moderation`: pedir `reported_by_user_id` explícitamente | **`column "reported_by_user_id" does not exist`** — estructural, no solo denegado |
| 13 | `citizen_a` vía `reports_moderation` | **Solo su propio reporte** — RLS se sigue aplicando a través de la vista |
| 14 | `concern_proposals`: `moderator_a` tras 0043 | **Sigue viendo la propuesta** — excepción intacta |
| 15 | Rollback (`seguridad/33_rollback_0043.sql`) aplicado verbatim tras 0043 | **Se aplica sin error** |
| 16 | Tras rollback: `moderator_a` sobre `concern_responses` de `citizen_a` | **Bypass restaurado** — vuelve a ver la fila |
| 17 | Tras rollback: `select *` sobre `reports` para `moderator_a` | **Funciona de nuevo**, incluida `reported_by_user_id` |
| 18 | Tras rollback: existencia de las 2 vistas | **Ninguna existe** — `to_regclass` devuelve `NULL` en ambas |

18 pruebas dirigidas, todas con el resultado esperado. Contenedor eliminado al terminar (`docker rm -f`), sin rastro.

**Lo que esto NO sustituye:** las 17 pruebas del plan 32 con sesiones reales de `supabase-js` contra el proyecto de staging real, y los smoke tests de las páginas públicas — esas siguen pendientes, bloqueadas por el hallazgo de §7.

---

## 6. Tipos TypeScript de las vistas nuevas

`database.types.ts` no tenía forma de conocer `reports_moderation`/`channel_reports_moderation` (no existen todavía en ningún Supabase real). Se generaron con `supabase gen types typescript --db-url` contra el mismo contenedor desechable de §5 (no escritos a mano) y se insertaron en el bloque `Views` con el mismo estilo que el resto del archivo. Confirmado: Supabase tipa **todas** las columnas de una vista como `| null`, con independencia de que la tabla base tenga `NOT NULL` — es una limitación conocida del generador para vistas, no un reflejo real (documentado con un comentario en el código, en `moderationService.ts`/`channelsService.ts`, donde se maneja con `?? valor-por-defecto` en el borde de mapeo).

---

## 7. Reconciliación de tracking de `0042` en staging (previa, ya resuelta)

Antes de aplicar 0043 se detectó que `convoca-staging` no tenía `0042` registrada en `schema_migrations`, aunque su contenido ya estaba materialmente aplicado (mismo patrón que producción, documentado en `25_pre_b_produccion_resultados.md`/`28_plan_saneamiento_0040_0041.md`). Verificado con 4 señales independientes de solo lectura antes de actuar: conteo de `schema_migrations` (41 filas, máx. `0041`), ACL de 4 funciones representativas (`public` revocado, `anon`/`authenticated` concedidos — patrón H-02 de 0042), `search_path` pineado en las 2 funciones que 0042 reemplaza, y el cuerpo completo de `set_concern_listening_detail` con la validación H-02 literal.

Reconciliado con una única versión explícita, nunca `repairAll`:
```
supabase migration repair --status applied 0042 --db-url <staging>
→ {"versions":["0042"],"status":"applied","repairAll":false}
```
Post-check: `migration list` → `0001`…`0042` con `local == remote`; `0043` pendiente. `db push --dry-run` → exclusivamente `0043_privacidad_umbral_acceso_reportante.sql`. **Ningún SQL de `0042` se re-ejecutó** — `migration repair` solo escribe en la tabla de control, nunca aplica el contenido de la migración.

---

## 8. Aplicación real de 0043 a staging

```
supabase db push --db-url <staging>   (sin --dry-run, una sola migración pendiente)
→ Applying migration 0043_privacidad_umbral_acceso_reportante.sql...
→ exit code 0
```

**Post-check — `migration list`:** las 43 migraciones (`0001`…`0043`) con `local == remote`. **Post-check — `db push --dry-run`:** `{"upToDate":true,"migrations":[]}` — ninguna pendiente.

---

## 9. Verificación de definiciones/ACL/policies en staging (solo lectura, tras aplicar)

- **10/10 funciones** presentes, `security_definer=true`, `search_path=public` pineado en las 10.
- **11/11 policies** de participación renombradas a `*_select_own`, `using (user_id = auth.uid())` — sin bypass de staff. Confirmado además que las 11 `*_select_own_or_staff` originales **ya no existen** (0 filas).
- **`concern_proposals`**: conserva `concern_proposals_select_own_or_staff`, `using ((proposer_user_id = auth.uid()) OR is_moderator_or_admin())` — excepción intacta, sin tocar.
- **`reports_moderation`**: existe, `relkind='v'`, `reloptions={security_invoker=true}`, definición expone exactamente `id, event_id, reason, details, status, created_at, resolved_at` (7 columnas, sin `reported_by_user_id`).
- **`channel_reports_moderation`**: mismo patrón, `id, channel_id, reason, details, status, created_at, resolved_at`.
- **Grants por columna**: `authenticated` tiene `SELECT` únicamente sobre las 7 columnas seguras de `reports`/`channel_reports` (confirmado vía `information_schema.column_privileges`) — `reported_by_user_id` no tiene `SELECT` concedido (solo `INSERT`/`UPDATE`/`REFERENCES`, necesarios para poder reportar). **No existe ningún `GRANT SELECT` de tabla completa** sobre ninguna de las dos tablas.

---

## 10. Pruebas con sesiones JWT reales contra staging (24 pruebas, no simuladas con postgres)

Script Node.js con `@supabase/supabase-js` real, contra la URL/anon key/service_role key reales de `convoca-staging` (`.env.staging.secrets`). Fixtures propios creados vía `service_role` (18 usuarios de identidad/pool + 44 usuarios adicionales para umbrales de `next_block_votes`/`territory_breakdown` = 151 usuarios reales de `auth.users`, todos con email bajo un dominio de prueba etiquetado con timestamp) y **sesiones reales obtenidas con `signInWithPassword`** para `citizen_a`, `citizen_b` y un `moderator` (rol asignado en `profiles.role` vía `service_role`). Todas las consultas de prueba se hicieron vía el cliente `supabase-js` (autenticado o `anon`), es decir, a través de la API PostgREST real, no por impersonación de rol en `psql`.

| # | Prueba | Resultado |
|---|---|---|
| 1 | `citizen_a` lee `concern_responses` (API) | Solo su propia fila (1) |
| 2 | `citizen_b` lee la fila de `citizen_a` en `concern_responses` | 0 filas |
| 3 | `moderator` lee la fila de `citizen_a` en `concern_responses` | 0 filas — bypass de staff retirado, confirmado vía API real |
| 4 | `moderator` lee `concern_proposals` | Sin error de permiso — excepción intacta |
| 5 | `citizen_a` vía `reports_moderation` | 1 fila (su propio reporte) |
| 6 | `citizen_a` vía `reports_moderation`, id del reporte de `citizen_b` | 0 filas |
| 7 | `moderator` vía `reports_moderation` | 2 filas (ambos reportes de prueba), columnas seguras |
| 8 | `moderator` pide `reported_by_user_id` a `reports_moderation` | Error: columna no existe |
| 9 | `moderator`: `select *` directo sobre `reports` (tabla base) | Error: `permission denied for table reports` |
| 10 | `moderator` vía `channel_reports_moderation` | 1 fila (reporte de canal de prueba) |
| 11 | `moderator` pide `reported_by_user_id` a `channel_reports_moderation` | Error: columna no existe |
| 12 | `get_concern_results` en un concern con niveles 3 y 5 (1-4 presente) | 0 filas — supresión completa |
| 13 | `get_concern_results` en un concern con nivel a 5 (todas ≥5) | 1 fila, `response_count=5` |
| 14 | `get_priority_results`, medida con 6 (≥5) | 1 fila, `times_top3=6` |
| 15 | `get_next_block_vote_results`, ronda **abierta** | Rechazada (gate temporal intacto) |
| 16 | `get_next_block_vote_results`, ronda cerrada, 4 opciones a 5 + 1 opción **ausente (0)** | 4 filas — el 0 no bloquea |
| 17 | `get_next_block_vote_results`, ronda cerrada, 4 opciones a 5 + 1 opción con **3 votos** (1-4) | 0 filas — bloqueo completo |
| 18 | `get_next_block_vote_total` sobre la ronda anterior | 23 (total real, sin cambio, pese al desglose suprimido) |
| 19 | `territory_breakdown`: 1 comunidad a 30 (≥30) + 1 a 29 (<30) | 0 filas — supresión completa (confirma la corrección de §2) |
| 20 | `territory_breakdown`: intento de manipulación `p_min_threshold=1` sobre el caso anterior | Sigue en 0 filas |
| 21 | `territory_breakdown`: 1 comunidad a 30 (única, ≥30) | 1 fila, `response_count=30` |
| 22 | `moderator` lee `verification_documents` | Sin error de permiso — sin regresión |
| 23 | `moderator` modera (oculta) el evento de prueba | Éxito — moderación real no rota |

**24/24 pruebas PASS** (incluida la confirmación inicial de sesiones JWT reales obtenidas). Cubren las 17 pruebas del plan 32 más las 2 de conteo 0 del encargo anterior, ampliadas con las verificaciones adicionales de este encargo.

---

## 11. UI y smoke tests públicos (contra el backend de staging real)

Servidor `vite dev` local arrancado con las credenciales reales de `convoca-staging` (`PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_PUBLISHABLE_KEY` de `.env.staging.secrets`, pasadas por variable de entorno de proceso, nunca escritas a `.env`), sin fixtures de prueba activos (ya limpiados — ver §12), lo que ejercita exactamente el camino de "distribución suprimida/sin datos" en las páginas reales:

| Ruta | HTTP |
|---|---|
| `/` | 200 |
| `/pulso/soluciones/vivienda-plan-vivienda-2036` (solución real de staging) | 200 |
| `/pulso/proximo-bloque` | 200 |
| `/pulso/escucha/sanidad` | 200 |

Sin errores/excepciones en el log del servidor durante el renderizado de las 4 rutas. Confirma que los componentes modificados (`ConcernResultsChart.svelte`, `GeneralParticipationBlock.svelte`, `NextBlockVoteFlow.svelte`, `SanidadListeningResults.svelte`, etc.) no rompen cuando el RPC devuelve cero filas — muestran el mensaje neutro ("Aún no hay datos suficientes...") en vez de fallar o afirmar "0 respuestas". Servidor detenido al finalizar; verificado que el puerto queda libre.

No se hizo verificación visual pixel a pixel (sin Playwright, por preferencia ya establecida) — la confirmación es de disponibilidad (HTTP 200, sin excepción de servidor) más la revisión de código ya hecha del manejo de arrays vacíos.

---

## 12. Limpieza de staging — verificada por conteo

Tras el script de pruebas (que limpia en `finally`, incluso si algo falla):

| Verificación | Resultado |
|---|---|
| Usuarios de prueba restantes (`email like 'test0043_%'`) | **0** |
| Filas restantes en `events`/`organizers`/`event_communication_channels`/`participation_rounds`/`concern_listening_rounds`/`next_block_vote_rounds`/`reports`/`channel_reports` etiquetadas de prueba | **0 en las 8 tablas** |
| Contenido real de staging (concerns publicados) | Sin alteración — 8 concerns publicados antes y después, ninguno tocado (solo se referenciaron sus IDs desde filas de fixture propias, ya eliminadas) |

Ningún dato real de staging fue eliminado ni modificado.

---

## 13. Rollback

`seguridad/33_rollback_0043.sql` — validado sintáctica y funcionalmente en el PostgreSQL desechable de §5 antes de aplicar a staging. 25 objetos: 10 funciones + 11 policies + 2 grants de tabla + 2 `drop view`. No se ha ejecutado el rollback contra staging (no fue necesario — 0043 se aplicó sin errores).

## 14. Limitaciones residuales (sin cambios respecto al plan 32 v2)

La inferencia por diferencia temporal (comparar el mismo agregado antes/después de un evento conocido) sigue sin mitigarse por este parche, salvo donde ya existía protección temporal (`next_block_votes`, gate de `status='closed'`). `service_role`/acceso directo a Postgres quedan fuera de toda garantía de este parche, como ya se documentó. No se afirma anonimato absoluto en ningún punto de este informe. No se ha tocado producción, no se ha hecho merge, no se ha modificado `0042`.
