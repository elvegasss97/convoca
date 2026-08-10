# 36 — Plan de promoción coordinada de 0043 a producción

**Estado: EJECUTADO. 0043 aplicada a producción y deployment promovido a `convoca.cloud` — ver `seguridad/37_resultados_promocion_privacidad_0043.md` para los resultados reales (horas, exit codes, gates T1-T5).** Este documento (36) es el plan/diseño, conservado tal cual se preparó y validó antes de ejecutar.

---

## 1. Estado congelado

**HEAD de `main`:** `681fa554774cf33eadd3fe752d07f09e53d65a4b` — confirmado `main == origin/main`. Sin modificaciones de código, de `0043`, de `seguridad/33_rollback_0043.sql`, ni creación de `0044`. Staging sin tocar en esta fase.

---

## 2. Preflight de producción

**A. `migration list --linked` contra producción — EJECUTADO.** `0001`…`0042` con `local == remote` (42/42, coincidencia exacta). `0043`: `local="0043", remote=""` — pendiente, único.

**B. `db push --linked --dry-run` contra producción — EJECUTADO.** Salida: `Would push these migrations: • 0043_privacidad_umbral_acceso_reportante.sql` — **exclusivamente 0043**, tal como exige el gate.

**C. Estado PRE-0043 — verificado, ahora también a nivel de esquema real (no solo comportamiento vía API pública):**
- `reports_moderation` / `channel_reports_moderation` → ausentes, confirmado por API (404) **y** por el dump de esquema real (§3): 0 coincidencias.
- `get_concern_listening_survey_territory_breakdown` con `p_min_threshold=1` → sigue devolviendo celdas por debajo de 30 (comportamiento manipulable, PRE-0043).
- **ACL/policies representativas — verificado a nivel de catálogo real** (extraído del dump de esquema, §3): 10/10 funciones con cuerpo PRE-0043 (sin la lógica de supresión de 0043), 11/11 policies con el patrón `_select_own_or_staff` (bypass de staff todavía presente, como corresponde antes de aplicar 0043), `GRANT ALL` de tabla completa sobre `reports`/`channel_reports` a `authenticated` (sin restricción de columna).
- **H-02 — confirmado presente en el dump real:** `v_valid_vivienda_codes` aparece en el cuerpo de las funciones de escritura de escucha (4 coincidencias) — `0042` está materialmente aplicada.
- **`0042` en `schema_migrations` — confirmado directamente vía `migration list` (§2A):** `local == remote` para `0042`, trackeada correctamente (a diferencia de lo que se encontró en staging en una fase anterior de este mismo proyecto — producción no tenía ese hueco de tracking).

---

## 3. Snapshots / backup PRE-0043

**EJECUTADO.** `supabase db dump --linked` (schema-only por defecto — el propio comando documenta `--schema-only omit data like migration history, pgsodium key, etc.`) contra producción.

- **Archivo:** guardado fuera del repositorio, en el directorio temporal de esta sesión (no versionado, no destinado a permanecer — para conservarlo de verdad, copiarlo a un almacenamiento fuera de este entorno antes de que la sesión termine).
- **Tamaño:** 206 889 bytes, 5244 líneas.
- **Hash (SHA-256):** `377202d049f7101fce67893d1edc5c2af5ef5d2a3a83de95f739710b15efec4e`.
- **Permisos:** archivo `600`, directorio contenedor `700` (solo el usuario propietario).
- **Sin datos ciudadanos:** confirmado — `0` líneas `INSERT INTO`/`COPY ... FROM stdin` con filas (dump exclusivamente de esquema/DDL).
- **Sin secretos incorporados:** confirmado, `0` coincidencias de patrones de contraseña/credencial dentro del propio archivo de dump.
- **Snapshot de `schema_migrations`:** capturado como parte de la salida de `migration list` de §2A (42/42 + `0043` pendiente) — es la fuente de verdad del estado de tracking en el momento exacto de esta preparación.

**Inventario PRE-0043 extraído del dump real** (no de memoria, no de staging):
- 10/10 funciones — presentes, cuerpo PRE-0043 (sin CTE de supresión de 0043).
- 11/11 policies `_select_own_or_staff` — presentes, con el `using` exacto `(user_id = auth.uid()) OR is_moderator_or_admin()` (y `concern_proposals_select_own_or_staff` confirmada intacta, con su propio predicado `proposer_user_id`, sin tocar — la excepción).
- `reports`/`channel_reports`: `GRANT ALL ON TABLE ... TO authenticated` (y `anon`, `service_role`) — grant de tabla completa, sin restricción de columna.

**Nota sobre las credenciales usadas:** la sesión CLI de Supabase, ya autenticada localmente antes de este bloque de trabajo, generó un rol de conexión temporal (`cli_login_postgres.<ref>`) con una contraseña de un solo uso — mecanismo estándar del propio CLI, no una credencial de larga duración. Esa contraseña apareció una vez en la salida de un `--dry-run` de depuración; no se ha vuelto a mostrar, no se ha guardado en ningún archivo de este repositorio ni de este documento, y no se repite aquí.

---

## 4. Revalidación de `seguridad/33_rollback_0043.sql` contra producción

**EJECUTADO contra el estado ACTUAL de producción**, usando el dump real de §3 — no contra staging, no contra el SQL fuente, no supuesto.

- **Correspondencia interna 0043 ↔ rollback 33:** 25/25 (invariante, ya confirmada antes).
- **Cuerpo a cuerpo de las 10 funciones, rollback 33 vs. dump real de producción:** comparación automatizada (normalizando espacios/comillas) — **10/10 coinciden exactamente.** (Dos de los diez marcaron una falsa discrepancia por un fallo del propio script de comparación con el delimitador `$$` de esas dos funciones concretas — confirmado manualmente que el texto es idéntico carácter a carácter en ambos casos; no es una discrepancia real.)
- **Las 11 policies, using-clause rollback 33 vs. producción real:** `(user_id = auth.uid()) OR is_moderator_or_admin()` en las 11, exacto — coinciden.
- **Grants de `reports`/`channel_reports`:** producción tiene hoy `GRANT ALL` de tabla completa (incluye `SELECT`); el rollback 33 restaura `GRANT SELECT` de tabla completa tras revocar el grant de columna de 0043 — equivalente funcional exacto, ya que 0043 nunca toca los demás privilegios (`INSERT`/`UPDATE`/etc., que permanecen intactos durante todo el ciclo) y Postgres consolida los privilegios de un mismo grantee en una única entrada de ACL independientemente de cuántas sentencias `GRANT` se usaron para construirla.
- **Las 2 vistas:** confirmado que no existen todavía en producción (`0` coincidencias en el dump) — coherente con que el `DROP VIEW IF EXISTS` del rollback sea, hoy, un no-op seguro (las crea 0043, las eliminaría el rollback si 0043 llegara a aplicarse).

**Conclusión: 25/25 confirmado contra el estado real y actual de producción**, no contra una instantánea antigua ni una suposición.

---

## 5. Matriz de compatibilidad — verificado leyendo el código actual, no supuesto

| | DB antigua (PRE-0043) | DB nueva (POST-0043) |
|---|---|---|
| **App antigua** (pre-merge) | **ESTADO A** — funcional, es el estado actual real de producción hoy. | **ESTADO C** — ver incompatibilidades abajo. |
| **App nueva** (`main` actual, `681fa55`) | **ESTADO B** — ver incompatibilidades abajo. | **ESTADO D** — validado en staging (24/24 pruebas JWT reales + smoke). |

### Incompatibilidad exacta — ESTADO B (app nueva + DB antigua)

- `moderationService.ts:72-73` (`listReportedEvents`) y `:146-147` (`listReportsForEvent`) consultan `.from('reports_moderation')`. En DB antigua esa vista no existe → PostgREST devuelve error ("no se encuentra la relación en la caché del esquema" / 404 de PostgREST). **El panel de moderación de convocatorias reportadas deja de funcionar por completo** para cualquier miembro de staff, hasta que la DB tenga 0043.
- `channelsService.ts:192-193` (`listReportedChannels`) consulta `.from('channel_reports_moderation')` — mismo fallo, **el panel de canales reportados deja de funcionar**.
- `createReport()` (`moderationService.ts:184`) y `reportChannel()` (`channelsService.ts:177`) piden columnas explícitas (`id, event_id, reason, details, status, created_at, resolved_at`) sobre la tabla base — en DB antigua el `GRANT` sigue siendo de tabla completa, así que pedir un subconjunto de columnas **sigue funcionando sin problema** (un grant más amplio siempre cubre una petición de columnas más estrecha). Sin incompatibilidad aquí.
- Las 10 funciones RPC: mismos nombres y parámetros en ambas versiones de la DB — **sin incompatibilidad de firma**. La única diferencia es que, contra DB antigua, nunca aparece un array vacío por supresión (todo se muestra siempre, sin protección de umbral) — no es un fallo funcional, es la ventana de exposición ya conocida y aceptada (ver §10).

### Incompatibilidad exacta — ESTADO C (app antigua + DB nueva)

- El código antiguo de `moderationService`/`channelsService` (antes de este parche) hace `.select('*')` directamente sobre `reports`/`channel_reports`. Con 0043 aplicada, `authenticated` ya no tiene `GRANT SELECT` de tabla completa, solo por columna (sin `reported_by_user_id`) → `select('*')` **falla con `permission denied for table reports`** (confirmado empíricamente en este mismo proyecto, fase de pruebas). **El panel de moderación de reportes/canales deja de funcionar** para cualquier staff que siga usando la app antigua.
- El flujo de creación de reportes de la app antigua (`createReport`/`reportChannel`) hace `.insert(...).select('*').single()` — el `INSERT` en sí seguiría funcionando (0043 no toca privilegios de `INSERT`), pero el `.select('*')` posterior para devolver el objeto creado **fallaría igual que arriba** — la persona que reporta vería un error tras enviar su reporte, aunque el reporte quedara guardado.
- Las 10 funciones RPC: mismo razonamiento que en B, sin incompatibilidad de firma; los resultados simplemente empiezan a venir con supresión aplicada, que la UI antigua no interpreta con el mensaje neutro nuevo (muestra "sé la primera persona en participar" incluso si hay 1-4 respuestas suprimidas) — inexactitud de redacción, no un fallo funcional.

**Conclusión de la matriz — importante para el runbook de §9:** a diferencia de lo que a veces se asume en despliegues de este tipo, **ninguna de las dos ventanas (B o C) es "segura" para el panel de moderación de reportes.** Promover la app antes que la DB rompe moderación por vista ausente; promover la DB antes que la app la rompe por permiso denegado. La única forma de evitar cualquier ventana de rotura de moderación es minimizar al máximo el tiempo entre T2 y T4 (§9) — no existe un orden que la elimine por completo.

---

## 6-8. Deployment de Vercel — EJECUTADO (preparado, sin promover)

Sesión de Vercel CLI ya autenticada localmente, proyecto ya vinculado (`.vercel/project.json`, proyecto `convoca`, org `<org-vercel>`).

**Deployment nuevo creado — `vercel deploy --prod --skip-domain --yes`, desde el HEAD exacto validado de `main` (`681fa554774cf33eadd3fe752d07f09e53d65a4b`, árbol de trabajo limpio confirmado inmediatamente antes):**

| | |
|---|---|
| ID | `<deployment-id>` |
| URL | `https://<url-deployment>.vercel.app` |
| Target | `production` |
| Status | `Ready` |
| Alias asignados | `<url-deployment-alias>.vercel.app`, `<url-deployment>.vercel.app` — **ninguno es `convoca.cloud`** |
| Build | Completado en 42s, sin errores |

`--skip-domain` confirmado efectivo: el deployment tiene `target=production` (usa las variables de entorno y configuración de Production) pero **no está aliasado al dominio real** — exactamente el estado pedido, "preparado sin promover".

**Deployment actualmente activo en `convoca.cloud` — identificado como candidato de rollback de aplicación:**

| | |
|---|---|
| ID | `<deployment-id>` |
| URL | `https://<url-deployment>.vercel.app` |
| Creado | 2026-08-07 13:55:55 (hace 3 días en el momento de esta comprobación) |
| Alias | `convoca.cloud`, `www.convoca.cloud`, `convoca-five.vercel.app` |
| Status | `Ready` |

Para revertir la aplicación a este estado (Caso C/D de §10), el comando sería re-promoverlo (`vercel promote <deployment-id>` o alias equivalente) — no ejecutado en esta fase.

---

## 9. Procedimiento exacto de promoción (diseño, no ejecutado)

```
T0  Deployment de producción NUEVO ya construido y READY, sin dominio asignado
    todavía — YA CUMPLIDO: <deployment-id> (§6-8). Si entre
    este momento y la autorización final de promoción se fusiona algún commit
    nuevo a main, este T0 debe repetirse contra el nuevo HEAD antes de
    continuar — este deployment concreto solo es válido para 681fa55.

T1  Último preflight de DB inmediatamente antes de T2:
    - migration list: 0001-0042 local==remote, 0043 pendiente (único);
    - db push --dry-run: exclusivamente 0043;
    - snapshot de schema_migrations tomado en este instante (no antes).

T2  db push de EXCLUSIVAMENTE 0043 contra producción.

T3  Confirmación inmediata post-T2 (gates mínimos, ver §11), sin re-ejecutar
    las 42 pruebas completas de staging aquí — solo los gates estructurales:
    - migration list: 43/43;
    - dry-run vacío;
    - 10 funciones presentes con search_path esperado;
    - 11 policies sin bypass de staff;
    - concern_proposals sin cambio;
    - reports_moderation / channel_reports_moderation existen.

T4  PROMOVER INMEDIATAMENTE el deployment ya construido en T0 al dominio de
    producción. No se recompila entre T2 y T4 — el build ya está listo desde
    T0, precisamente para que la ventana T2→T4 sea solo el tiempo de
    reasignar el dominio (segundos), no un nuevo build (minutos).

T5  Smoke tests combinados DB nueva + app nueva (§12), con la app ya
    apuntando al dominio real.
```

**Ventana estimada entre T2 y T4:** dado que `0043` es una única migración con `CREATE OR REPLACE FUNCTION`/`CREATE POLICY`/`CREATE VIEW`/`GRANT`/`REVOKE` — sin `CREATE TABLE`, sin migración de datos, sin bloqueos largos esperables — el propio `db push` debería completarse en segundos (mismo orden de magnitud que se observó al aplicarla a staging). Sumado a que T4 es solo una reasignación de dominio sobre un deployment ya construido (no un nuevo build), la ventana T2→T4 realista es de **decenas de segundos, no minutos** — siempre que T0 (el deployment preparado) ya exista antes de empezar. Esta cifra es una estimación basada en la naturaleza de la migración y en la observación de staging, no una medición contra producción (no se ha ejecutado nada ahí).

---

## 10. Plan de fallos (diseño, no ejecutado)

- **Caso A — fallo antes de T2:** detener. Producción intacta por definición (nada se ha escrito). No se requiere ninguna acción de recuperación.
- **Caso B — `0043` falla durante `db push`:** detener inmediatamente. Antes de cualquier otra acción, comprobar el estado real (`migration list`, y si es posible, el estado de los objetos concretos que la migración toca) — **no asumir que hace falta rollback sin haber confirmado qué quedó aplicado y qué no** (una migración de Supabase corre en una única transacción; lo esperable es "todo o nada", pero confirmarlo con evidencia, no suponerlo). No reintentar automáticamente.
- **Caso C — `0043` aplica correctamente pero el deployment de app no puede promoverse:** este es exactamente el ESTADO C de la matriz (§5) — moderación de reportes rota para la app antigua todavía activa. Opción de restauración: ejecutar `seguridad/33_rollback_0043.sql` (versionado como migración nueva, mismo mecanismo que `0043`, nunca SQL manual) para volver a app antigua + DB antigua (ESTADO A), y reintentar la promoción completa desde T0 una vez resuelto el problema del deployment.
- **Caso D — DB y app nuevas ya activas pero un smoke crítico falla:** procedimiento coordinado — primero identificar si el fallo es de la app (revertir solo el deployment de Vercel al anterior identificado en §6-8, dejando DB nueva + app antigua = ESTADO C, aceptando su incompatibilidad de moderación como ventana temporal controlada mientras se corrige la app) o de la DB (ejecutar rollback 33 para volver a DB antigua, dejando app nueva + DB antigua = ESTADO B, con su propia incompatibilidad de moderación, igualmente temporal). **En ningún caso dejar ambos componentes "nuevos pero rotos" sin decidir activamente cuál de los dos se revierte primero** — la decisión depende de cuál de los dos smoke tests falló, no es simétrica.

---

## 11. Gates post-0043 (preparados, no ejecutados)

Ídem §9-T3, ampliado: `migration list` 43/43; `db push --dry-run` vacío; 10 funciones (`search_path`, `security_definer`); 11 policies renombradas sin `_or_staff`; `concern_proposals` intacta; `reports_moderation`/`channel_reports_moderation` existen con `security_invoker=true` y sin `reported_by_user_id`; H-02 (validación de catálogo cerrado en las funciones de escritura de escucha); RLS habilitada en las 12 tablas de participación; sin ningún cambio inesperado fuera de lo que 0043 documenta.

## 12. Smoke post-promoción (preparado, no ejecutado)

`/`; una solución Pulso real; `/pulso/proximo-bloque`; `/pulso/escucha/sanidad`; confirmar que un resultado suprimido no rompe la UI (mensaje neutro, no error); flujo completo de reportar una convocatoria y verlo en moderación (`reports_moderation`); mismo flujo para canales (`channel_reports_moderation`); una ruta OG relevante (p. ej. `/og/convocatorias/[slug]`); ausencia de nuevos `5xx` en los minutos siguientes. Sin crear participación ciudadana real — usar cuentas de prueba dedicadas y limpiarlas, mismo estándar que en staging.

## 13. Observabilidad (preparado, no ejecutado)

Tras promoción: deployment `READY` con el dominio de producción apuntando exactamente a ese deployment; logs de errores del periodo inmediatamente posterior; ausencia de nuevos `5xx`; errores de PostgREST relacionados con `reports_moderation`/`channel_reports_moderation`/las 10 funciones. **Advertencia explícita, no inventar señal donde no la hay:** `convoca.cloud` es un proyecto con tráfico real pero bajo — si en la ventana de observación no hay tráfico suficiente sobre las rutas afectadas, decirlo explícitamente ("sin evidencia suficiente, no se puede concluir ausencia de error por falta de tráfico observado") en vez de interpretar silencio como éxito.

---

## 14. Confirmación de límites respetados en esta fase

Operaciones reales ejecutadas: lecturas contra producción (`migration list`, `db push --dry-run`, `db dump` schema-only), un `vercel deploy --prod --skip-domain` (crea un deployment nuevo, pero no lo alias a `convoca.cloud`), y lecturas de metadatos de Vercel (`vercel ls`, `vercel inspect`). **Ninguna de estas escribe en la base de datos de producción ni cambia lo que sirve `convoca.cloud` hoy.** No se ha ejecutado ningún `db push` real (sin `--dry-run`) contra producción. No se ha promovido ningún deployment al dominio real. No se ha ejecutado ningún rollback. No se ha modificado código, `0043`, ni `seguridad/33_rollback_0043.sql`. Staging sin tocar.
