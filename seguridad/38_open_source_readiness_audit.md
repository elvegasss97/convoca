# 38 — Auditoría Open Source Readiness (OSR-1)

**Estado: SOLO AUDITORÍA. El repositorio sigue PRIVATE. No se ha hecho público nada, no se ha reescrito historia, no se ha tocado Supabase/Vercel/CI, no se ha modificado código ni configuración remota.**

Esta auditoría **no repite desde cero** `seguridad/21_open_source_readiness_plan.md` (2026-08-07, 508 líneas, sin trackear) — lo usa como base, verifica qué ha cambiado desde entonces (mucho: Bloque B cerrado, Security Baseline P0 implementada con CI real, parche de privacidad `0043` diseñado/aplicado a producción, 6 documentos nuevos en `/seguridad`, scripts/CI reales que no existían) y **ejecuta por primera vez el escaneo formal de historial completo** que `21` dejaba explícitamente pendiente. Donde `21` ya investigó algo con rigor y nada ha cambiado, se cita su hallazgo en vez de repetir el comando.

---

## 0. Estado base

| | |
|---|---|
| Rama actual | `main` |
| HEAD | `681fa554774cf33eadd3fe752d07f09e53d65a4b` |
| `main == origin/main` | Sí |
| `git status` (tracked) | Limpio |
| Visibilidad del repositorio | **PRIVATE** (confirmado vía `gh repo view`) |
| Security Baseline P0 | Presente y verde en CI real (workflow `security-baseline.yml`) |
| `0043` en `main` | Sí (aplicada también a producción, ver `seguridad/37`) |
| Archivos tracked | 301 |
| Archivos untracked (sesión actual) | 34 — mayoritariamente documentos de fases anteriores de `/seguridad` no comiteados deliberadamente (ver `feedback_convoca_autodeploy` y el patrón ya establecido en toda esta auditoría: documentos de diseño/revisión se quedan locales hasta que la fase cierra) |
| Ramas locales | 15 (incluye 4 creadas en esta sesión: `fix/privacy-prelaunch-0043`, `fix/security-baseline-pr-head-override`, más `fix/migrations-clean-room-reproducibility`, `fix/security-migration-0042` de sesiones anteriores) |
| Ramas remotas | 12 |
| Tags | 0 |
| Tamaño `.git` | 15 MB |
| Tamaño repo (sin `node_modules`) | 57 MB |

No se ha añadido ningún untracked ajeno a esta auditoría (solo se ha escrito este archivo).

---

## 1. Mapa del repositorio (actualizado sobre `21` §3)

| Grupo | Contenido | ¿Debe ser público? | ¿Puede? | Excluir | Motivo |
|---|---|---|---|---|---|
| A. Código de aplicación (`src/`) | SvelteKit completo | Sí | Sí | No | Sin secretos, todo vía `PUBLIC_*` (reconfirmado) |
| B. Supabase/migraciones (`supabase/migrations/`, 43 archivos) | DDL completo, `0001`-`0043` | Sí | Sí | No | Sin datos horneados; `0043` ya validada en staging y producción reales |
| C. Edge Functions (`supabase/functions/delete-account`) | 1 función | Sí | Sí | No | Secreto vía `Deno.env`, nunca hardcodeado |
| D. GitHub Actions (`.github/workflows/`, 2 workflows) | CI real, no existía en `21` | Sí | Sí | No | Ver §14 — ya es fork-safe por diseño |
| E. Scripts de seguridad (`scripts/security/`, 9 scripts + 2 libs + 1 test) | No existía como categoría en `21` | Sí | Sí | No | Es, literalmente, el argumento de transparencia más fuerte del proyecto — controles reales, no solo diseño |
| F. Documentación pública potencial (`docs/*` propuesto) | No existe todavía | — | — | — | Gap, no bloqueador — ver §12 |
| G. Documentación interna (`/seguridad`, 38 documentos) | Mixta | Ver §4 (tabla ampliada) | — | — | — |
| H. `MIGRACION-PRODUCCION.md` (raíz) | 522 líneas | Tras revisión | Sí | No | Ver §4 — hallazgos de `21` siguen vigentes, uno de ellos ahora describe código **ya eliminado** |
| I. Configuración local (`.env*`, `.vercel/`, `.supabase/`) | — | No | No | Sí (ya excluidos) | Correctamente en `.gitignore`; `.vercel/project.json` está trackeado y **no** contiene secretos (solo `projectId`/`orgId`, identificadores no secretos) |
| J. Fixtures/tests | `*.test.ts` (código), sin fixtures de datos | Sí (los tests) | Sí | No | Ninguna base de datos/semilla de contenido real versionada |
| K. Assets/imágenes (`static/`) | Iconos, `static/vendor/` (MapLibre), `static/vision/*.webp`, descargas | Tras revisión de licencias | Mayoría sí | `static/vendor/` condicionado | Ver §11 — gap de atribución de MapLibre sigue sin resolver |
| L. Backups/snapshots | Ninguno en el repo | N/A | N/A | N/A | Los backups de `0043` (`seguridad/36`/`37`) se guardaron **fuera** del repo deliberadamente |
| M. Archivos generados (`.svelte-kit/`, `build/`, `.vercel/output/`) | Presentes localmente | No | No | Sí (ya ignorados salvo `.vercel/output` — ver hallazgo) | Ver hallazgo below |
| N. Temporales/scratchpad de esta sesión | Fuera del repo (`/tmp/...`) | No | No | N/A | Nunca estuvieron en el árbol del repo |
| O. Documentos nuevos `seguridad/32`-`38` | 6 nuevos desde `21` | Ver §4 | — | — | Nunca clasificados hasta ahora |

**Hallazgo nuevo (M):** `.vercel/output/` existe localmente (creado por el `vercel deploy` de la fase de promoción de `0043`) y **no está en `.gitignore`** explícitamente por nombre — sí lo cubre el patrón genérico `.output`/`.vercel` de la línea 4 del `.gitignore` actual (`.vercel` cubre el directorio completo `.vercel/`, incluido `output/` dentro). Confirmado con `git status --short`: no aparece como untracked-a-punto-de-trackear ni como tracked. **No es un hallazgo real, solo se deja constancia de que se comprobó explícitamente.**

---

## 2. Secret scan — árbol actual (HEAD)

- **Security Baseline P0 real, `secrets-diff` (gitleaks sobre el diff)**: PASS en el último run de `main` (`31378390004`).
- **`secrets-full-history` (gitleaks, historial completo, job semanal)**: configurado, `if: github.event_name == 'schedule'` — no se ha disparado nunca todavía por horario en este repo (el job existe y es correcto, pero no hay un run histórico que citar).
- **Ejecutado ahora mismo, manualmente, el mismo mecanismo que ese job programado** (ver §3 — es el mismo comando).
- **Inspección manual adicional del árbol actual** (más allá de gitleaks): sin tokens/API keys/claves privadas/connection strings con credenciales/cookies/secretos OAuth hardcodeados. `.vercel/project.json` (trackeado) contiene `projectId`/`orgId` — **identificadores, no secretos** (no permiten ninguna acción sin una sesión de Vercel autenticada aparte).

**Distinción aplicada, no automática:**
- **SECRETO** (ninguno encontrado en el árbol actual): valor que por sí solo concede acceso.
- **IDENTIFICADOR PÚBLICO/NO SECRETO** (`convoca.cloud`, `projectId` de Vercel, project-refs de Supabase citados en documentación): identifican un recurso, no conceden acceso por sí solos.
- **INFORMACIÓN OPERACIONAL SENSIBLE** (IDs de deployment concretos, project-ref de *staging* específicamente, nombres de organización de Vercel): no son secretos, pero facilitan reconocimiento/targeting innecesario — tratamiento recomendado: redactar antes de publicar (igual que `21` ya recomendaba para los documentos 11-13/17).

---

## 3. Secret scan — historial Git completo (CRÍTICO)

**Ejecutado formalmente en esta auditoría** (pendiente en `21`, que solo tenía una verificación preliminar):

```
gitleaks detect --source . --config .gitleaks.toml --redact --no-banner --log-opts=--all --exit-code 0
→ 109 commits scanned
→ no leaks found
```

**Verificación independiente adicional** (pickaxe sobre patrones específicos, cubriendo también todo el trabajo nuevo de esta sesión que `21` no pudo ver): `sbp_`, `SERVICE_ROLE_KEY`, `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`, `PGPASSWORD`, `cli_login_postgres`, `STAGING_DB_PASSWORD`, `postgresql://postgres`, un JWT de ejemplo — **cada aparición verificada individualmente**: todas son o bien el nombre de la regla/variable dentro de `.gitleaks.toml`/documentación legítima, o conexiones locales desechables deliberadamente inalcanzables (`127.0.0.1:1`) usadas por los propios scripts de la Security Baseline. **Cero valores reales.**

- `.env`/`.env.local`/`.env.oauth`/`.env.staging.secrets`/`.env.production*` — **nunca añadidos en ningún commit de ningún branch** (confirmado, `git log --all --diff-filter=A`).
- **Archivos borrados históricamente** (`git log --all --diff-filter=D`, 18 archivos borrados en total en toda la vida del repo): **ninguno** coincide con patrones sensibles (`.env`, `.pem`, `secret`, `dump`, `backup`, `.vscode`, `.idea`, `credential`, `password`, `.key`).
- **Blobs no alcanzables** (`git fsck --unreachable`): existen (5 blobs, varios commits/trees) — **inspeccionados uno a uno**, son exactamente los fixtures temporales de las pruebas negativas de la propia Security Baseline (`test_definer_inseguro`, `test_sin_rls`, `test_policy_publica`, un `hooks.server.ts` de prueba) más un resto de mi propia demostración del bugfix de `override.mjs` en esta sesión — todos creados deliberadamente como "commit temporal + reset inmediato", exactamente la metodología que `seguridad/30` ya documenta. **Cero contenido sensible.** Se garbage-collectarán solos con el tiempo; no es necesario ni se ha ejecutado ningún `git gc --prune` en esta auditoría (sería una modificación, fuera de alcance de "solo lectura").
- **Metadatos de commits — email personal:** confirmado, presente en el historial completo (`git log --all --format=%ae`, dos identidades: la dirección `noreply` de GitHub y una dirección personal real, no reproducida aquí). Mismo hallazgo que `21` ya documentaba — sigue siendo una **decisión pendiente**, no un secreto técnico (§21.9 de `21`, repetido como decisión aquí en §"Decisiones del propietario").

**Veredicto de este gate: PASS. Sin secretos actuales ni históricos.** No se activa el NO-GO condicional de la instrucción.

---

## 4. Información interna/operacional — `/seguridad` completo (ampliación de `21` §6)

Los documentos `00`-`22` mantienen exactamente la clasificación de `21` (no repetida línea por línea aquí — ver ese documento). **Cambios de estado y documentos nuevos:**

| Archivo | Clasificación | Motivo |
|---|---|---|
| `08_migracion_candidata_0042.sql` | **Ya no es "candidata"** — `0042` está aplicada y validada en producción. Actualizar el propio archivo (quitar "CANDIDATA — NO EJECUTAR") antes de publicar, o añadir una nota de que quedó superseded por el historial real de `supabase/migrations/`. | Publicable, con esta actualización menor |
| `23_modelo_privacidad_participacion.md`, `24_analisis_kimi_privacidad_participacion.md` | **A — íntegro** | Análisis de modelo de amenazas de privacidad, mismo principio que `19` — es el argumento de transparencia, no un riesgo |
| `25_pre_b_produccion_resultados.md`, `26_plan_reconciliacion_migraciones.md`, `27_diagnostico_reproducibilidad_migraciones.md`, `28_plan_saneamiento_0040_0041.md` | **A — íntegro** | Diagnóstico y reconciliación de un problema real de tracking de migraciones, ya resuelto — ejemplo concreto de disciplina operacional, refuerza credibilidad |
| `30_security_baseline_p0_implementacion.md` | **A — íntegro** | Documenta la propia implementación real de la Security Baseline, incluidas las 11/11 pruebas negativas — máxima transparencia posible |
| `31_privacidad_participacion_plan_final.md`, `32_plan_implementacion_privacidad_prelaunch.md` | **A — íntegro** | Diseño de `0043`, sin secretos |
| `33_rollback_0043.sql` | **A — íntegro** | SQL de rollback, sin datos ni secretos |
| `34_resultados_privacidad_0043_staging.md` | **B — sanitizar** | Cita `<ref-proyecto-staging>` (project-ref de staging) y patrones de email de prueba (`test0043_*@example.com`, ya sintéticos, sin riesgo real, pero mejor generalizar) |
| `35_bugfix_override_pr_head.md` | **A — íntegro** | Documenta un bug real del propio CI y su fix — ejemplo de auto-corrección, mismo principio que `20`/`22` |
| `36_plan_promocion_privacidad_0043.md` | **B — sanitizar** | Cita ambos project-refs, IDs de deployment de Vercel (`dpl_...`), org `<org-vercel>`, hash SHA-256 de backups (el hash en sí es inocuo, pero redactar los identificadores de infraestructura) |
| `37_resultados_promocion_privacidad_0043.md` | **B — sanitizar** | Mismo motivo que `36` — IDs de deployment concretos, project-refs, horas exactas de una promoción real a producción |
| `38_open_source_readiness_audit.md` (este) | **A — íntegro, una vez ejecutado el saneamiento que describe** | Documentar el propio proceso de auditoría, coherente con `21` §23 |

**`MIGRACION-PRODUCCION.md` (raíz) — hallazgo actualizado respecto a `21`:** la sección de "Cuentas de demostración" que `21` marcó como categoría B (contraseña de demostración en claro) **describe un sistema de mock (`DEMO_ACCOUNTS`/`DEMO_PASSWORD` en `authService.ts`) que ya no existe en el código actual** — verificado, `grep` sin resultados. El documento sigue citando el project-ref de producción y al auditor externo por nombre, igual que antes. **Recomendación actualizada:** no es solo "sanitizar", el documento necesita una revisión de vigencia completa — partes describen un estado del proyecto que ya no es el actual (mock de auth eliminado), y publicarlo tal cual sin esa aclaración sería confuso para un lector externo, más que un riesgo de seguridad puro.

---

## 5. Archivos `.env` y configuración

Sin cambios respecto a `21`: `.env.example`, `.env.production.example`, `.env.staging.example`, `.env.test` — los 4 verificados de nuevo, ninguno con valores reales, siguen siendo publicables tal cual. `.env.staging.secrets` (con credenciales reales de staging, usado extensamente en esta sesión) **correctamente ignorado por `.gitignore`** (`.env*` con excepciones explícitas para los `.example`/`.test`) y **confirmado, de nuevo, que nunca se ha commiteado** (§3).

---

## 6. `.gitignore` / artefactos

Patrón actual (`node_modules`, `.output`, `.vercel`, `.netlify`, `.wrangler`, `/.svelte-kit`, `/build`, `.DS_Store`, `Thumbs.db`, `.env*` con excepciones, `.gstack/`, `supabase/.temp/`) — **cubre correctamente** todo lo que la instrucción pedía revisar: backups, dumps, logs, coverage, build, node_modules, credenciales locales. No se encontró ningún patrón de riesgo de publicación accidental. Sin capturas de pantalla ni archivos de agentes/scratchpads versionados (verificado: nada bajo `.claude/` está trackeado, aparece correctamente como untracked en `git status`).

**No se modifica nada en esta fase**, tal como exige la instrucción — el `.gitignore` actual ya es adecuado, no requiere cambios antes de publicar.

---

## 7. Datos / fixtures / contenido ciudadano

**Sin cambios respecto a `21`, reconfirmado:** ningún fixture de datos, ningún seed de contenido real, ningún export/dump versionado. Los datos de participación ciudadana viven exclusivamente en Supabase (staging/producción), nunca en el repositorio — arquitectónicamente separados. Los backups reales tomados durante la promoción de `0043` (`seguridad/37`) se guardaron deliberadamente **fuera** del repositorio. **Sin datos ciudadanos privados en Git — confirmado, no NO-GO.**

---

## 8. Historial de archivos borrados

Cubierto en §3 — 18 archivos borrados en toda la historia, ninguno sensible. No recuperable ningún secreto desde el historial.

---

## 9. Licencia del proyecto

Sin cambios respecto a `21`: no existe `LICENSE`, campo `license` ausente en `package.json`. Comparativa MIT/Apache-2.0/GPLv3/AGPLv3 ya desarrollada en `21` §10 con recomendación razonada (AGPLv3 si prioriza que las mejoras vuelvan a la comunidad incluso en despliegues como servicio; MIT si prioriza adopción institucional rápida) — **sigue siendo decisión del propietario, no se elige aquí.**

---

## 10. Licencias de dependencias

**Ejecutado en esta auditoría** (no estaba hecho en `21`): 6 dependencias de producción directas —

| Paquete | Licencia |
|---|---|
| `@supabase/supabase-js` | MIT |
| `@vercel/og` | MPL-2.0 |
| `maplibre-gl` | BSD-3-Clause |
| `@lucide/svelte` | ISC |
| `@fontsource-variable/inter` | OFL-1.1 |
| `@fontsource-variable/space-grotesk` | OFL-1.1 |

**Sin GPL/AGPL/SSPL/BUSL/Commons Clause/licencias custom.** MPL-2.0 es copyleft débil a nivel de archivo (no obliga a licenciar el resto del proyecto) — compatible con cualquiera de las 4 licencias candidatas para CONVOCA. **Sin incompatibilidades.** Dependencias de dev/build (ESLint, Prettier, Vite, Tailwind, TypeScript, Vitest) no auditadas exhaustivamente en esta pasada — riesgo bajo dado que no se redistribuyen como parte del producto, recomendable pero no bloqueante.

---

## 11. Assets y propiedad intelectual

**Sin cambios respecto a `21`:** `static/vendor/maplibre-gl-shared.mjs` y `maplibre-gl-worker.mjs` (BSD-3-Clause, MapLibre GL JS) **siguen sin ningún archivo de licencia/aviso de copyright acompañándolos** — confirmado, `find` sin resultados. Gap de atribución real, sencillo de resolver (añadir el aviso BSD-3-Clause junto a los archivos, o un `THIRD_PARTY_LICENSES.md`), no resuelto todavía. Resto de assets (`static/icons/`, `static/vision/*.webp`, descargas de Sanidad) sin cambios — sin datos personales, origen propio del proyecto.

---

## 12. README / documentación de arranque — gap analysis

**Sin cambios respecto a `21`:** `README.md` (42 líneas) sigue siendo el scaffold genérico de `sv`, sin mencionar CONVOCA. Falta por completo: qué es el proyecto, arquitectura, requisitos, instalación, variables de entorno necesarias, desarrollo local, cómo aplicar migraciones contra un Supabase propio, build, tests, cómo funciona la Security Baseline, estructura de migraciones, y cómo desplegar sin acceso a la infraestructura privada de CONVOCA. Diseño completo ya propuesto en `21` §8 — no escrito todavía, tal como exige esta fase.

---

## 13. Community health

| Archivo | Estado | Clasificación |
|---|---|---|
| `README.md` | Existe, pero es scaffold genérico | **OBLIGATORIO ANTES DE PUBLICAR** |
| `LICENSE` | No existe | **OBLIGATORIO ANTES DE PUBLICAR** |
| `SECURITY.md` | No existe | **OBLIGATORIO ANTES DE PUBLICAR** — debe indicar canal privado de reporte, nunca Issues públicos |
| `CONTRIBUTING.md` | No existe | **RECOMENDADO** (degradable a inmediatamente después, per `21` GATE 7) |
| `CODE_OF_CONDUCT.md` | No existe | **RECOMENDADO** |
| Issue templates | No existen | **RECOMENDADO** |
| PR template | No existe | **RECOMENDADO** |
| `SUPPORT.md` | No existe | **OPCIONAL** |

---

## 14. GitHub Actions en repositorio público — análisis nuevo (no existía CI cuando se escribió `21`)

**Ambos workflows reales auditados directamente, no en abstracto:**

| Workflow | Eventos | `pull_request_target` | `secrets.*` usados | `permissions:` | Seguro para forks |
|---|---|---|---|---|---|
| `security-baseline.yml` | `pull_request` (rama base `main`), `push` (`main`), `schedule` | **No** — usa la variante segura `pull_request` | **Ninguno** (0 referencias a `secrets.` en todo el archivo) | `contents: read` (mínimo, explícito) | **Sí** |
| `security-smoke-availability.yml` | `push` (`main`), `workflow_dispatch`, `schedule` | No aplica — **no corre en `pull_request` en absoluto** | **Ninguno** | `contents: read` | **Sí, por diseño — nunca se ejecuta sobre un PR** |

**Conclusión: ambos workflows son ya seguros para PRs de forks, sin necesitar ningún cambio.** No hay riesgo de "pwn request" (ningún `pull_request_target` combinado con checkout de código no confiable), no hay secretos que un PR malicioso pudiera intentar exfiltrar, y los permisos del `GITHUB_TOKEN` implícito ya son de solo lectura. Las acciones de terceros usadas (`actions/checkout@v5`, `pnpm/action-setup@v4`, `actions/setup-node@v5`, `actions/upload-artifact@v4`) son de editores de máxima confianza (GitHub oficial o casi), referenciadas por tag de versión mayor, no por SHA — **mejora de robustez de cadena de suministro recomendable pero no bloqueante** (pinning a SHA exacto), dado el bajo riesgo real de estos publishers concretos.

---

## 15. Security Baseline como proyecto open source

- **Completamente pública y reutilizable:** los 9 scripts (`check-*.mjs`) + 2 libs (`diff.mjs`, `override.mjs`) — no dependen de ninguna credencial de CONVOCA, corren contra réplicas Docker desechables o contra el propio árbol de archivos.
- **Específico de CONVOCA pero sin ser un problema:** los manifests (`security-baseline/manifests/*.json`) inventarían objetos concretos de este proyecto (buckets, policies `using(true)`, triggers críticos) — un fork tendría que adaptar estos inventarios a su propio esquema si diverge, pero el mecanismo en sí es genérico.
- **Nunca requiere infraestructura privada:** confirmado (§14) — ningún job de `security-baseline.yml` usa `secrets.*`, ninguno necesita acceso a Supabase/Vercel reales. Un fork sin ninguna credencial configurada puede ejecutar la baseline completa contra sus propias réplicas Docker locales.
- **No falla por ausencia de credenciales de fork** — la baseline no fallaría "porque le falta un secreto", es estructuralmente incapaz de necesitarlo.

**Conclusión: la Security Baseline P0, tal como está hoy, ya cumple el estándar que esta sección pedía verificar.**

---

## 16. Referencias a infraestructura — barrido completo

| Patrón | Dónde aparece | Clasificación |
|---|---|---|
| `convoca.cloud` | README propuesto, documentación, ya público | **PÚBLICO INOCUO** |
| `<ref-proyecto-producción>` (project-ref producción) | `MIGRACION-PRODUCCION.md`, varios `/seguridad` (`07`, `11`-`13`, `17`, `34`, `36`, `37`) | **SENSIBLE** — no es secreto por sí solo, pero facilita reconocimiento/targeting; redactar (mismo criterio que `21` ya aplicaba) |
| `<ref-proyecto-staging>` (project-ref staging) | Mismos documentos, más `34`/`36`/`37` | **SENSIBLE**, mismo tratamiento |
| IDs de deployment de Vercel (`dpl_...`) | `36`, `37` | **SENSIBLE** — identifican deployments concretos, redactar |
| `<org-vercel>` (org de Vercel) | `36`, `37` | **DOCUMENTACIÓN INTERNA INNECESARIA** — sin riesgo real pero sin valor para un lector externo |
| Rutas locales `/home/elias/...` | Ninguna encontrada en los documentos nuevos (verificado, §16 del barrido) | — |
| Emails | Ninguno en documentos; el email personal del autor solo en metadatos de commit (§3) | **SENSIBLE** (metadatos, no contenido) |
| UUIDs de rondas/eventos/concerns citados en pruebas | `34`, `37` | **PÚBLICO INOCUO** — son identificadores de contenido público o de fixtures ya eliminados, no permiten ninguna acción |

No se ha borrado ni redactado nada — es clasificación, tal como exige la instrucción.

---

## 17. Dependencias y build reproducible

Ya verificado exhaustivamente y repetidamente a lo largo de toda esta sesión (no repetido aquí en detalle): `pnpm-lock.yaml` presente y publicable (deliberadamente, `21` §3 ya lo argumenta), `pnpm install --frozen-lockfile` y `pnpm build` PASS reales en CI (`build-reproducible`), `pnpm test` 129/129, Security Baseline P0 completa PASS, `pnpm audit --prod` sin advisories HIGH/CRITICAL. **Build reproducible, confirmado repetidamente con evidencia real de CI, no solo localmente.**

---

## 18. API/backend para terceros — clon sin infraestructura real

Confirmado en `21` §16 y sin cambios: cero URLs/IDs de infraestructura hardcodeados en `src/` — todo vía `PUBLIC_*`. Dependencias implícitas de infraestructura externa identificadas: Supabase (proyecto propio necesario), Google OAuth (configuración de proveedor en el propio Supabase Auth del fork, no en el repo), Vercel (opcional, cualquier host de SvelteKit serviría). **Ninguna dependencia de un servicio exclusivo de CONVOCA** (sin backend propietario adicional, sin llamadas a APIs internas no documentadas).

**Gap sin cambios respecto a `21`, y sigue siendo P0:** la prueba real de extremo a extremo (`clone → variables propias → Supabase propio → migraciones → install → build/run`) **todavía no se ha ejecutado nunca**, ni en esta sesión ni en la anterior. Es una inferencia de lectura de código, no una prueba ejecutada — `21` ya lo clasificó correctamente como P0, no P1, y sigue sin resolverse.

---

## 19. Plan de división público/privado

Con toda la evidencia de esta auditoría, que refuerza la de `21`: **Estrategia A — publicar el repositorio actual tras saneamiento.**

No hay ningún hallazgo que empuje hacia B (repo público limpio nuevo) — el historial completo está limpio de secretos (§3, ahora verificado formalmente, no solo preliminar), y el valor de transparencia de conservar el historial real (incluidas las correcciones de seguridad ya hechas, las auto-correcciones ante Kimi, el propio proceso de implementación de la Security Baseline) es coherente con el principio ya fijado en `21` §23. C (dividir público/privado) añadiría complejidad de mantenimiento sin un motivo concreto — no hay ningún componente que deba quedar estructuralmente privado más allá de credenciales (que nunca han estado en el repo) y algunos documentos puntuales a redactar (§4).

---

## 20. Gate de visibilidad — condiciones objetivas PRIVATE → PUBLIC

| Condición | Estado |
|---|---|
| Secret scan árbol actual | **PASS** |
| Secret scan historia completa | **PASS** (ejecutado formalmente en esta auditoría) |
| Cero datos ciudadanos privados | **PASS** |
| Assets licenciables | **FIX** (aviso de MapLibre pendiente) |
| Licencia decidida | **DECISIÓN** (propietario) |
| Workflows seguros para forks | **PASS** (ya lo son) |
| Plantillas `.env` limpias | **PASS** |
| Documentación mínima | **FIX** (README/LICENSE/SECURITY.md/CONTRIBUTING.md) |
| Archivos internos clasificados | **PASS** (esta auditoría + `21`) — pendiente ejecutar el saneamiento de los marcados B |
| Build reproducible | **PASS** |
| Security Baseline funcional en contexto público | **PASS** |
| Prueba clean-room real ejecutada | **FIX** — nunca ejecutada |
| GitHub Security activada (Push Protection, branch protection, Dependabot) | **FIX** — pendiente, activación manual el día de apertura |
| Decisión sobre email personal en historial | **DECISIÓN** (propietario) |
| Decisión sobre mención al auditor externo | **DECISIÓN** (propietario) |
| Decisión sobre *provenance* commit↔deployment | **DECISIÓN** (propietario, no bloqueante) |

---

## Tabla maestra

| Área | Estado | Severidad | Acción antes de publicar |
|---|---|---|---|
| Secretos en árbol actual | PASS | — | Ninguna |
| Secretos en historial completo | PASS | — | Ninguna |
| Datos ciudadanos en el repo | PASS | — | Ninguna |
| Objetos git inalcanzables | PASS (informativo) | INFO | Ninguna — contenido benigno, se autolimpiará |
| Email personal en metadatos de commit | DECISIÓN | MEDIA | Decidir: mantener o reescribir historial |
| `MIGRACION-PRODUCCION.md` — project-ref + mención al auditor externo + sección de mock obsoleta | FIX | ALTA | Sanitizar y actualizar vigencia antes de publicar |
| `seguridad/34`, `36`, `37` — project-refs/deployment IDs | FIX | MEDIA | Redactar identificadores de infraestructura |
| `seguridad/08` — sigue etiquetada "candidata" | FIX | BAJA | Actualizar cabecera, ya está aplicada |
| `static/vendor/` MapLibre sin aviso de licencia | FIX | MEDIA | Añadir aviso BSD-3-Clause |
| Licencia del proyecto no decidida | DECISIÓN | ALTA | Decisión del propietario (§9/§10 de `21`) |
| Licencias de dependencias | PASS | — | Ninguna — sin incompatibilidades |
| README genérico | FIX | ALTA | Reescribir (diseño ya en `21` §8) |
| LICENSE / SECURITY.md / CONTRIBUTING.md ausentes | FIX | ALTA (LICENSE/SECURITY) / MEDIA (CONTRIBUTING) | Escribir los 3 |
| CODE_OF_CONDUCT.md / plantillas issue-PR | FIX | BAJA | Recomendado, no bloqueante |
| GitHub Actions — seguridad para forks | PASS | — | Ninguna, ya son seguros |
| Pinning de Actions de terceros a SHA | FIX | BAJA | Mejora recomendada, no bloqueante |
| Security Baseline reutilizable sin infraestructura privada | PASS | — | Ninguna |
| Prueba clean-room real (clon externo) | FIX | ALTA | Ejecutarla al menos una vez, documentar el resultado |
| GitHub Security (Push Protection, branch protection, Dependabot) | FIX | ALTA | Activación manual el día de apertura |
| Deployment provenance commit↔deployment | DECISIÓN | BAJA | No bloquea — decidir y comunicar |
| Marca "CONVOCA" / política de uso del nombre | DECISIÓN | BAJA | No bloquea |
| Contenido no-código con licencia propia (CC) | DECISIÓN | BAJA | No bloquea |

---

## Bloqueadores reales

1. **Ninguno de seguridad técnica** — el árbol y el historial completo están limpios de secretos, sin datos ciudadanos, sin credenciales expuestas.
2. **Documentación mínima ausente** — sin `LICENSE`/`README` real/`SECURITY.md`, publicar hoy no sería "abrir el código", sería dejar una carpeta visible sin contexto ni marco legal.
3. **Prueba clean-room real nunca ejecutada** — no se puede afirmar honestamente "cualquiera puede desplegar su propia instancia" sin haberlo probado al menos una vez.
4. **`MIGRACION-PRODUCCION.md` y 3 documentos nuevos de `/seguridad` sin sanitizar** (project-refs, deployment IDs, mención nominal a un auditor externo).
5. **`static/vendor/` sin aviso de licencia de MapLibre** — gap de compliance simple de resolver.
6. **GitHub Security no activada** — no es automática salvo Secret Scanning; Push Protection/branch protection/Dependabot requieren activación manual el día de apertura.

Ninguno de estos 6 puntos requiere reescribir historia ni rotar credenciales — son documentación, decisiones y una prueba pendiente de ejecutar.

## Mejoras recomendadas (no bloqueadoras)

- Pinning de GitHub Actions de terceros a SHA exacto.
- `CODE_OF_CONDUCT.md`, plantillas de Issue/PR.
- `docs/architecture/`, `docs/development/`, `docs/deployment/`.
- Actualizar la cabecera de `seguridad/08` (ya no es "candidata").
- Auditoría de licencias de dependencias de dev/build (no solo runtime).

## Decisiones del propietario

1. Licencia definitiva del código (MIT / Apache-2.0 / GPLv3 / AGPLv3) — recomendación en `21` §10: AGPLv3 si prioriza que las mejoras vuelvan a la comunidad, MIT si prioriza adopción rápida.
2. Email personal en metadatos de 98+ commits — mantener o reescribir historial (solo tras confirmar que es seguro hacerlo, coordinado con force-push a todas las ramas remotas).
3. Canal definitivo de reporte de `SECURITY.md` y expectativas de tiempo de respuesta realistas para un único mantenedor.
4. Mención nominal al auditor externo en `MIGRACION-PRODUCCION.md` — mantener o generalizar.
5. Licencia del contenido no-código (documentos de producto) — misma licencia del repo o una específica tipo Creative Commons.
6. *Provenance* commit↔deployment — reconectar integración Git↔Vercel, publicar SHA desplegado en un endpoint, o aceptar y comunicar la limitación explícitamente.
7. Parametrización del nombre "Convoca" en la UI para forks (P2, no bloqueante).

## Estrategia recomendada

**A — publicar el repositorio actual tras saneamiento**, sin dividir ni crear un repo nuevo. Justificación: historial ya limpio (verificado formalmente), el valor de transparencia de conservar el proceso real (incluidas correcciones de seguridad y auto-revisiones) supera el coste de mantenimiento de una división B/C, y no existe ningún componente que requiera quedar estructuralmente separado más allá de credenciales (que nunca vivieron en el repo).

## Gate final propuesto

- [ ] Secret scan árbol + historial: **ya PASS**, no requiere acción.
- [ ] `MIGRACION-PRODUCCION.md` sanitizado y actualizado de vigencia.
- [ ] `seguridad/34`, `36`, `37` redactados (project-refs/deployment IDs).
- [ ] `seguridad/08` con cabecera actualizada.
- [ ] Aviso BSD-3-Clause añadido junto a `static/vendor/`.
- [ ] Licencia elegida y `LICENSE` añadido.
- [ ] `README.md`, `SECURITY.md`, `CONTRIBUTING.md` escritos con contenido real.
- [ ] Prueba clean-room real ejecutada y documentada con éxito.
- [ ] Secret Scanning confirmado activo, Push Protection de repositorio activada manualmente, branch protection mínima y Dependabot — todo el mismo día de apertura.
- [ ] Decisiones 1-7 de "Decisiones del propietario" resueltas o conscientemente diferidas y comunicadas.

---

## Resultado

- **Hallazgos CRÍTICOS:** 0
- **ALTOS:** 6 (licencia no decidida, README genérico, LICENSE/SECURITY.md ausentes, prueba clean-room no ejecutada, GitHub Security no activada, `MIGRACION-PRODUCCION.md` sin sanitizar)
- **MEDIOS:** 4 (email personal en historial — decisión, 3 documentos nuevos de `/seguridad` sin redactar, aviso MapLibre pendiente, CONTRIBUTING.md ausente)
- **BAJOS:** 5 (cabecera de `seguridad/08`, pinning de Actions a SHA, CODE_OF_CONDUCT/plantillas, marca/nombre, provenance commit↔deployment)
- **INFO:** 1 (objetos git inalcanzables, benignos)

- **Secretos en HEAD:** 0.
- **Secretos históricos:** 0 (escaneo formal completo, todas las ramas, ejecutado en esta auditoría).
- **Datos ciudadanos:** 0.
- **Assets/licencias problemáticos:** 1 (MapLibre, aviso de atribución pendiente — no una incompatibilidad de licencia).
- **Workflows inseguros para forks:** 0 — ambos workflows ya son seguros por diseño.
- **Documentación interna a excluir/redactar:** `MIGRACION-PRODUCCION.md` + `seguridad/34`/`36`/`37` (redactar identificadores) + `seguridad/08` (actualizar vigencia). Ninguno debe **excluirse por completo**.
- **Community health faltante:** `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md` (obligatorios), `CODE_OF_CONDUCT.md` + plantillas (recomendados).
- **Estrategia recomendada:** **A** — publicar el repo actual tras saneamiento.
- **Bloqueadores exactos:** documentación mínima ausente, prueba clean-room no ejecutada, 4 documentos a sanitizar, aviso de MapLibre, GitHub Security sin activar. Cero bloqueadores de secretos o datos.

## OPEN SOURCE READINESS — AUDITORÍA COMPLETA, REQUIERE SANEAMIENTO
