# 46 — Preflight de producción para 0044 (solo lectura / preparación)

**Estado: SOLO VERIFICACIÓN Y PREPARACIÓN. `0044` NO se ha aplicado a producción. `delete-account` NO se ha desplegado. Ningún cambio de código en esta fase.** Continúa `seguridad/41`–`45`. `main` en `daf8644`, PR #16 ya mergeado, Security Baseline P0 del push de merge en `success`.

---

## 0. Estado de `main`

- Rama `main`, `main == origin/main` (`daf8644`), working tree limpio (sin cambios sobre archivos trackeados).
- `daf8644` = squash merge de PR #16, un único padre (`b486686`), diff verificado: exactamente los 9 archivos esperados, cero archivos de `src/`.
- Security Baseline P0 del push de ese commit a `main`: **success**, 8/8 jobs requeridos en `pass` (`secrets-full-history` no corre en push, comportamiento normal).
- `0044_post_review_abuse_and_visibility_hardening.sql` presente en `supabase/migrations/`.

---

## 1. Acceso a producción

**Disponible, de solo lectura/gestión de migraciones, vía la sesión ya autenticada de la CLI de Supabase** (`supabase --linked`, contra el proyecto real enlazado). El mecanismo: la CLI, autenticada con un token de cuenta ya presente en esta sesión, aprovisiona un "login role" temporal a través de la Management API (`Initialising login role...`) — no requiere ni ha requerido en ningún momento la contraseña directa de la base de datos de producción, que sigue sin estar disponible en este entorno. Es el mismo mecanismo de acceso de solo-consulta que ya se usó en `seguridad/25_pre_b_produccion_resultados.md`.

No se ha creado, solicitado ni obtenido ninguna credencial nueva — se usó exclusivamente la sesión ya disponible, tal como se pidió. Todas las operaciones de esta fase contra producción fueron `SELECT` de solo lectura, `migration list`, `db push --dry-run` (sin aplicar) y `db dump` (schema-only, sin datos). **Ninguna escritura.**

---

## 2. Estado de migraciones en producción

```
supabase migration list --linked
→ 44 filas: 0001…0043 con local == remote; 0044 con remote = "" (pendiente)

supabase db push --linked --dry-run
→ Would push these migrations:
   • 0044_post_review_abuse_and_visibility_hardening.sql
→ {"upToDate":false,"dryRun":true,"migrations":["0044_post_review_abuse_and_visibility_hardening.sql"], ...}
```

**`0044` es la única migración pendiente. Sin huecos, sin divergencia de tracking, sin ninguna migración inesperada.** Local: `0001→0044`. Producción: `0001→0043`. Exactamente el resultado esperado.

---

## 3. Precheck histórico `p_community` en producción

Consulta read-only ejecutada contra producción (mismo texto que `seguridad/44` §4, ya usado sin ejecutar contra prod hasta ahora):

```
public.concern_listening_survey_responses → 3 filas en total
  VALID:    3
  NULL:     0
  INVALID:  0
```

**`INVALID = 0` → PASS.** No hay ningún valor a clasificar en detalle (no hay `round_id` afectados, no hay ninguna comunidad inventada, y por tanto no hay ningún desglose territorial en riesgo de supresión por esta causa). No se necesita ninguna decisión de saneamiento histórico — `0044` puede aplicarse sin ningún paso previo sobre estos datos.

---

## 4. Estado PRE-0044 de los objetos afectados (producción)

Confirmado por consulta directa a catálogos del sistema:

| Objeto | Estado actual (PRE-0044) |
|---|---|
| `public.write_rate_limits` | **No existe** (`to_regclass` → `NULL`) |
| Trigger `enforce_reports_rate_limit` | **No existe** |
| Trigger `enforce_channel_reports_rate_limit` | **No existe** |
| Trigger `enforce_concern_proposals_rate_limit` | **No existe** |
| Función `enforce_write_rate_limit` | **No existe** |
| Función `purge_old_write_rate_limits` | **No existe** |
| Cron `purge-old-write-rate-limits` | **No existe** |
| `get_attendance_counts` | Versión anterior (sin filtro de estado — confirmado: no contiene `status not in`) |
| `set_concern_listening_survey_response` | Versión anterior (solo `char_length(p_community) <= 120` — confirmado: no contiene el catálogo de 19) |
| `reports` / `channel_reports` / `concern_proposals` | Existen, RLS activo en las 3, sin ningún trigger de `0044` todavía |

**Comparación token a token (insensible a mayúsculas/espacios) entre el cuerpo real de `set_concern_listening_survey_response` en producción y el cuerpo que `seguridad/43_rollback_0044_candidata.sql` espera restaurar: idénticos.** Mismo resultado visual para `get_attendance_counts`. El estado PRE-0044 de producción coincide exactamente con lo esperado — sin ninguna deriva respecto al código versionado.

---

## 5. Backup PRE-0044 (schema-only)

```
Ruta: fuera del repositorio, en el directorio de backups del usuario (permisos 700 en el directorio, 600 en el archivo)
Comando: supabase db dump --linked --schema public -f <ruta>
```

| Verificación | Resultado |
|---|---|
| Archivo no vacío | Sí — 213 014 bytes |
| Líneas | 5199 |
| Permisos del archivo | `-rw-------` (600, solo el propietario) |
| Permisos del directorio contenedor | `700` (solo el propietario) |
| SHA-256 | `f070dfb7211d19f8f09bece6d89fe8afd65e487f678b22291b63ac186751cf42` |
| Filas de datos (`COPY`/`INSERT` con contenido) | **0** — confirmado por grep, es schema-only real, sin ningún dato ciudadano |
| Es genuinamente PRE-0044 | Sí — no contiene ninguna mención de `write_rate_limits` ni `enforce_write_rate_limit` |

Ruta documentada de forma sanitizada a propósito (sin el nombre de host ni referencia del proyecto real) — el propietario de la sesión tiene la ruta completa disponible en el historial de comandos de esta fase.

---

## 6. Rollback — revalidación contra el estado REAL PRE-0044 de producción

**No ejecutado.** Revalidado en su lugar, contra los datos reales capturados en §4:

- Los 7 objetos que el rollback (`seguridad/43_rollback_0044_candidata.sql`) borraría/revertiría **no existen todavía** en producción — aplicarlo ahora mismo sería un no-op seguro (nada que revertir), consistente con que `0044` todavía no se ha aplicado.
- Las 2 funciones que el rollback reemplaza (`get_attendance_counts`, `set_concern_listening_survey_response`) tienen en producción, ahora mismo, **exactamente** el texto que el rollback está preparado para restaurar — confirmado por comparación de definición completa, no solo por firma.
- Ninguna definición PRE de producción difiere de lo que el rollback espera.

**Sin motivo de NO-GO en este punto.**

---

## 7. SQL de 0044 — comparación final

`supabase/migrations/0044_post_review_abuse_and_visibility_hardening.sql` en `main` (`daf8644`) — SHA-256 `3d3bf9cf...58cb7858a2` — es el mismo archivo, sin ninguna modificación, que se aplicó y validó en staging (`seguridad/45`). Checklist técnico completo re-verificado directamente sobre el archivo en `main`, cada patrón exactamente una vez:

advisory lock · RLS de `write_rate_limits` · `REVOKE ALL` · catálogo de 19 para `community` · normalización previa a la validación · filtro de `get_attendance_counts` · límites (`reports`/`channel_reports` 3+15, `concern_proposals` 1+5) · 3 triggers · `revoke execute` de las funciones internas · `cron.schedule`.

**Misma lógica exacta que la validada en staging. Nada ha cambiado entre la validación de staging y este preflight de producción.**

---

## 8. Impacto / compatibilidad

**A (app actual + DB 0043) → B (app actual + DB 0044): compatible de inmediato, sin ventana incompatible.**

- `get_attendance_counts` y `set_concern_listening_survey_response` mantienen exactamente la misma firma (mismos parámetros, mismos tipos, mismo valor de retorno) — `CREATE OR REPLACE` no rompe ningún contrato existente.
- El frontend ya envía siempre un valor exacto del catálogo cerrado de 19 comunidades (selector `<select>` sobre `src/lib/data/regions.ts`, confirmado en el propio código) — la nueva validación de `p_community` nunca puede rechazar una llamada legítima del frontend actual.
- El frontend nunca pide asistencia de un evento no público por su propia navegación — el nuevo filtro de `get_attendance_counts` es transparente para el uso legítimo.
- Los 3 puntos de inserción (`moderationService.ts`, `channelsService.ts`, `concernsService.ts`) ya hacen `if (error) throw error` de forma genérica — el único camino de error nuevo (límite de frecuencia superado) se propaga sin necesitar ningún cambio de código.
- **Confirmado por diff del propio commit de squash (`daf8644` contra su único padre): 0044 no toca ningún archivo de `src/`.** A diferencia de `0043` (que sí exigió un despliegue de frontend coordinado porque renombraba vistas que el código consultaba explícitamente), `0044` no requiere ningún deploy web — el frontend ya desplegado hoy contra `0043` sigue funcionando sin cambios contra `0044`.
- El cambio de `delete-account` es completamente independiente: vive en una Edge Function separada, no lo toca ni lo referencia ninguna sentencia de `0044`, y puede desplegarse en cualquier momento con independencia del estado de la migración de base de datos.

**No se ha encontrado ninguna incompatibilidad.**

---

## 9. `delete-account` — preparado, no desplegado

Confirmado por diff del commit de squash: **solo** cambia el comentario de cabecera (documenta las 3 FK `RESTRICT` reales) y el texto del mensaje de error devuelto al cliente. `deleteUser`, la comprobación de autenticación, el uso de `service_role`, y el flujo completo — **sin cambios**, verificado línea a línea. No hay CORS explícito en este archivo (Edge Function invocada solo desde el propio origen autenticado) y no se ha añadido ninguno.

**Procedimiento oficial para desplegarlo cuando se autorice** (no ejecutado en esta fase):

```
supabase functions deploy delete-account --project-ref <producción>
```

Sin flags adicionales — misma función, mismo `verify_jwt: true` ya fijado en el proyecto, sin cambios de configuración. Paso independiente del `db push` de `0044`, puede ir antes, después o el mismo día.

---

## 10. Plan exacto de promoción (NO ejecutado en esta fase)

| Paso | Contenido |
|---|---|
| **T1 — precheck final** | Repetir `migration list --linked` + `db push --linked --dry-run` inmediatamente antes de aplicar, por si algo cambió desde este preflight. Repetir el precheck de `p_community` si ha pasado mucho tiempo. |
| **T2 — aplicar SOLO 0044** | `supabase db push --linked` (sin `--dry-run`), un único `db push`, ninguna otra acción en el mismo paso. |
| **T3 — gates estructurales post-DB** | Ver §11 — todos read-only, sin fixtures. |
| **T4 — smoke funcional mínimo** | Confirmar `get_attendance_counts()` sin argumentos no enumera eventos no públicos reales (consulta agregada, sin crear datos); confirmar que las páginas públicas críticas siguen en 200. |
| **T5 — concurrencia mínima controlada** | Una sola comprobación ligera (no una batería completa como en staging): confirmar que el trigger existe y está `ENABLED`, y opcionalmente una prueba de 2-3 inserts reales con una cuenta de prueba propia si se autoriza crear una, nunca más que eso en producción. |
| **T6 — observabilidad** | Ver §12 — ventana corta de vigilancia activa tras T2. |
| **T7 — desplegar delete-account** | `supabase functions deploy delete-account --project-ref <producción>`, paso independiente, puede reordenarse. |
| **T8 — smoke delete-account** | Invocar la función con un JWT inválido/ausente (debe devolver 401) y, si se autoriza, con una cuenta de prueba propia creada y borrada en el mismo smoke — **nunca con una cuenta real**. |
| **T9 — cierre** | Confirmar `migration list` en 44/44, Security Baseline en verde, documentar resultado en un informe de promoción real (`seguridad/47` o siguiente número libre). |

---

## 11. Gates post-0044 (a ejecutar en T3, inmediatamente tras aplicar)

Todos read-only o estructurales — sin fixtures salvo lo mínimo imprescindible marcado:

1. `migration list --linked` → 44/44, `local == remote`.
2. `db push --linked --dry-run` → vacío (`upToDate: true`).
3. `to_regclass('public.write_rate_limits')` → no nulo.
4. `write_rate_limits`: RLS activo, 0 policies propias, ACL sin `PUBLIC`/`anon`/`authenticated`.
5. 3 triggers (`enforce_reports_rate_limit`, `enforce_channel_reports_rate_limit`, `enforce_concern_proposals_rate_limit`) presentes y `ENABLED`.
6. `enforce_write_rate_limit`: `pg_get_functiondef` contiene `pg_advisory_xact_lock`.
7. `EXECUTE` de `enforce_write_rate_limit`/`purge_old_write_rate_limits`: solo `postgres`/`service_role`, nunca `anon`/`authenticated`.
8. `cron.job` contiene `purge-old-write-rate-limits`, activo.
9. `get_attendance_counts()` sin argumentos, ejecutado como `anon` vía la API pública real: **0 eventos no públicos** en el resultado (verificación agregada sobre datos reales existentes, sin crear ningún fixture).
10. `get_attendance_counts` con IDs explícitos de eventos no públicos reales (obtenidos por un rol con privilegios, nunca expuestos): 0 filas.
11. `set_concern_listening_survey_response` con un valor de `p_community` inventado, usando una cuenta de prueba propia creada y limpiada en el mismo paso (único punto de este gate que crea un fixture, mínimo e imprescindible): rechazado.
12. Rate limit básico: 4 intentos rápidos de una acción con la misma cuenta de prueba → el 4º rechazado con el mensaje neutral esperado.
13. Concurrencia mínima: 2-3 inserts simultáneos con la misma cuenta de prueba → comportamiento coherente con el límite (no es necesario repetir la batería completa de 10×3 rondas ya hecha en staging).
14. Páginas públicas críticas (`/`, una solución publicada, `/pulso/proximo-bloque`) → 200, sin excepción de servidor.

Preferencia explícita por verificaciones estructurales/agregadas sobre datos reales antes que por crear fixtures nuevos — los puntos 11-13 son los únicos que requieren una cuenta de prueba, y esa cuenta se limpia en el mismo paso.

---

## 12. Observabilidad (ventana corta, no una guardia prolongada)

Mirar durante los minutos inmediatamente posteriores a T2 (aplicar 0044) y, por separado, tras T7 (desplegar `delete-account`):

- **Errores PostgREST/DB**: tasa de errores 4xx/5xx en las rutas que llaman a `get_attendance_counts`, `set_concern_listening_survey_response`, y a los 3 inserts con rate limit — un salto brusco frente a la línea base indica regresión, no ruido.
- **Errores 5xx generales del sitio**: cualquier aumento inmediato tras T2 apunta a la migración, no a otra causa, por la proximidad temporal.
- **Errores de rate limiting esperados vs. inesperados**: se espera ver *algunos* rechazos por límite si hay tráfico real de reportes/propuestas — lo que NO se espera es un volumen alto e inmediato (indicaría que el límite es más agresivo de lo pensado) ni CERO rechazos nunca (no sería una señal de fallo, pero conviene registrarlo).
- **Latencia** de las 2 funciones modificadas y de los 3 inserts — el `pg_advisory_xact_lock` añade una espera real bajo concurrencia legítima alta; vigilar que no aparezca una cola perceptible.
- **Logs de la Edge Function `delete-account`** — solo tras T7, cuando se despliegue.

Suficiente con una ventana corta (el tiempo de observar unos minutos de tráfico real tras cada paso) para detectar una regresión inmediata — no se necesita una ventana de vigilancia prolongada para un cambio de este alcance.

---

## 13. `set_attendance` (0014) — anotado, no tocado

`set_attendance` comparte el mismo patrón `INSERT → COUNT` sin ningún tipo de lock que tenía `enforce_write_rate_limit` antes de la corrección de `0044-R2` — mismo riesgo de carrera en teoría. **No confirmado empíricamente** (no se ha probado con concurrencia real, a diferencia de lo que sí se hizo para `enforce_write_rate_limit`). **No forma parte de `0044`** y **no debe bloquear esta promoción** — es un hallazgo colateral, no un defecto de esta migración. Queda como backlog explícito para una revisión futura independiente (candidato a convertirse en su propio issue/ticket si el proyecto usa uno).

---

## Resumen ejecutivo

| Punto | Resultado |
|---|---|
| Migraciones en producción | 44 locales, 43 en remoto, `0044` única pendiente |
| `db push --linked --dry-run` | Exclusivamente `0044` |
| Precheck `p_community` en producción | 3 VALID / 0 NULL / 0 INVALID |
| Estado PRE-0044 de los objetos | Coincide exactamente con lo esperado, verificado token a token |
| Backup schema-only | Creado, verificado, 0 filas de datos, permisos restrictivos |
| Rollback | Revalidado contra el estado real, sin discrepancias |
| SQL de 0044 | Idéntico al validado en staging |
| Compatibilidad | Sin ventana incompatible, sin deploy web necesario |
| `delete-account` | Preparado, no desplegado, cambio mínimo confirmado |
| Riesgo residual principal | `set_attendance` — anotado, fuera de alcance |

No se ha aplicado `0044` a producción. No se ha desplegado `delete-account`. No se ha tocado Vercel. No se ha modificado ningún código en esta fase.

# 0044 — PREFLIGHT PRODUCCIÓN PASS, LISTO PARA PROMOCIÓN
