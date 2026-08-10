# 37 — Resultados reales de la promoción de 0043 a producción

**Estado: 0043 APLICADA A PRODUCCIÓN. Deployment nuevo PROMOVIDO a `convoca.cloud`. Sin rollback — no hubo regresión material.** Este documento registra la ejecución real (comandos, horas exactas, exit codes), no un plan. El plan y el diseño del runbook siguen en `seguridad/36_plan_promocion_privacidad_0043.md`.

---

## T1 — Último gate DB (antes de escribir)

Todo reconfirmado inmediatamente antes de T2, sin modificar nada:
- `migration list --linked`: `0001`…`0042` local==remote (42/42), `0043` pendiente (único).
- `db push --linked --dry-run`: exclusivamente `0043_privacidad_umbral_acceso_reportante.sql`.
- `reports_moderation` / `channel_reports_moderation`: HTTP 404 (ausentes, PRE-0043).
- `get_concern_listening_survey_territory_breakdown` con `p_min_threshold=1`: seguía devolviendo celdas por debajo de 30 (comportamiento manipulable, PRE-0043).
- HEAD de `main`: `681fa554774cf33eadd3fe752d07f09e53d65a4b`, sin cambios desde `seguridad/36`.
- Deployment preparado `<deployment-id>`: seguía `Ready`.
- Deployment activo anterior `<deployment-id>`: confirmado, sigue siendo el candidato de rollback.
- Backup PRE-0043 (`seguridad/36 §3`): hash re-verificado, íntegro.

**T1 — PASS.**

---

## T2 — Aplicación de 0043

```
$ supabase db push --linked
T2_START: 2026-08-10T10:46:32Z
Applying migration 0043_privacidad_umbral_acceso_reportante.sql...
{"upToDate":false,"dryRun":false,"migrations":["0043_privacidad_umbral_acceso_reportante.sql"],...}
EXIT_CODE=0
T2_END: 2026-08-10T10:46:40Z
```

**Duración: 8 segundos. Una sola ejecución. Sin warnings, sin errores. Ninguna otra migración tocada.**

---

## T3 — Gate post-DB inmediato

```
T3_START: 2026-08-10T10:46:51Z
```

| Gate | Resultado |
|---|---|
| A. `migration list`: 43/43 local==remote | **PASS** |
| B. `db push --dry-run`: vacío (`upToDate: true`) | **PASS** |
| C. 10 funciones presentes con lógica de supresión nueva | **PASS** (29 bloques `not exists`, 2 `greatest(...,30)` en el dump real post-aplicación) |
| D. 11 policies `_select_own` (bypass de staff retirado) | **PASS** (11/11 nuevas presentes, 0/11 antiguas `_or_staff` restantes) |
| E. `concern_proposals` conserva su excepción | **PASS** (política `_select_own_or_staff` intacta, sin tocar) |
| F. `reports_moderation`: `security_invoker=true`, sin `reported_by_user_id` | **PASS** |
| G. `channel_reports_moderation`: equivalente | **PASS** |
| H. ACL de `reports`/`channel_reports`: grant por columna (7 columnas, sin `reported_by_user_id`), sin `GRANT` de tabla completa restante | **PASS** |
| I. H-02 (validación de catálogo cerrado) intacto | **PASS** (`v_valid_vivienda_codes` presente, 4 apariciones, sin cambio) |
| J. RLS habilitada en las 12 tablas de participación + `reports` + `channel_reports` | **PASS** (14/14) |

Verificación hecha contra un **dump de esquema real tomado inmediatamente después de T2** (`schema_only_POST0043_20260810_124709.sql`, 213 586 bytes, SHA-256 `f3827aa88ee58f28c087bed00ea7b084f6e31fc6693f67168a8dd8ec633eec5f`, 0 filas de datos, permisos `600`) — no contra staging, no contra el SQL fuente.

```
T3_END: 2026-08-10T10:49:54Z
```

**T3 — PASS en los 10 gates. Autoriza T4.**

---

## T4 — Promoción del deployment ya preparado

```
$ vercel promote <deployment-id> --yes
T4_START: 2026-08-10T10:50:11Z
Success! convoca was promoted to <url-deployment>.vercel.app (<deployment-id>)
EXIT_CODE=0
T4_END: 2026-08-10T10:50:16Z
```

**Sin build nuevo** — se promovió exactamente el deployment construido y verificado en la fase de preparación (`seguridad/36 §6-8`), desde el HEAD `681fa55...` ya aprobado.

**Confirmado tras la promoción:** `vercel inspect convoca.cloud` resuelve a `id: <deployment-id>` — el dominio real apunta exactamente al deployment nuevo.

**Duración T2→T4 (de la escritura en DB a la promoción de la app completada): 3 minutos 44 segundos** (`10:46:32Z` → `10:50:16Z`). Más larga que la estimación de "decenas de segundos" de `seguridad/36 §9` porque T3 se hizo con la máxima rigurosidad posible (dump completo de esquema + 10 comprobaciones automatizadas), no con el mínimo estructural — decisión deliberada dado lo que estaba en juego, no un imprevisto. La ventana de incompatibilidad real (DB nueva + app todavía antigua, ESTADO C de la matriz) duró esos ~3m44s.

---

## T5 — Smoke combinado (DB nueva + app nueva, sobre `convoca.cloud` real)

| Ruta / comprobación | Resultado |
|---|---|
| `/` | HTTP 200 |
| `/pulso/soluciones/vivienda-plan-vivienda-2036` (solución real) | HTTP 200 |
| `/pulso/proximo-bloque` | HTTP 200 |
| `/pulso/escucha/sanidad` | HTTP 200 |
| `/og/convocatorias/castellon-a7bc01aa` (evento real publicado) | HTTP 200 (el primer intento con un slug inventado dio 404 — error de la prueba, no del sistema; corregido con un slug real) |
| `reports_moderation` vía REST | HTTP 200, `[]` (RLS aplicada correctamente a `anon`, sin error de mecanismo) |
| `channel_reports_moderation` vía REST | HTTP 200, `[]`, mismo patrón |
| Pedir `reported_by_user_id` a `reports_moderation` | HTTP 400, `column reports_moderation.reported_by_user_id does not exist` — garantía estructural viva en producción |

Sin nuevos `5xx`. No se creó ninguna convocatoria, reporte, respuesta de participación ni cuenta de prueba en producción.

---

## §6 del encargo — pruebas de privacidad mínimas en producción (no destructivas)

- **Suelo territorial 30 activo:** confirmado en vivo — la misma ronda que antes de T2 devolvía celdas manipuladas con `p_min_threshold=1` (comunidades con 1 respuesta cada una, visibles) ahora devuelve `[]` con el mismo parámetro. El intento de manipulación ya no funciona.
- **1–4 no se publica:** confirmado por el mismo resultado anterior (supresión completa de la ronda, no solo de la celda afectada).
- **Caso 0 conserva semántica:** no se ha sembrado ningún dato nuevo en producción para probar este caso específico de forma aislada (habría requerido escribir datos reales); la lógica es la misma verificada exhaustivamente en staging (24/24 JWT reales) y en PostgreSQL desechable con el archivo real — no repetida aquí por diseño (§6 del encargo lo pide explícitamente: no fixtures en producción).
- **`next_block` mantiene gate temporal:** función respondiendo con normalidad (`get_next_block_vote_total` sobre un `round_id` de prueba inexistente devuelve `0`, sin error) — comportamiento esperado, sin alteración de datos reales.
- **Vistas seguras existen:** confirmado (T3-F/G, T5).
- **Columnas identificativas no expuestas:** confirmado estructuralmente (T5, error `column does not exist`).

---

## Observabilidad

`vercel logs convoca.cloud` inmediatamente después del smoke: únicamente las 6 peticiones del propio smoke test, todas `info`, sin `error`/`warn`, sin `5xx`. **Advertencia explícita:** la ventana observada solo contiene tráfico generado por esta misma verificación — no hay volumen de tráfico orgánico suficiente en ese margen para extraer una conclusión estadística sobre el comportamiento con usuarios reales. Se recomienda una revisión de logs adicional, más tarde, con más tiempo transcurrido y tráfico real.

---

## Decisión de rollback

**No ejecutado. No fue necesario.** Ningún gate de T3 falló, el smoke de T5 no encontró ningún `5xx` ni regresión material, y la garantía estructural de `reported_by_user_id` se confirmó viva en producción. `seguridad/33_rollback_0043.sql` permanece disponible, sin usar, y el deployment anterior (`<deployment-id>`) sigue identificado como candidato si hiciera falta en el futuro.

---

## Snapshot POST-0043

- **Archivo:** `schema_only_POST0043_20260810_124709.sql`, fuera del repositorio (directorio temporal de esta sesión — copiar a almacenamiento persistente fuera de este entorno para conservarlo de verdad).
- **5455 líneas, 213 586 bytes, SHA-256 `f3827aa88ee58f28c087bed00ea7b084f6e31fc6693f67168a8dd8ec633eec5f`.**
- **0 filas de datos ciudadanos** (schema-only).
- **Permisos:** archivo `600`, directorio `700`.
- El snapshot PRE-0043 (`seguridad/36 §3`, hash `377202d0...`) se conserva junto a este, en el mismo directorio — ambos disponibles para comparación futura si hiciera falta.

---

## Riesgos residuales (sin cambios respecto a lo ya documentado)

- **No se garantiza anonimato absoluto.** El mecanismo es supresión de grupos pequeños, no una garantía criptográfica ni k-anonimato formal.
- **La inferencia por diferencia temporal** (comparar el mismo agregado antes/después de un evento conocido) sigue siendo un riesgo residual no mitigado por este parche, salvo donde ya existía protección temporal explícita (`next_block_votes`, gate de `status='closed'`).
- **`service_role` y el acceso directo a Postgres quedan fuera de toda garantía de este parche** — están destinados a operar con esos privilegios, no se han restringido ni se pretendía hacerlo.
- **Las pruebas exhaustivas con fixtures y sesiones JWT reales (42 casos)** se hicieron en `<proyecto-staging>`, no se han repetido en producción — la verificación en producción se limitó, por diseño, a comprobaciones no destructivas sobre datos y funciones reales ya existentes.

---

## Confirmación de alcance respetado

No se ha tocado `0044`. No se ha modificado `0043` ni `seguridad/33_rollback_0043.sql`. No se ha tocado staging en ningún momento de esta fase. No se ha modificado código ni la Security Baseline. No se continúa con Open Source Readiness, Modelo C/D, ni ninguna otra mejora — bloque cerrado aquí.
