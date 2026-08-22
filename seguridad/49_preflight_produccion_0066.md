# 49 — Preflight de producción para 0066 (solo lectura / preparación)

**Estado: SOLO VERIFICACIÓN Y PREPARACIÓN. `0066` NO se ha aplicado a producción — no se ha ejecutado ningún `db push` ni ninguna escritura contra producción en esta fase.** `main` en `d361324`, PR #47 ya mergeado.

---

## 0. Estado de `main`

- Rama `main`, `main == origin/main` (`d361324`), working tree limpio salvo el propio artefacto de esta fase (`supabase/ops/0066_rollback.sql`, nuevo, sin seguimiento hasta este PR).
- `d361324` = merge de PR #47 (`feat/proposal-sources`), 4 archivos: `src/lib/components/pulso/ProposalSourcesPanel.svelte`, `src/lib/components/pulso/TopicMethodologyBlock.svelte`, `src/lib/services/proposalSourcesService.ts`, `supabase/migrations/0066_proposal_sources.sql`. Ninguna colateral inesperada.
- `0066_proposal_sources.sql` presente en `supabase/migrations/`, es la única migración nueva desde `0065` (sin huecos en la numeración local).

**CI del PR #47 — hallazgo:** `check-lint-test` terminó en **FAILURE** (`Prettier and ESLint on PR diff`, run `32551469562`), pese a que el PR se fusionó. Causa exacta: `ProposalSourcesPanel.svelte` tiene formato pendiente de Prettier (`warn ... Code style issues found in the above file. Run Prettier with --write to fix`), no un error de ESLint ni de tests. Los 11 jobs restantes (incluidos `migrations-structure`, `migrations-cleanroom`, `migrations-rls`, `secrets-diff`, `build-reproducible`) están en `SUCCESS`. **No bloquea esta promoción** — es un defecto cosmético en un archivo `.svelte` del frontend, ajeno por completo al SQL de `0066`; se deja registrado como deuda a corregir aparte (`pnpm exec prettier --write src/lib/components/pulso/ProposalSourcesPanel.svelte`), no como parte de esta fase.

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

- El PR #46 (migración `0065`) declaró explícitamente en su propia descripción *"validado en staging y producción"*.
- El PR #47 (migración `0066`) declara solo *"Migración aplicada primero en `convoca-staging`"* — sin mencionar producción en ningún punto.
- No existe en el repositorio (ramas, commits, `seguridad/`) ningún documento de "resultados de promoción" para `0066`, a diferencia del patrón ya usado para `0044` (`seguridad/47`).
- La página pública sembrada por `0066` (`/pulso/soluciones/vivienda-plan-vivienda-2036`) no muestra el panel de fuentes propositivas en el HTML servido — dato no concluyente por sí solo (el panel carga los datos en cliente tras hidratar, así que un `curl` nunca lo mostraría, tenga o no la migración aplicada), pero consistente con "todavía no aplicada".

**Conclusión con la evidencia disponible: `0066` probablemente sigue pendiente en producción.** Debe confirmarse con `migration list --linked` antes de aplicar nada (paso T1 de la sección 10).

---

## 3. Revisión del SQL de 0066

`supabase/migrations/0066_proposal_sources.sql` (SHA-256 `a0ff4a0d6f983ae491c33dfdf491e3588df42b913a7079538fe4547748e902c3`), ya revisado línea a línea al fusionar el PR #47. Resumen de lo verificado:

| Punto | Resultado |
|---|---|
| Transaccional (`begin`/`commit`) | Sí |
| Tablas nuevas | `proposal_actors`, `topic_proposal_inputs` — ninguna tabla existente se altera |
| Dependencias (`public.topics`, `public.topic_measures`, `public.is_moderator_or_admin()`) | Ya existen desde `0027` y `0001`/`0052` — sin dependencia rota |
| RLS | Habilitado en ambas tablas |
| `REVOKE ALL` antes de `GRANT` explícito | Sí, de `public, anon, authenticated` en ambas |
| Autorización real de escritura | Vía política (`is_moderator_or_admin()`), no vía el `GRANT` (que es amplio a `authenticated` pero queda acotado por RLS) — mismo patrón que el resto del esquema |
| Política de lectura de `topic_proposal_inputs` | Público solo si `is_published` + tema en `('open','reviewed')` + actor `is_published`; staff ve todo — mismo patrón que las tablas hermanas de `public_spending_*` |
| Seed | 1 actor (`atenea-centro-estudios`) + 1 propuesta (`decomposing`, `measure_id = null`), con `on conflict` idempotente en el actor y `not exists` idempotente en la propuesta — **re-ejecutar la migración no duplicaría filas** |
| Formato de `slug`/`figure_id` | `check` con regex, igual que en `0065` |

Sin hallazgos nuevos respecto a la revisión ya hecha al fusionar el PR.

---

## 4. Rollback — creado en esta fase

`0066` se fusionó **sin** `supabase/ops/0066_rollback.sql` (a diferencia de `0065`, que sí lo incluyó en el mismo PR). Se ha creado ahora, seguido el mismo patrón:

```sql
begin;
drop table if exists public.topic_proposal_inputs;
drop table if exists public.proposal_actors;
commit;
```

- `topic_proposal_inputs` se elimina antes que `proposal_actors` por la FK `actor_id ... on delete restrict`.
- Políticas, triggers (`..._set_updated_at`) y grants de ambas tablas se eliminan automáticamente al hacer `DROP TABLE` — no hace falta revertirlos a mano.
- No hay ninguna columna añadida a tablas existentes que revertir (a diferencia de `0065`, que sí tocaba `public_spending_investigations`).
- SHA-256 del rollback: `f37d80e65f8278acbc3f004c3c65bc13a3fc68613f5babbaadf4619706122284`.

**No probado en round-trip contra una base real** (no hay entorno desechable/staging accesible en esta sesión) — a diferencia de `seguridad/44`, que sí validó el rollback de `0044` en un entorno propio antes del preflight. Recomendado antes de promover: aplicar `0066` + el rollback en `convoca-staging` y confirmar que el esquema vuelve exactamente al estado previo.

---

## 5. Impacto / compatibilidad

**A (app actual + DB sin `0066`) → B (app actual + DB con `0066`): compatible en ambas direcciones, sin ventana incompatible.**

- El frontend de `ProposalSourcesPanel.svelte` ya está desplegado en producción desde el merge del PR #47 (Vercel autodeploy, confirmado). Su carga es asíncrona (`onMount`) y con `try/catch`: si las tablas no existen todavía, la consulta falla, se registra en consola (`console.error`), `proposals` queda `[]`, y el panel **no se renderiza** (`{#if loaded && proposals.length > 0}`). Cero errores visibles para el usuario, ninguna página rota.
- `0066` no modifica ninguna tabla ni función preexistente — no hay ningún contrato roto para el resto de la app.
- Aplicar `0066` no requiere ningún deploy de frontend adicional: el código que lo consume ya está en producción esperando a que las tablas existan.

**No se ha encontrado ninguna incompatibilidad.**

---

## 6. Riesgo residual conocido

- El `cast` en `proposalSourcesService.ts` (`supabase as unknown as SupabaseClient`) evita el chequeo de tipos del cliente Supabase para este servicio, porque `database.types.ts` aún no incluye `proposal_actors`/`topic_proposal_inputs`. No es un riesgo de seguridad (RLS es la barrera real), pero sí de mantenibilidad: un cambio de columna en `0066` o una futura migración relacionada no se detectaría en tiempo de compilación en este archivo. Recomendado: regenerar el snapshot de tipos después de promover `0066` y quitar el cast.
- El defecto de formato de la sección 0 (`ProposalSourcesPanel.svelte`) queda pendiente, independiente de esta promoción.

---

## 7. Backup PRE-0066

**No realizado en esta fase** — requiere el mismo acceso de solo lectura a producción que no está disponible en este entorno (sección 1). Debe hacerse como primer paso de ejecución real (T2 de la sección 10), igual que `seguridad/46` §5 para `0044`.

---

## 8. Plan exacto de promoción (NO ejecutado en esta fase)

Solo ejecutable por alguien con la sesión de la CLI de Supabase autenticada contra el proyecto de producción (o el dashboard de Supabase). Pasos, en orden:

| Paso | Contenido |
|---|---|
| T1 | `supabase migration list --linked` → confirmar que `0066` es la única pendiente (`local == remote` hasta `0065`); `db push --linked --dry-run` → confirmar que solo mostraría `0066_proposal_sources.sql` |
| T2 | Backup schema-only PRE-0066: `supabase db dump --linked --schema public -f <ruta fuera del repo>`; verificar no vacío, 0 filas de datos (`COPY`/`INSERT`), permisos `600`/`700`, guardar SHA-256 |
| T3 | Confirmar estado PRE-0066 de los objetos: `to_regclass('public.proposal_actors')` y `to_regclass('public.topic_proposal_inputs')` → deben ser `NULL` |
| T4 | Aplicar: `supabase db push --linked` |
| T5 | Gates post-DB: `migration list` → `66/66`; `db push --dry-run` → vacío; ambas tablas con RLS `rowsecurity = true`; ACL de ambas sin `PUBLIC` (revisar `\dp`); 4 políticas por tabla (`select`, `insert`, `update`, `delete`) presentes; seed presente (`select * from proposal_actors where slug = 'atenea-centro-estudios'` → 1 fila; `topic_proposal_inputs` con `audit_status = 'decomposing'` para ese actor → 1 fila) |
| T6 | Smoke funcional: `GET /pulso/soluciones/vivienda-plan-vivienda-2036` en el navegador (no solo `curl`, porque el panel es client-side) → debe aparecer la sección "Fuentes propositivas" con el informe de ATENEA; confirmar además `select` como rol `anon` vía la API pública devuelve esa fila y ninguna no publicada |
| T7 | Observabilidad: `inspect db locks` / `blocking` / `long-running-queries` tras T4-T6 → deben quedar vacíos; páginas públicas críticas en `200` |
| — | Si algo falla en T4–T6: `psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/0066_rollback.sql` |

Al ejecutarse, documentar los resultados reales en un `seguridad/50_resultados_promocion_0066_produccion.md` nuevo, siguiendo el mismo formato que `seguridad/47`.

---

## 9. Estado final de esta fase

| Verificación | Resultado |
|---|---|
| `main == origin/main`, working tree limpio salvo este PR | Sí |
| SQL de `0066` revisado sin hallazgos nuevos | Sí |
| Rollback de `0066` creado | Sí (`supabase/ops/0066_rollback.sql`) — no probado en round-trip |
| Gates estructurales locales (`security:baseline`) | 13/13 PASS, incluido el rollback nuevo |
| CI del PR #47 | 11/12 PASS; 1 FAILURE cosmético (Prettier), no relacionado con el SQL, no bloqueante |
| Acceso de solo lectura a producción | **No disponible en este entorno** — bloquea T1–T7 de la sección 8 |
| `0066` aplicada a producción | **No** |

**No-GO por falta de acceso, no por ningún hallazgo del propio `0066`.** El plan de ejecución (sección 8) queda listo para quien tenga la sesión de Supabase autenticada contra producción.
