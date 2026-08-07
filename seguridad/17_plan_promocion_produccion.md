# Plan de promoción controlada a producción — CONVOCA

**Fecha:** 2026-08-07 (revisión 2 — incorpora endurecimiento defensivo del Bloque B)
**Estado de este documento: PLAN CANDIDATO — NO EJECUTADO.** Ningún paso de este plan se ha ejecutado. No se ha hecho merge a `main`, no se ha ejecutado `vercel deploy --prod`, no se ha tocado producción de Supabase, no se ha ejecutado ningún `supabase db push`.

**Nota sobre el Bloque B:** en la versión anterior de este documento, el rollback SQL de B era un esqueleto con placeholders. En esta revisión se ha construido el rollback SQL **completo** (B.9), sourced directamente de las migraciones ya aplicadas (`0032`/`0033`) y de la propia migración candidata (`08_migracion_candidata_0042.sql`) — no de memoria ni de suposición. Esto **desbloquea** la precondición que impedía considerar B ejecutable, pero **no equivale a una aprobación de ejecución**: B sigue siendo un plan candidato, sujeto a que la captura en vivo del "antes" (B.4) contra producción, en el momento real de actuar, coincida exactamente con lo documentado aquí. Si no coincide, este documento debe actualizarse antes de proceder — no se parchea el rollback sobre la marcha.

Este plan cubre dos bloques **totalmente independientes**, promovibles y reversibles por separado:

- **Bloque A — Código:** `sharp@0.35.3` (override de dependencia) + `engines.node: "22.x"`.
- **Bloque B — Base de datos:** migración candidata `0042` (hardening de permisos RPC + validación H-02), ya validada en staging.

Ninguno de los dos bloques depende del otro para funcionar. Se promueven, se verifican y — si hiciera falta — se revierten en operaciones separadas, sin mezclar sus commits, sus despliegues ni sus criterios de éxito.

---

## BLOQUE A — Código: `sharp@0.35.3` + `engines.node: 22.x`

### A.1 Precondiciones

- Los commits funcionales existen exactamente como:
  - `b18fa86` — `pnpm-workspace.yaml` (`overrides: sharp: 0.35.3`) + `pnpm-lock.yaml` regenerado.
  - `739c3a2` — `package.json` (`engines.node: "22.x"`).
- Los 3 commits de documentación (`407a6fe`, `7adad8f`, `251388d`, todos bajo `seguridad/`) **no contienen ningún cambio de código, configuración ni dependencia** — se confirma con `git show --stat <hash>` antes de promover: cada uno debe tocar únicamente un archivo `.md` dentro de `seguridad/`. Esto es lo que garantiza que la documentación no es necesaria para el funcionamiento: si se decidiera promover solo `b18fa86`+`739c3a2` (por ejemplo, vía cherry-pick a otra rama), el software funcionaría idénticamente sin los 3 commits de documentación.
- El deployment Preview `dpl_BMf4ThywdWSW9nT4hhKP8Y7U6G5D` sigue en `READY` y accesible.
- Resultados ya confirmados y vigentes: `pnpm build` PASS, `pnpm audit --prod` limpio, build log del Preview confirma Node `22.x` y `sharp@0.35.3`, smoke test HTTP del endpoint OG PASS (200/PNG válido + 404 en slug inexistente).
- `git status` en la rama `security/sharp-node22-preview` sin cambios sin commitear en `package.json`, `pnpm-lock.yaml` o `pnpm-workspace.yaml`.
- `origin/main` no tiene commits nuevos desde que se creó la rama que no se hayan revisado (`git fetch origin && git log origin/main -1`).

### A.2 Estado exacto que se va a promover

El árbol de archivos resultante de aplicar, en orden, únicamente:

```
b18fa86  fix(deps): forzar sharp@0.35.3 vía override para mitigar CVEs de libvips
739c3a2  chore(node): fijar engines.node a 22.x
```

Es decir: `package.json` (+3 líneas, `engines`), `pnpm-workspace.yaml` (+9 líneas, `overrides`), `pnpm-lock.yaml` (regenerado, `sharp` resuelto a `0.35.3` en todo el árbol). Nada más. Los commits de documentación pueden acompañar al merge por trazabilidad, pero no forman parte de "lo que se promueve" en sentido funcional.

Verificación exacta antes de fusionar:
```
git diff origin/main...security/sharp-node22-preview -- package.json pnpm-workspace.yaml pnpm-lock.yaml
```
debe mostrar únicamente esos 3 archivos (ya verificado en la tarea de push del Preview: exactamente esos 3 + el doc 14).

### A.3 Comandos/acciones exactas

1. `git fetch origin` y confirmar que `origin/main` no cambió de forma inesperada.
2. Abrir PR: `gh pr create --base main --head security/sharp-node22-preview` (revisión antes de fusionar, no merge directo a ciegas).
3. Tras aprobación humana explícita: fusionar con **merge commit**, no squash (`git merge --no-ff security/sharp-node22-preview` sobre un checkout local de `main`, o "Create a merge commit" en GitHub) — para que `b18fa86` y `739c3a2` sigan siendo identificables individualmente en el historial, condición necesaria para el rollback dirigido del paso A.9.
4. `git push origin main` — **solo tras aprobación explícita**, nunca como parte de un script automático.
5. Dado que ya se confirmó en esta sesión que este proyecto **no tiene integración Git↔Vercel activa** (todos los deployments existentes son `source: "cli"`), el push a `main` **no dispara ningún deploy por sí solo**. El deploy a producción es un paso deliberado y separado:
   ```
   git checkout main && git pull origin main
   vercel deploy --prod
   ```

### A.4 Comprobaciones PRE (antes de fusionar y antes de desplegar)

- `pnpm install && pnpm build && pnpm audit --prod && node --version` en un checkout limpio de la rama, repetidos una vez más justo antes de fusionar (no reutilizar resultados de hace días).
- `git log origin/main..security/sharp-node22-preview --oneline` → debe mostrar exactamente los 5 commits ya conocidos, ninguno más.
- Confirmar que el Preview (`dpl_BMf4ThywdWSW9nT4hhKP8Y7U6G5D`) sigue accesible y en `READY` (no expiró ni se borró).

### A.5 Criterio GO / NO-GO

**GO** si y solo si: build local PASS, `audit --prod` limpio, el PR no muestra ningún archivo fuera de `package.json`/`pnpm-workspace.yaml`/`pnpm-lock.yaml`/`seguridad/*.md`, y `origin/main` no tiene commits sin revisar desde la creación de la rama.

**NO-GO** si: aparece cualquier archivo inesperado en el diff del PR, `origin/main` avanzó con cambios no evaluados contra este merge, o cualquiera de las comprobaciones de A.4 falla. En NO-GO: no fusionar, no desplegar, documentar la discrepancia.

### A.6 Comprobaciones inmediatamente POST (tras `vercel deploy --prod`)

1. `vercel inspect <url-de-produccion>` → confirmar `target: production`, `readyState: READY`.
2. En el log de build de ese deployment, confirmar la misma línea que en el Preview: `"Skipping build cache since Node.js version changed from ... to 22.x"` (o el nodeVersion efectivo reportado = `22.x`).
3. Confirmar en el log de build que las rutas de `sharp` referencian `sharp@0.35.3` (mismo patrón `node_modules/.pnpm/sharp@0.35.3_...` visto en el Preview).
4. Repetir el smoke test HTTP del endpoint OG **contra la URL de producción**, con un slug real **ya existente en producción** (nunca un slug de staging, nunca creando uno nuevo): `GET /og/convocatorias/<slug-real-produccion>` → `200`, `Content-Type: image/png`, descarga a archivo, verificación de PNG válido y no vacío. Y `GET /og/convocatorias/<slug-inexistente>` → `404`.
5. Spot-check de 2-3 rutas SSR no relacionadas (p. ej. `/`, `/pulso/soluciones/<slug-real>`) para confirmar que no hay regresión general del build.
6. Revisar logs de la función serverless en Vercel durante los primeros minutos por si aparecen 5xx nuevos.

### A.7 Criterios de éxito

- Deployment de producción `READY`, Node `22.x` confirmado, `sharp@0.35.3` confirmado, ambos con evidencia de log, no por asunción.
- Endpoint OG en producción: `200`/PNG válido para slug real, `404` para slug inexistente — igual que en el Preview.
- Sin incremento de errores 5xx respecto al comportamiento previo al deploy.
- El resto de la aplicación responde igual que antes (sin regresión visible en el spot-check).

### A.8 Señales de rollback

- Cualquier `5xx` nuevo en el endpoint OG o en cualquier ruta SSR tras el deploy.
- Imagen OG generada incorrecta/corrupta/distinta a la validada en Preview.
- Fallo de build en producción (aunque ya se validó en Preview, el entorno de producción podría diferir en alguna variable no probada).
- Cualquier reporte de usuario o de monitorización de fallo funcional atribuible a este deploy.

### A.9 Procedimiento de rollback

1. **Inmediato, sin tocar git:** revertir el tráfico de producción al deployment anterior conocido mediante el "Instant Rollback" de Vercel (`vercel rollback` o promover explícitamente el deployment de producción previo a este cambio) — revierte en segundos, sin tocar `main` ni la base de datos.
2. **Permanente (si el rollback debe persistir en el código, no solo en el tráfico):** commit de revert explícito sobre `main`:
   ```
   git revert -m 1 <hash-del-merge-commit>
   ```
   o, si se prefiere granularidad, revertir los 2 commits funcionales en orden inverso al de aplicación: `git revert 739c3a2` y luego `git revert b18fa86`. Nunca `git reset --hard` sobre `main` compartido, nunca `--force`.
3. Tras el revert, volver a ejecutar `vercel deploy --prod` con el `main` revertido para que el tráfico y el código vuelvan a coincidir.

### A.10 Comprobación posterior al rollback

- `vercel inspect` sobre la URL de producción → confirmar que el `id` de deployment coincide con el deployment pre-cambio (o con el nuevo deployment generado a partir del `main` revertido).
- Repetir el smoke test OG contra producción y confirmar que vuelve al comportamiento anterior.
- `pnpm audit --prod` sobre el estado revertido volverá a mostrar la vulnerabilidad de `sharp` conocida — **documentar explícitamente que el rollback reintroduce ese riesgo de forma consciente y temporal**, como trade-off aceptado hasta poder reintentar la promoción.

---

## BLOQUE B — Base de datos: migración `0042` (hardening RPC + H-02)

### B.0 Gate bloqueante: estado del rollback

**B no se considera ejecutable sin un rollback SQL completo, sin placeholders.** Ese rollback se ha construido en B.9, sourced de:
- Las definiciones **anteriores exactas** de las 2 funciones que `§C` reemplaza, tomadas literalmente de las migraciones ya aplicadas y presentes en el repo: `set_concern_listening_priorities` de `supabase/migrations/0033_fix_listening_priorities_rank_order.sql` (última redefinición antes de 0042 — confirmado por `grep`, ninguna migración posterior a la 0033 vuelve a tocar esta función) y `set_concern_listening_detail` de `supabase/migrations/0032_escucha_vivienda.sql` (nunca redefinida desde entonces).
- El estado de permisos "antes" **documentado explícitamente** en `06_revision_critica.md`/`07_preflight_produccion.sql` (comentario de la sección 6): las 23 funciones de `§A`+`§A2`+`§B` no tienen "ningún revoke/grant explícito" en sus migraciones originales, es decir, su estado antes de 0042 es el default de PostgreSQL: `EXECUTE` concedido a `PUBLIC`.

Esto satisface la condición de "sin placeholders": el rollback de B.9 es SQL completo y ejecutable tal cual está escrito. **Lo que sigue pendiente, y no se puede resolver en este documento, es la confirmación en vivo**: en el momento real de ejecutar B, la captura fresca de `pg_get_functiondef` y de los permisos efectivos contra producción (B.4) debe coincidir byte a byte con lo aquí documentado. Si no coincide, es una señal de **NO-GO** (B.5) — se actualiza este documento con el estado real antes de continuar, nunca se ejecuta un rollback que no se ha verificado contra la realidad del momento.

### B.1 Precondiciones

- Bloque A evaluado de forma independiente (no es un prerrequisito técnico, pero no debe solaparse en el tiempo con B: ver ventana de observación al final de este documento).
- `seguridad/08_migracion_candidata_0042.sql` (514 líneas) sin cambios desde su última revisión registrada en `06_revision_critica.md`.
- **El rollback SQL completo de B.9 existe y ha sido revisado — precondición bloqueante, no opcional.**
- Todas las pruebas de staging ya PASS y documentadas: preflight (`11_resultados_preflight_staging.md`), sesiones reales 17/17 (`12_resultados_pruebas_sesion_real_staging.md`), páginas públicas SSR sin sesión, `delete-account` 6/6, sanidad 5/5, concurrencia RT-009 (estado final 3 prioridades, no 6).
- Acceso confirmado a producción (`ihwzbdaeggvkzwevozra`) con permisos suficientes para aplicar migraciones vía Supabase CLI y para solicitar/verificar un backup.
- La migración **no existe todavía** en `supabase/migrations/` (confirmado: no hay ningún `0042_*.sql` en el repo real) — sigue siendo un archivo candidato en `/seguridad`.
- Supabase CLI instalado, autenticado, y enlazado (`supabase link`) contra el proyecto correcto — verificado, no asumido (ver B.3.3).

### B.2 Estado exacto que se va a promover

El contenido **literal** de `seguridad/08_migracion_candidata_0042.sql`, copiado sin reescribir a `supabase/migrations/0042_security_hardening_review3.sql` (o el nombre que corresponda según convención de numeración del repo en el momento de aplicar). Antes de copiar, `diff` byte a byte contra la versión que efectivamente se aplicó y validó en staging (no una versión "recordada" o reescrita de memoria).

Contenido: bloque `§DIAGNÓSTICO` (solo lectura), `§A` (10 funciones de escritura privada: revoke a `anon`), `§A2` (2 funciones adicionales encontradas empíricamente en staging: `set_concern_response`, `set_measure_response`), `§B` (11 funciones de lectura pública agregada: grant a `anon` y `authenticated`), `§C` (H-02: validación de `option_code` en `set_concern_listening_priorities` y `set_concern_listening_detail`). Ya envuelto en `begin;` / `commit;` explícitos (línea 98 / 491) — atomicidad ya garantizada por el propio archivo, no añadida por este plan.

### B.3 Comandos/acciones exactas

**0042 NO se ejecuta manualmente vía SQL Editor ni mediante una sesión SQL administrativa suelta.** Se aplica exclusivamente como migración versionada de Supabase CLI, con `dry-run` obligatorio antes de aplicar:

1. **Confirmación explícita de destino** (antes de cualquier otra acción):
   ```sql
   select current_database(), current_setting('cluster_name', true);
   ```
   y, por separado, `supabase projects list` / `supabase link --project-ref <ref>` mostrando explícitamente el `project-ref` activo. Comparar carácter a carácter contra `ihwzbdaeggvkzwevozra` (producción) — **nunca de memoria, nunca asumido**. Confirmar explícitamente que **no** es `hapxitzmmifuddvbfphc` (staging).
2. Ejecutar de nuevo, **contra producción, ahora mismo** (no reutilizar resultados de staging), el preflight completo de solo lectura: `07_preflight_produccion.sql`, secciones 1 a 9.
3. **Backup/snapshot recuperable** — ver B.3-BACKUP más abajo — completado y verificado antes de continuar.
4. Copiar el archivo, **sin modificar su contenido**, a `supabase/migrations/0042_security_hardening_review3.sql`, en una rama propia (p. ej. `db/0042-security-hardening`, **nunca** en `security/sharp-node22-preview` ni mezclado con el Bloque A). Commitear ese único archivo en esa rama.
5. `supabase migration list` (contra producción) — capturar el estado "antes": deben aparecer exactamente las 41 migraciones ya conocidas como `REMOTE`, ninguna `0042` todavía.
6. `supabase db push --dry-run` — revisar la salida con atención: **debe mostrar únicamente `0042_security_hardening_review3.sql` como pendiente de aplicar.** Si aparece cualquier otra migración pendiente (por ejemplo, una `0038`/`0040` no aplicada que nadie detectó), es señal de NO-GO (B.5) — investigar esa divergencia antes de continuar, nunca aplicar "de paso" una migración no revisada.
7. **Aprobación humana explícita** — un humano con autoridad de despliegue revisa la salida del `dry-run` y el resultado del preflight (B.4) y aprueba por escrito (comentario en el PR/issue de seguimiento) antes del siguiente paso. Sin esta aprobación, no se ejecuta `db push`.
8. `supabase db push` (sin `--dry-run`) — aplica `0042` contra producción a través del mecanismo estándar de migraciones de Supabase, no mediante una conexión SQL manual.
9. `supabase migration list` de nuevo — confirmar que `0042_security_hardening_review3` aparece ahora marcada como **`LOCAL`** (en el repo) **y `REMOTE`** (aplicada en producción) — ambas columnas, no solo una.

### B.3-BACKUP — Verificación de backup (no asumir snapshot on-demand)

**No se asume que existe un mecanismo de snapshot on-demand disponible.** Antes de continuar con B.3, verificar en este orden:

1. **PITR (Point-in-Time Recovery):** comprobar en el dashboard de Supabase (Settings → Database → Backups) si el proyecto de producción tiene PITR habilitado y cuál es su ventana de retención. Si está disponible, anotar el `restore point` más reciente (timestamp) inmediatamente antes de aplicar `0042` como referencia de "hasta aquí se puede volver".
2. **Si no hay PITR disponible** (plan sin ese add-on, o no habilitado): realizar un **backup lógico explícito** antes de continuar:
   ```
   supabase db dump --db-url <connection-string-produccion> -f backup_pre_0042_<timestamp>.sql
   ```
   (o `pg_dump` directo contra la connection string de producción, con las mismas precauciones de no exponer la cadena de conexión completa en logs compartidos).
3. **Verificación obligatoria antes de GO:** el archivo de backup generado debe abrirse/inspeccionarse (tamaño no cero, cabecera `pg_dump` válida, o confirmación de "restore point" visible en el dashboard para PITR) — "se lanzó el comando" no es equivalente a "el backup existe y es recuperable". Sin esta verificación, es NO-GO automático (ver B.5).

### B.4 Comprobaciones PRE

- **Project-ref confirmado explícitamente** como producción (B.3.1), no asumido.
- Preflight completo (`07_preflight_produccion.sql`, 9 secciones) ejecutado **contra producción en este momento**.
- Backup verificado según B.3-BACKUP (PITR con restore point anotado, o backup lógico confirmado como no vacío y recuperable).
- §8 (diagnóstico H-02) → **0 filas** en 8a/8b/8c/8d en producción. Si no es así, ver B.5-LEGACY (no limpiar automáticamente).
- §3 (permisos efectivos) → capturar el "antes" exacto: 12 filas "escritura_privada" (10 de `§A` + `set_concern_response`/`set_measure_response` de `§A2`) y 11 filas "lectura_publica". Si el recuento real difiere de 12+11 en el momento de ejecutar, **tratar la discrepancia como NO-GO** hasta reconciliarla.
- **Capturar y guardar** `pg_get_functiondef` de `set_concern_listening_priorities(uuid,text[])` y `set_concern_listening_detail(uuid,text,text,text,text,text,text,text)` contra producción — y confirmar que coinciden **exactamente** con los cuerpos embebidos en el rollback de B.9 (fuente: `0033`/`0032`). Si no coinciden, el rollback de B.9 está desactualizado respecto a la producción real — actualizar este documento antes de proceder; no continuar con un rollback no verificado.
- §4 (`anon_can_create` / `authenticated_can_create`) → ambos `false`.
- §7 (huella de migraciones) → 41/41 migraciones locales aplicadas y ninguna adicional fuera del repo.
- `supabase migration list` (B.3.5) y `supabase db push --dry-run` (B.3.6) ejecutados y con el resultado esperado (solo `0042` pendiente).

### B.5 Criterio GO / NO-GO

**GO** solo si **todas** las comprobaciones de B.4 son exactamente las esperadas, sin excepciones ni "está casi bien", **y** existe aprobación humana explícita (B.3.7).

**NO-GO inmediato, sin aplicar 0042**, si cualquiera de estas condiciones ocurre:
- El project-ref no coincide exactamente con `ihwzbdaeggvkzwevozra`.
- El backup/PITR no está verificado según B.3-BACKUP.
- §8 devuelve alguna fila — **ver procedimiento dedicado B.5-LEGACY, no limpiar producción automáticamente.**
- §4 devuelve `true` en `anon_can_create` o `authenticated_can_create`.
- §7 muestra cualquier divergencia (migración aplicada a mano, o migración local no aplicada).
- El recuento de §3 no es el esperado (12 privadas + 11 públicas) y no se ha reconciliado la diferencia.
- `pg_get_functiondef` en vivo no coincide exactamente con lo embebido en el rollback de B.9.
- `supabase db push --dry-run` muestra cualquier migración pendiente distinta de `0042`.
- No hay aprobación humana explícita registrada.

En NO-GO: no aplicar el archivo, documentar la discrepancia en `/seguridad`, no reintentar automáticamente.

### B.5-LEGACY — Procedimiento si §8 (diagnóstico H-02) devuelve filas

**No limpiar producción automáticamente bajo ninguna circunstancia.** Si `07_preflight_produccion.sql` §8 (8a/8b/8c/8d) devuelve alguna fila en producción, el resultado es **NO-GO** inmediato para `0042` tal cual está escrita, y se sigue este proceso — separado, sin prisa, sin mezclarlo con la promoción de B:

1. **Identificar las filas legacy exactas** — guardar el resultado completo de la consulta que devolvió filas (qué `round_id`, qué `option_code`, cuántas).
2. **Explicar por qué existen** — investigar el origen: ¿son datos de una época anterior a que el catálogo de `option_code` quedara fijado?, ¿un bug ya corregido que insertó valores fuera de catálogo?, ¿una categoría que en su momento no tenía restricción? No asumir la causa — confirmarla con evidencia (fecha de creación de las filas, comparación con la fecha de los commits relevantes).
3. **Diseñar una migración de limpieza independiente** — un archivo `0042b_...` o similar, **separado** de `0042_security_hardening_review3.sql`, que corrija/reclasifique/elimine (según corresponda tras el paso 2) únicamente esas filas legacy, sin tocar la lógica de las funciones.
4. **Probarla primero en staging** — reproducir el mismo patrón de datos legacy en `convoca-staging` (o usar una copia de esas filas si la política de datos lo permite) y confirmar que la migración de limpieza deja §8 en 0 filas allí, sin efectos secundarios sobre otras filas.
5. **Volver a ejecutar desde cero el preflight de producción** — tras aplicar la migración de limpieza (con su propio ciclo GO/NO-GO, backup, etc., igual de riguroso que el de `0042`), repetir `07_preflight_produccion.sql` §8 completo contra producción y confirmar 0 filas antes de retomar el plan de aplicar `0042`.

Solo entonces se reevalúa B.4/B.5 para `0042` desde el principio.

### B.6 Comprobaciones inmediatamente POST (todas no destructivas — sin escrituras nuevas)

**El flujo de escritura autenticada válido (votar, completar una escucha, enviar prioridades) ya fue demostrado exhaustivamente en staging (`09_pruebas_parche_0042.md`, `12_resultados_pruebas_sesion_real_staging.md`). No se repite en producción.** Ninguna comprobación POST en producción crea votos, prioridades ni participaciones — reales ni de prueba — sobre rondas ciudadanas reales.

1. **Permisos efectivos (solo lectura, `has_function_privilege`):** repetir §3 — las 12 filas "escritura_privada" deben dar `anon_execute=false` / `authenticated_execute=true`; las 11 filas "lectura_publica" deben dar `anon_execute=true` **y** `authenticated_execute=true`.
2. **Definiciones de función (solo lectura, sin invocarlas):** `pg_get_functiondef` de las 2 funciones de `§C` en producción debe coincidir exactamente con el cuerpo nuevo aplicado por `0042` (comparación de texto, no ejecución) — confirma que la validación de `option_code` está presente en el código desplegado.
3. **Diagnóstico H-02 (solo lectura):** repetir §8 — debe seguir en **0 filas** (la migración no altera datos históricos, solo permisos y validación hacia adelante).
4. **Rechazo de input inválido — solo si puede probarse sin escribir de forma persistente:** si existe una cuenta de prueba de producción reservada para este fin (no una cuenta de un ciudadano real, no una ronda real con datos ajenos), puede probarse el rechazo dentro de una transacción explícita que termina siempre en `rollback` (nunca `commit`):
   ```sql
   begin;
   select set_concern_listening_priorities('<round_id_real>', array['no_existe_en_catalogo']);
   -- esperado: excepción 'Selecciona preocupaciones válidas.'
   rollback;
   ```
   Si no existe tal cuenta/mecanismo seguro, **se omite este paso** — no se improvisa una cuenta ni se usa una sesión de un ciudadano real. La cobertura funcional de este caso ya quedó demostrada en staging (punto 3 de la nota de verificación de `08_migracion_candidata_0042.sql`).
5. **Páginas públicas (lectura HTTP, sin sesión):** `/pulso/soluciones/[slug]`, `/pulso/escucha/sanidad`, `/pulso/proximo-bloque` → las 3 deben seguir devolviendo `200` con los agregados visibles, sin `401`/`403` ni secciones vacías.
6. **Logs y errores:** revisar logs de Supabase (Postgres logs / API logs) y de las funciones Edge relacionadas durante los minutos posteriores, buscando errores nuevos (`42501`, `500`, excepciones no esperadas) atribuibles a `0042`.

### B.7 Criterios de éxito

- Los 6 puntos de B.6 exactamente como se espera, sin ninguna regresión, sin haber escrito ningún dato nuevo de prueba en producción.
- `supabase migration list` confirma `0042_security_hardening_review3` como `LOCAL` **y** `REMOTE` (B.3.9).
- Confirmación de `COMMIT` exitoso en el log de la transacción interna del archivo de migración (no `ROLLBACK` por error de PostgreSQL).
- Ninguna sesión de usuario real interrumpida.

### B.8 Señales de rollback

- La transacción interna de `0042` falla a mitad de ejecución (cubierto estructuralmente por el `begin;`/`commit;` que ya trae el archivo: si falla, PostgreSQL no deja ningún cambio aplicado — confirmar con §3/§8 que el estado sigue siendo el "antes").
- `supabase db push` reporta error o la migración no queda `REMOTE` tras B.3.8-9.
- El `commit;` interno tiene éxito pero cualquiera de las comprobaciones POST (B.6) falla.
- `pg_get_functiondef` post-aplicación no coincide con lo esperado (indicio de que se aplicó una versión distinta del archivo).
- Reportes de usuarios de fallo en flujos de participación/escucha ciudadana tras el despliegue.

### B.9 Rollback SQL — completo, sin placeholders (preparado antes de ejecutar 0042, **no ejecutado salvo fallo**)

Reversión exacta e íntegra de `§A`+`§A2`+`§B` (permisos, restaurados al default `PUBLIC` documentado como estado "antes") y de `§C` (cuerpos de función, restaurados exactamente a la versión de `0033`/`0032`). Aplicar, igual que `0042`, como una migración versionada nueva vía `supabase db push` (nunca como sesión SQL manual) — **por consistencia con B.3**, no como excepción a esa regla.

```sql
begin;

-- ============================================================================
-- Reversión de §A + §A2 (12 funciones de escritura privada) y §B (11 de
-- lectura pública): restaurar el EXECUTE por defecto a PUBLIC, que era el
-- estado real antes de 0042 (documentado en 06_revision_critica.md /
-- 07_preflight_produccion.sql §6: estas funciones nunca tuvieron un
-- revoke/grant explícito antes de esta migración).
-- ============================================================================

revoke execute on function public.set_concern_listening_priorities(uuid, text[]) from authenticated;
grant execute on function public.set_concern_listening_priorities(uuid, text[]) to public;

revoke execute on function public.set_concern_listening_detail(uuid, text, text, text, text, text, text, text) from authenticated;
grant execute on function public.set_concern_listening_detail(uuid, text, text, text, text, text, text, text) to public;

revoke execute on function public.set_concern_listening_context(uuid, text, text, text) from authenticated;
grant execute on function public.set_concern_listening_context(uuid, text, text, text) to public;

revoke execute on function public.set_concern_listening_completed(uuid) from authenticated;
grant execute on function public.set_concern_listening_completed(uuid) to public;

revoke execute on function public.set_general_participation_response(uuid, text, text, text, text) from authenticated;
grant execute on function public.set_general_participation_response(uuid, text, text, text, text) to public;

revoke execute on function public.set_measure_participation_response(uuid, uuid, text, text, text, text, text, text) from authenticated;
grant execute on function public.set_measure_participation_response(uuid, uuid, text, text, text, text, text, text) to public;

revoke execute on function public.set_response_priorities(uuid, uuid[]) from authenticated;
grant execute on function public.set_response_priorities(uuid, uuid[]) to public;

revoke execute on function public.set_participant_context(uuid, text, text) from authenticated;
grant execute on function public.set_participant_context(uuid, text, text) to public;

revoke execute on function public.set_concern_listening_survey_response(uuid, text[], text, text, uuid[], uuid, uuid, text, text, text) from authenticated;
grant execute on function public.set_concern_listening_survey_response(uuid, text[], text, text, uuid[], uuid, uuid, text, text, text) to public;

revoke execute on function public.set_next_block_vote(uuid, text) from authenticated;
grant execute on function public.set_next_block_vote(uuid, text) to public;

revoke execute on function public.set_concern_response(uuid, smallint) from authenticated;
grant execute on function public.set_concern_response(uuid, smallint) to public;

revoke execute on function public.set_measure_response(uuid, text, text) from authenticated;
grant execute on function public.set_measure_response(uuid, text, text) to public;

revoke execute on function public.get_measure_position_counts(uuid, uuid[]) from anon, authenticated;
grant execute on function public.get_measure_position_counts(uuid, uuid[]) to public;

revoke execute on function public.get_measure_urgency_counts(uuid, uuid[]) from anon, authenticated;
grant execute on function public.get_measure_urgency_counts(uuid, uuid[]) to public;

revoke execute on function public.get_measure_reason_counts(uuid, uuid[]) from anon, authenticated;
grant execute on function public.get_measure_reason_counts(uuid, uuid[]) to public;

revoke execute on function public.get_general_participation_results(uuid) from anon, authenticated;
grant execute on function public.get_general_participation_results(uuid) to public;

revoke execute on function public.get_priority_results(uuid) from anon, authenticated;
grant execute on function public.get_priority_results(uuid) to public;

revoke execute on function public.get_participation_summary(uuid) from anon, authenticated;
grant execute on function public.get_participation_summary(uuid) to public;

revoke execute on function public.get_concern_listening_survey_summary(uuid) from anon, authenticated;
grant execute on function public.get_concern_listening_survey_summary(uuid) to public;

revoke execute on function public.get_concern_listening_survey_total(uuid) from anon, authenticated;
grant execute on function public.get_concern_listening_survey_total(uuid) to public;

revoke execute on function public.get_concern_listening_survey_territory_breakdown(uuid, integer) from anon, authenticated;
grant execute on function public.get_concern_listening_survey_territory_breakdown(uuid, integer) to public;

revoke execute on function public.get_next_block_vote_total(uuid) from anon, authenticated;
grant execute on function public.get_next_block_vote_total(uuid) to public;

revoke execute on function public.get_next_block_vote_results(uuid) from anon, authenticated;
grant execute on function public.get_next_block_vote_results(uuid) to public;

-- ============================================================================
-- Reversión de §C: restaurar el cuerpo EXACTO de las 2 funciones tal como
-- estaban antes de 0042 — literal desde supabase/migrations/0033 (para
-- set_concern_listening_priorities, su última redefinición antes de 0042)
-- y supabase/migrations/0032 (para set_concern_listening_detail, nunca
-- redefinida desde esa migración). Sin la validación de option_code que
-- añade 0042 — esto es intencionadamente una reversión completa, no un
-- parche parcial.
-- ============================================================================

create or replace function public.set_concern_listening_priorities(
	p_round_id uuid,
	p_option_codes text[]
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
	v_count integer;
	v_distinct_count integer;
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	v_count := coalesce(array_length(p_option_codes, 1), 0);
	if v_count > 3 then
		raise exception 'Puedes elegir como máximo tres preocupaciones.';
	end if;

	select count(distinct c) into v_distinct_count from unnest(p_option_codes) as c;
	if v_distinct_count <> v_count then
		raise exception 'No puedes elegir la misma preocupación más de una vez.';
	end if;

	if not exists (
		select 1 from public.concern_listening_rounds r where r.id = p_round_id and r.status = 'open'
	) then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	update public.concern_listening_responses
	set rank = null, updated_at = now()
	where round_id = p_round_id
	and user_id = v_user_id
	and rank is not null;

	if v_count > 0 then
		insert into public.concern_listening_responses (round_id, user_id, option_code, rank)
		select p_round_id, v_user_id, u.code, u.ord::smallint
		from unnest(p_option_codes) with ordinality as u (code, ord)
		on conflict (round_id, option_code, user_id)
		do update set rank = excluded.rank, updated_at = now();
	end if;
end;
$function$;

create or replace function public.set_concern_listening_detail(
	p_round_id uuid,
	p_option_code text,
	p_severity text default null,
	p_evolution text default null,
	p_personal_relation text default null,
	p_cause_code text default null,
	p_cause_other text default null,
	p_comment text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	if p_severity is not null and p_severity not in ('muy_grave', 'grave', 'moderada', 'poco_grave', 'sin_info') then
		raise exception 'Selecciona una gravedad válida.';
	end if;
	if p_evolution is not null and p_evolution not in ('empeorado', 'similar', 'mejorado', 'no_sabe') then
		raise exception 'Selecciona una evolución válida.';
	end if;
	if p_personal_relation is not null and p_personal_relation not in (
		'directamente', 'persona_cercana', 'profesional', 'no_afecta', 'prefiere_no_responder'
	) then
		raise exception 'Selecciona una relación personal válida.';
	end if;
	if p_cause_other is not null and char_length(p_cause_other) > 200 then
		raise exception 'La causa adicional es demasiado larga.';
	end if;
	if p_comment is not null and char_length(p_comment) > 500 then
		raise exception 'El comentario es demasiado largo.';
	end if;

	if not exists (
		select 1 from public.concern_listening_rounds r where r.id = p_round_id and r.status = 'open'
	) then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	if not exists (
		select 1 from public.concern_listening_responses
		where round_id = p_round_id and user_id = v_user_id and option_code = p_option_code and rank is not null
	) then
		raise exception 'Selecciona antes esta preocupación como prioridad.';
	end if;

	update public.concern_listening_responses
	set
		severity = p_severity,
		evolution = p_evolution,
		personal_relation = p_personal_relation,
		cause_code = p_cause_code,
		cause_other = nullif(trim(p_cause_other), ''),
		comment = nullif(trim(p_comment), ''),
		updated_at = now()
	where round_id = p_round_id and user_id = v_user_id and option_code = p_option_code;
end;
$function$;

commit;
```

**Condición de exactitud (repetida de B.0/B.4 por importancia):** este SQL es completo tal como está escrito, pero su exactitud depende de que el `pg_get_functiondef` capturado en vivo en B.4 coincida con los 2 cuerpos de función embebidos arriba. Esa comparación **es parte obligatoria del PRE**, no un detalle posterior.

Si el rollback SQL no fuera suficiente (p. ej. corrupción de datos, algo que un `grant`/`create or replace function` no cubre): restaurar desde el backup/PITR verificado en B.3-BACKUP, coordinando ventana de mantenimiento si hace falta (ver Runbook, apartado E).

No usar `--force` en ningún comando de Supabase CLI durante el rollback.

### B.10 Comprobación posterior al rollback

- `supabase migration list` → confirmar el estado esperado tras el rollback (según cómo se haya versionado la migración de reversión).
- Repetir §3 y §8 tras el rollback y confirmar que coinciden exactamente con el "antes" capturado en B.4.
- `pg_get_functiondef` de las 2 funciones de `§C` vuelve a coincidir exactamente con `0033`/`0032`.
- Repetir la carga sin sesión de las 3 páginas públicas.
- Documentar en `/seguridad` qué falló, por qué se hizo rollback, y el estado final confirmado — antes de plantear un segundo intento.

---

## LO QUE ESTE PLAN NO HARÁ

- **No mezclar A y B.** Cada bloque se fusiona, se despliega, se verifica y (si hace falta) se revierte en una operación separada, con una ventana de observación entre ambos. Ningún commit de A entra en la rama/migración de B ni viceversa.
- **No usar staging como fuente de datos de producción.** Ningún dato, fixture, cuenta ni contenido de `convoca-staging` se copia, referencia como "real" o se usa para poblar producción. Los slugs/eventos usados en las comprobaciones POST de producción son datos **ya existentes en producción**, nunca traídos de staging.
- **No copiar secretos.** Ninguna clave, JWT, token de bypass, cadena de conexión completa ni valor de `.env` se traslada entre entornos, se pega en este documento ni en ningún commit. Las confirmaciones de "a qué base de datos apunto" se hacen comparando identificadores (project-ref), nunca exponiendo credenciales.
- **No aplicar cambios no incluidos.** Solo se promueve exactamente lo descrito en A.2 (para el Bloque A) y B.2 (para el Bloque B). Ninguna mejora, refactor o "ya que estamos" adicional se cuela en ninguno de los dos despliegues.
- **No usar `--force`.** Ni en `git push`, ni en `git reset`, ni en ningún comando de Supabase CLI o Vercel CLI, en ningún paso de este plan ni de sus rollbacks.
- **No continuar automáticamente ante resultados inesperados.** Cualquier comprobación PRE, GO/NO-GO o POST que no dé el resultado exacto esperado detiene el plan en ese punto. No hay reintentos automáticos, no hay "probablemente esté bien, seguimos".

---

## Ventana de observación entre A y B

**No se fija una cifra arbitraria de horas.** El criterio para iniciar B es una combinación de tiempo mínimo **y** evidencia — ambas condiciones, no una sola:

- **Tiempo:** un mínimo de **varias horas** de A en producción sin incidentes — no minutos (insuficiente para observar patrones de tráfico real) ni días por defecto (retraso injustificado si no hay ninguna señal de alarma y ya hay evidencia suficiente).
- **Evidencia, durante todo ese tiempo:**
  - El deployment de A permanece en `READY` (sin redeploys de emergencia, sin rollback).
  - Sin `5xx` nuevos en ninguna ruta, atribuibles o no a A.
  - El endpoint OG (`/og/convocatorias/[slug]`) responde de forma estable: `200`/PNG válido para slugs reales, `404` para inexistentes, sin latencia anómala ni errores intermitentes.
  - Las rutas SSR generales (spot-check de A.6.5) siguen respondiendo igual que antes del deploy.
  - **Tráfico real observado**, no solo comprobaciones sintéticas — si el volumen de visitas de CONVOCA en la ventana elegida es suficiente para generar invocaciones orgánicas del endpoint OG (comprobable por los logs de Vercel), esas invocaciones reales deben mostrarse limpias, no solo las de los smoke tests.
- **Si no hay tráfico suficiente para obtener evidencia real** (por ejemplo, la ventana elegida cae en un periodo de tráfico muy bajo y los logs no muestran invocaciones orgánicas del endpoint OG): **indicarlo explícitamente** en el registro de la promoción, y decidir conscientemente entre (a) extender la ventana hasta que exista tráfico real que observar, o (b) proceder solo con la evidencia sintética disponible, dejando constancia de que la ausencia de tráfico real es una limitación conocida de la validación, no una confirmación de estabilidad bajo carga real.

Solo cuando ambas condiciones (tiempo + evidencia, con la salvedad de tráfico explícita si aplica) se cumplen, se inicia B.1.

---

## Orden recomendado: **A primero, después B**

**Recomendación: promover el Bloque A completo (merge + deploy + verificación + ventana de observación de arriba) antes de iniciar cualquier paso del Bloque B.**

Justificación técnica:

1. **Blast radius y reversibilidad muy distintos.** A es un cambio de dependencia + versión de runtime, sin ninguna interacción con datos ni con permisos de base de datos; su rollback es un "Instant Rollback" de Vercel en segundos, sin tocar la base de datos. B modifica permisos `EXECUTE` sobre 23 funciones RPC que sirven tráfico real de escritura/lectura y añade una validación de datos nueva; su rollback requiere SQL dirigido (ya completo, B.9) y, en el peor caso, restaurar desde backup/PITR. Resolver primero el cambio de menor riesgo y de reversión casi instantánea reduce el tiempo total en el que el sistema tiene un cambio "nuevo y no observado" pendiente de confirmar.

2. **Atribución de incidentes.** Si A y B se desplegaran en una ventana de tiempo solapada (aunque sean commits/migraciones separados en el historial), cualquier anomalía detectada justo después sería ambigua: ¿la causó el cambio de `sharp`/Node, o la migración de permisos? Desplegar A, observar la ventana de arriba, y solo entonces iniciar B, garantiza que cualquier señal de rollback (A.8 o B.8) se pueda atribuir sin ambigüedad a un único cambio — esto es, en la práctica, la misma exigencia de "no mezclar A y B" pero aplicada también a la dimensión temporal del despliegue, no solo a la del código.

3. **A ya está completamente validado de extremo a extremo** (Preview real, endpoint OG real contra staging, build log confirmando Node 22.x y `sharp@0.35.3`) — no depende de ningún paso adicional de preparación. B, en cambio, exige repetir el preflight completo y verificar un backup **inmediatamente antes** de ejecutar, sin importar cuándo se decida hacerlo. No hay ninguna ventaja de "preparación" en invertir el orden: B necesitará ese trabajo de verificación fresco se haga cuando se haga.

4. **Severidad práctica ya documentada de cada hallazgo original:** el CVE de `sharp`/libvips afecta a una función aislada sin acceso a datos sensibles (`02_reporte_seguridad.md`, impacto de H-01: "DoS o corrupción de memoria del proceso Node que sirve `/og/convocatorias/[slug]`, función aislada y sin acceso a datos sensibles"), mientras que H-02 (resuelto por el Bloque B) toca directamente el modelo de permisos de escritura de datos de participación ciudadana. Esto podría argumentarse en sentido contrario (B es más urgente por severidad) — se señala aquí explícitamente como el trade-off: este plan prioriza A primero por gestión de riesgo operativo (menor blast radius, rollback trivial, ya validado), no porque su severidad de seguridad sea mayor que la de B. Si la urgencia percibida de cerrar H-02 pesara más que el argumento operativo, invertir el orden es una decisión de producto válida — este documento la deja explícita para que se tome conscientemente, no por defecto.

---

## Plan de incidente

Aplica a cualquier incidente detectado durante o después de la promoción de A o de B (por separado — un incidente de A no activa el rollback de B y viceversa).

- **Responsable de la decisión GO/NO-GO:** la persona con autoridad de despliegue que da la aprobación explícita de B.3.7 (para B) o que aprueba el merge/deploy de A.3.3-4 (para A). No es una decisión que un agente automatizado tome por sí solo en ningún punto de este plan.
- **Responsable de ejecutar el rollback:** quien detecta o recibe primero la señal de rollback (A.8/B.8) ejecuta el procedimiento correspondiente (A.9/B.9) de inmediato — no espera confirmación adicional para el rollback de tráfico (Instant Rollback de Vercel en A, o iniciar el runbook en B); sí coordina con el responsable de GO/NO-GO antes de cualquier paso irreversible (p. ej. restaurar desde backup).
- **Cómo registrar el incidente:** un nuevo documento en `/seguridad` (numeración siguiente, p. ej. `18_incidente_<bloque>_<fecha>.md`) con: qué señal disparó el rollback, hora exacta, qué comprobación POST falló, qué procedimiento de rollback se ejecutó, resultado de la comprobación posterior al rollback, y causa raíz si se conoce en el momento. Se documenta **incluso si el rollback tuvo éxito y el impacto fue mínimo** — no solo los incidentes graves.
- **Cuándo activar una ventana de mantenimiento:** solo si el rollback de tráfico/Instant Rollback (A) o el rollback SQL versionado (B) no resuelven el problema y hace falta restaurar desde backup/PITR (Runbook, apartado E) — esa restauración sí puede requerir cortar temporalmente el tráfico de escritura para evitar pérdida de datos posteriores al punto de restauración.
- **Cómo comunicar una interrupción si afectara a usuarios:** si hay impacto visible (páginas caídas, funciones de participación no disponibles), aviso breve en el canal/medio que CONVOCA use habitualmente para comunicación operativa, indicando: qué está afectado, desde cuándo, y que se está revirtiendo — sin exponer detalles técnicos sensibles (nombres de tablas, funciones o cadenas de conexión) en la comunicación pública.

---

## Apéndice — Runbook rápido

Referencia de acción rápida durante un incidente. **A y B se mantienen totalmente independientes también aquí:** un runbook de A nunca incluye pasos de B y viceversa.

**A. Rollback inmediato de Vercel (Bloque A):**
```
vercel rollback
```
o promover explícitamente el deployment de producción anterior conocido desde el dashboard/CLI. Sin tocar `main`, sin tocar Supabase.

**B. Identificación inequívoca del proyecto Supabase (antes de cualquier acción del Bloque B):**
```sql
select current_database(), current_setting('cluster_name', true);
```
y `supabase link`/`supabase projects list` mostrando el `project-ref` activo. Confirmar `ihwzbdaeggvkzwevozra` (producción) vs `hapxitzmmifuddvbfphc` (staging) carácter a carácter antes de cualquier otro paso del runbook de B.

**C. Ejecución del preflight (Bloque B):**
```
psql <connection-string-produccion> -f seguridad/07_preflight_produccion.sql
```
(o el equivalente vía SQL Editor de solo lectura) — secciones 1 a 9, especialmente §3 y §8, antes de decidir cualquier acción sobre B.

**D. Ejecución del rollback de `0042` (Bloque B):**
Versionar el SQL de B.9 como una nueva migración (p. ej. `0043_rollback_0042.sql`), `supabase migration list` para confirmar el estado antes, `supabase db push --dry-run` para confirmar que solo esa migración de rollback está pendiente, aprobación humana, `supabase db push`, `supabase migration list` de nuevo para confirmar `LOCAL`+`REMOTE`. Mismo mecanismo que la aplicación original — nunca una sesión SQL manual, ni siquiera en una emergencia, salvo que `supabase db push` esté indisponible (ver E).

**E. Restauración desde backup — último recurso (Bloque B):**
Si D no resuelve el problema (corrupción de datos, o `supabase db push` inutilizable): restaurar desde el PITR (`restore point` anotado en B.3-BACKUP) o desde el backup lógico verificado, coordinando ventana de mantenimiento (Plan de incidente, arriba). Acción de mayor impacto de todo este plan — requiere aprobación explícita del responsable de GO/NO-GO, nunca se ejecuta unilateralmente.

**F. Criterios para pedir ayuda / abortar:**
- Cualquier paso de este runbook produce un resultado no descrito aquí (comportamiento inesperado del CLI, discrepancia de datos no prevista en B.5-LEGACY): **detenerse y pedir ayuda humana antes de continuar** — no improvisar un comando nuevo no revisado sobre producción.
- Si el rollback de A o B no confirma éxito en la comprobación posterior correspondiente (A.10/B.10): no reintentar automáticamente el mismo rollback más de una vez — escalar.
- Si en cualquier momento no se puede confirmar con certeza a qué proyecto de Supabase (staging/producción) se está conectado: abortar toda acción hasta confirmarlo (apartado B de este runbook).

---

## Estado final de este documento

**PLAN CANDIDATO — NO EJECUTADO.**

Ningún comando de este plan se ha ejecutado: no hay merge a `main`, no hay `vercel deploy --prod`, no hay `supabase db push`, no se ha tocado ninguna variable de entorno ni configuración de Vercel/Supabase. El rollback SQL del Bloque B (B.9) está completo y sin placeholders, lo cual desbloquea la precondición técnica para considerar B ejecutable — **pero B no queda aprobado para ejecución por ello.** La aprobación real de B depende de que, en el momento de actuar, la captura en vivo de B.4 (permisos efectivos, `pg_get_functiondef`, diagnóstico H-02, `dry-run` de migraciones) confirme exactamente lo aquí documentado. A y B siguen siendo promovibles y reversibles de forma completamente independiente entre sí.
