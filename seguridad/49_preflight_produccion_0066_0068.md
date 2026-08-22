# 49 — Preflight de producción para 0066–0068 (solo lectura / preparación)

**Estado: SOLO VERIFICACIÓN Y PREPARACIÓN. `0066`, `0067` y `0068` NO se han aplicado a producción — no se ha ejecutado ningún `db push` ni ninguna escritura contra producción en esta fase.** `main` en `0e7fac2`.

> **Actualización sobre la versión original de este documento:** se escribió inicialmente solo para `0066` (PR #47, `main` en `d361324`). Mientras se preparaba, se fusionaron dos migraciones más sobre el mismo esquema: PR #48 (`0067`, `0068` — FEDEA como segunda fuente propositiva) y PR #50 (arreglo de formato de `ProposalSourcesPanel.svelte`, sin relación con el SQL). Se amplía el alcance a las tres migraciones porque comparten tablas y tiene sentido promoverlas juntas — no hay ninguna razón para aplicar `0066` sin `0067`/`0068`, que son solo datos adicionales sobre el mismo esquema.

---

## 0. Estado de `main`

- Rama `main`, `main == origin/main` (`0e7fac2`), working tree limpio salvo los artefactos de esta fase (`supabase/ops/0066_rollback.sql`, `0067_rollback.sql`, `0068_rollback.sql`, nuevos, sin seguimiento hasta este PR).
- `d361324` = merge de PR #47 (`feat/proposal-sources`): `ProposalSourcesPanel.svelte`, `TopicMethodologyBlock.svelte`, `proposalSourcesService.ts`, `0066_proposal_sources.sql`.
- `8ff356d` = merge de PR #48 (`feat/fedea-housing-proposals`): solo `0067_fedea_housing_proposals.sql` y `0068_fedea_youth_housing_proposals.sql` — sin cambios de frontend, son datos puros sobre las tablas de `0066`.
- `0e7fac2` = merge de PR #50: formato de `ProposalSourcesPanel.svelte`, sin cambios de comportamiento.
- `0066`, `0067`, `0068` presentes en `supabase/migrations/`, consecutivas desde `0065`, sin huecos en la numeración local.

**CI del PR #47 — hallazgo (ya corregido):** `check-lint-test` terminó en **FAILURE** (`Prettier and ESLint on PR diff`, run `32551469562`), pese a que el PR se fusionó. Causa exacta: `ProposalSourcesPanel.svelte` tenía formato pendiente de Prettier, no un error de ESLint ni de tests. Corregido en PR #50 (`pnpm exec prettier --write`), fusionado con los 12/12 checks en verde, incluido `check-lint-test`. `main` ya no arrastra este defecto.

**CI del PR #48 (`0067`/`0068`):** verificado — 11/11 jobs en `SUCCESS` (incluido `check-lint-test`) más el deploy de Vercel. Sin hallazgos.

---

## 1. Acceso a producción

**No disponible en este entorno.** A diferencia de `seguridad/46` (que documentó acceso de solo lectura vía una sesión ya autenticada de la CLI de Supabase), en esta sesión:

- `supabase` (vía `npx`) responde pero **no está autenticado** (`projects list` → `Unauthorized`).
- No existe `supabase/config.toml` ni ningún proyecto enlazado (`supabase link`) en este árbol de trabajo.
- `vercel env pull --environment=production` fue **bloqueado por el clasificador de permisos** del propio entorno (extraería credenciales de producción a disco) — no se ha intentado ningún rodeo.

**Consecuencia:** todo lo que sigue es verificación estática (contra el código en `main` y contra el propio archivo de migración), no una comprobación en vivo del estado real de producción. La sección 10 dice exactamente qué hay que ejecutar, y con qué acceso, para completar lo que aquí no se pudo comprobar.

---

## 2. Estado de migraciones — inferencia sin acceso directo

No se pudo ejecutar `supabase migration list --linked` ni `db push --dry-run` contra producción. Como sustituto, evidencia indirecta:

- El PR #46 (migración `0065`) declaró explícitamente en su propia descripción _"validado en staging y producción"_.
- El PR #47 (`0066`) y el PR #48 (`0067`, `0068`) declaran solo _"Migración(es) aplicada(s) primero en `convoca-staging`"_ — ninguno de los dos menciona producción.
- No existe en el repositorio (ramas, commits, `seguridad/`) ningún documento de "resultados de promoción" para `0066`, `0067` ni `0068`, a diferencia del patrón ya usado para `0044` (`seguridad/47`).
- La página pública sembrada por estas migraciones (`/pulso/soluciones/vivienda-plan-vivienda-2036`) no muestra el panel de fuentes propositivas en el HTML servido — dato no concluyente por sí solo (el panel carga los datos en cliente tras hidratar, así que un `curl` nunca lo mostraría, tenga o no la migración aplicada), pero consistente con "todavía no aplicada".

**Conclusión con la evidencia disponible: `0066`, `0067` y `0068` probablemente siguen pendientes en producción.** Debe confirmarse con `migration list --linked` antes de aplicar nada (paso T1 de la sección 8).

---

## 3. Revisión del SQL de 0066

`supabase/migrations/0066_proposal_sources.sql` (SHA-256 `a0ff4a0d6f983ae491c33dfdf491e3588df42b913a7079538fe4547748e902c3`), ya revisado línea a línea al fusionar el PR #47. Resumen de lo verificado:

| Punto                                                                                     | Resultado                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transaccional (`begin`/`commit`)                                                          | Sí                                                                                                                                                                                                                             |
| Tablas nuevas                                                                             | `proposal_actors`, `topic_proposal_inputs` — ninguna tabla existente se altera                                                                                                                                                 |
| Dependencias (`public.topics`, `public.topic_measures`, `public.is_moderator_or_admin()`) | Ya existen desde `0027` y `0001`/`0052` — sin dependencia rota                                                                                                                                                                 |
| RLS                                                                                       | Habilitado en ambas tablas                                                                                                                                                                                                     |
| `REVOKE ALL` antes de `GRANT` explícito                                                   | Sí, de `public, anon, authenticated` en ambas                                                                                                                                                                                  |
| Autorización real de escritura                                                            | Vía política (`is_moderator_or_admin()`), no vía el `GRANT` (que es amplio a `authenticated` pero queda acotado por RLS) — mismo patrón que el resto del esquema                                                               |
| Política de lectura de `topic_proposal_inputs`                                            | Público solo si `is_published` + tema en `('open','reviewed')` + actor `is_published`; staff ve todo — mismo patrón que las tablas hermanas de `public_spending_*`                                                             |
| Seed                                                                                      | 1 actor (`atenea-centro-estudios`) + 1 propuesta (`decomposing`, `measure_id = null`), con `on conflict` idempotente en el actor y `not exists` idempotente en la propuesta — **re-ejecutar la migración no duplicaría filas** |
| Formato de `slug`/`figure_id`                                                             | `check` con regex, igual que en `0065`                                                                                                                                                                                         |

Sin hallazgos nuevos respecto a la revisión ya hecha al fusionar el PR.

### 0067 / 0068 — FEDEA como segunda fuente propositiva

Ambas son **datos puros, sin DDL**: usan exclusivamente las tablas, políticas y grants que ya crea `0066`. Revisión:

| Punto                                                                                                                               | Resultado                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaccional                                                                                                                       | Sí, ambas                                                                                                                                         |
| `0067` inserta el actor `fedea` (`on conflict (slug) do update` — idempotente) y una propuesta (`decomposing`, `measure_id = null`) | Sí                                                                                                                                                |
| `0068` inserta una segunda propuesta referenciando el actor ya creado por `0067` (no lo vuelve a crear)                             | Sí                                                                                                                                                |
| Idempotencia de las propuestas                                                                                                      | Ambas usan `where not exists (... source_url = '...')` antes de insertar — re-ejecutar no duplica filas                                           |
| Coautoría FEDEA–CGE                                                                                                                 | Declarada explícitamente en `editorial_note` de ambos paquetes, consistente con el criterio editorial ya aplicado a `0066` (inclusión ≠ respaldo) |
| Dependencia de `0067` sobre `0066`                                                                                                  | Correcta — ambas fallarían (FK / tabla inexistente) si se aplicaran sin `0066` primero; el orden numérico ya lo garantiza                         |
| Dependencia de `0068` sobre `0067`                                                                                                  | El `join ... on a.slug = 'fedea'` no encontraría el actor si `0067` no se aplicó antes — mismo orden numérico lo garantiza                        |

Sin hallazgos.

---

## 4. Rollback — creado en esta fase

Ninguna de las tres migraciones se fusionó con su rollback (`0066` en el PR #47, `0067`/`0068` en el PR #48) — a diferencia de `0065`, que sí lo incluyó en el mismo PR. Se han creado los tres ahora, en orden inverso de aplicación:

**`0066_rollback.sql`** — elimina el esquema entero (correcto solo si `0067`/`0068` se revierten primero, o junto con él):

```sql
begin;
drop table if exists public.topic_proposal_inputs;
drop table if exists public.proposal_actors;
commit;
```

`topic_proposal_inputs` antes que `proposal_actors` por la FK `actor_id ... on delete restrict`. Políticas, triggers y grants de ambas tablas se eliminan automáticamente al hacer `DROP TABLE`. Sin columnas añadidas a tablas existentes que revertir. SHA-256: `f37d80e65f8278acbc3f004c3c65bc13a3fc68613f5babbaadf4619706122284`.

**`0067_rollback.sql`** — borra solo la propuesta que insertó (`delete ... where source_url = '.../el-acceso-a-la-vivienda/'`), y el actor `fedea` únicamente si ninguna otra fila lo referencia ya (protege contra borrar el actor mientras `0068` sigue aplicada).

**`0068_rollback.sql`** — borra solo su propia propuesta (`delete ... where source_url = '.../reformas-estructurales-...'`); no toca `proposal_actors`, porque no lo creó.

**Orden correcto para revertir todo:** `0068_rollback.sql` → `0067_rollback.sql` → `0066_rollback.sql` (inverso al de aplicación). Revertir solo `0066` sin antes revertir `0067`/`0068` fallaría (`topic_proposal_inputs` tendría filas de FEDEA que `0066_rollback` no puede borrar por el `on delete restrict` hacia `proposal_actors`... en realidad el `DROP TABLE public.topic_proposal_inputs` sí las arrastra igualmente, así que no falla — pero conviene revertir en orden igualmente, por claridad y para no perder de vista qué se está deshaciendo).

**Ninguno de los tres probado en round-trip contra una base real** (no hay entorno desechable/staging accesible en esta sesión) — a diferencia de `seguridad/44`, que sí validó el rollback de `0044` en un entorno propio antes del preflight. Recomendado antes de promover: aplicar `0066`+`0067`+`0068` y sus tres rollbacks en `convoca-staging`, en ambos órdenes, y confirmar que el esquema vuelve exactamente al estado previo.

---

## 5. Impacto / compatibilidad

**A (app actual + DB sin `0066`–`0068`) → B (app actual + DB con `0066`–`0068`): compatible en ambas direcciones, sin ventana incompatible.**

- El frontend de `ProposalSourcesPanel.svelte` ya está desplegado en producción desde el merge del PR #47 (Vercel autodeploy, confirmado). Su carga es asíncrona (`onMount`) y con `try/catch`: si las tablas no existen todavía, la consulta falla, se registra en consola (`console.error`), `proposals` queda `[]`, y el panel **no se renderiza** (`{#if loaded && proposals.length > 0}`). Cero errores visibles para el usuario, ninguna página rota.
- Ninguna de las tres modifica ninguna tabla ni función preexistente — no hay ningún contrato roto para el resto de la app.
- Aplicar `0066`–`0068` no requiere ningún deploy de frontend adicional: el código que las consume ya está en producción esperando a que las tablas y las filas existan. Aplicar solo `0066` (sin `0067`/`0068`) también sería compatible — simplemente el panel mostraría únicamente la propuesta de ATENEA hasta que se apliquen las otras dos.

**No se ha encontrado ninguna incompatibilidad.**

---

## 6. Riesgo residual conocido

- El `cast` en `proposalSourcesService.ts` (`supabase as unknown as SupabaseClient`) evita el chequeo de tipos del cliente Supabase para este servicio, porque `database.types.ts` aún no incluye `proposal_actors`/`topic_proposal_inputs`. No es un riesgo de seguridad (RLS es la barrera real), pero sí de mantenibilidad: un cambio de columna en `0066`/`0067`/`0068` o una futura migración relacionada no se detectaría en tiempo de compilación en este archivo. Recomendado: regenerar el snapshot de tipos después de promover y quitar el cast.
- El defecto de formato original de `ProposalSourcesPanel.svelte` (sección 0) ya está corregido en `main` — no queda pendiente.

---

## 7. Backup PRE-0066

**No realizado en esta fase** — requiere el mismo acceso de solo lectura a producción que no está disponible en este entorno (sección 1). Debe hacerse como primer paso de ejecución real (T2 de la sección 8), igual que `seguridad/46` §5 para `0044`.

---

## 8. Plan exacto de promoción (NO ejecutado en esta fase)

Solo ejecutable por alguien con la sesión de la CLI de Supabase autenticada contra el proyecto de producción (o el dashboard de Supabase). Las tres migraciones se aplican en una sola tanda (`db push` aplica todas las pendientes en orden); los pasos de verificación cubren las tres. Pasos, en orden:

| Paso | Contenido                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1   | `supabase migration list --linked` → confirmar que `0066`, `0067`, `0068` son las únicas pendientes (`local == remote` hasta `0065`); `db push --linked --dry-run` → confirmar que solo mostraría esas tres, en ese orden                                                                                                                                                                                              |
| T2   | Backup schema-only PRE-0066: `supabase db dump --linked --schema public -f <ruta fuera del repo>`; verificar no vacío, 0 filas de datos (`COPY`/`INSERT`), permisos `600`/`700`, guardar SHA-256                                                                                                                                                                                                                       |
| T3   | Confirmar estado PRE-0066 de los objetos: `to_regclass('public.proposal_actors')` y `to_regclass('public.topic_proposal_inputs')` → deben ser `NULL`                                                                                                                                                                                                                                                                   |
| T4   | Aplicar: `supabase db push --linked` (aplica `0066`, `0067` y `0068` en una sola llamada, en orden)                                                                                                                                                                                                                                                                                                                    |
| T5   | Gates post-DB: `migration list` → `68/68`; `db push --dry-run` → vacío; ambas tablas con RLS `rowsecurity = true`; ACL de ambas sin `PUBLIC` (revisar `\dp`); 4 políticas por tabla (`select`, `insert`, `update`, `delete`) presentes; seed presente — `proposal_actors` con `slug in ('atenea-centro-estudios', 'fedea')` → 2 filas; `topic_proposal_inputs` → 3 filas (`decomposing`, `measure_id = null` las tres) |
| T6   | Smoke funcional: `GET /pulso/soluciones/vivienda-plan-vivienda-2036` en el navegador (no solo `curl`, porque el panel es client-side) → debe aparecer la sección "Fuentes propositivas" con **3** tarjetas (ATENEA + los 2 paquetes de FEDEA); confirmar además `select` como rol `anon` vía la API pública devuelve esas 3 filas y ninguna no publicada                                                               |
| T7   | Observabilidad: `inspect db locks` / `blocking` / `long-running-queries` tras T4-T6 → deben quedar vacíos; páginas públicas críticas en `200`                                                                                                                                                                                                                                                                          |
| —    | Si algo falla en T4–T6: revertir en orden inverso — `0068_rollback.sql`, luego `0067_rollback.sql`, luego `0066_rollback.sql` (o solo los que corresponda si el fallo fue parcial)                                                                                                                                                                                                                                     |

Al ejecutarse, documentar los resultados reales en un `seguridad/50_resultados_promocion_0066_0068_produccion.md` nuevo, siguiendo el mismo formato que `seguridad/47`.

---

## 9. Estado final de esta fase

| Verificación                                             | Resultado                                                                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `main == origin/main`, working tree limpio salvo este PR | Sí                                                                                                              |
| SQL de `0066`, `0067`, `0068` revisado sin hallazgos     | Sí                                                                                                              |
| Rollback de las tres creado                              | Sí (`supabase/ops/0066_rollback.sql`, `0067_rollback.sql`, `0068_rollback.sql`) — ninguno probado en round-trip |
| Gates estructurales locales (`security:baseline`)        | 13/13 PASS                                                                                                      |
| CI del PR #47                                            | Corregido por PR #50 — `main` ya está limpio                                                                    |
| CI del PR #48                                            | 11/11 PASS                                                                                                      |
| Acceso de solo lectura a producción                      | **No disponible en este entorno** — bloquea T1–T7 de la sección 8                                               |
| `0066`/`0067`/`0068` aplicadas a producción              | **No**                                                                                                          |

**No-GO por falta de acceso, no por ningún hallazgo de las propias migraciones.** El plan de ejecución (sección 8) queda listo para quien tenga la sesión de Supabase autenticada contra producción.
