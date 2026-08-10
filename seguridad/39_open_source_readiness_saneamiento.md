# 39 — Open Source Readiness: saneamiento pre-publicación (OSR-2)

**Estado: rama `chore/open-source-readiness`, aún no fusionada. El repositorio sigue PRIVATE. No se ha cambiado visibilidad, no se ha reescrito historial, no se ha hecho force-push, no se ha tocado Supabase/Vercel real, no se ha creado ninguna migración nueva.**

Continúa `seguridad/38_open_source_readiness_audit.md` (OSR-1), que dejó la auditoría cerrada con una lista concreta de bloqueadores. Este documento reporta la ejecución del saneamiento sobre esa lista, **incluyendo hallazgos adicionales localizados durante la propia ejecución** que `38` no había cubierto.

**Nota de este documento:** por diseño, no reproduce ningún identificador de infraestructura real (project-refs de Supabase, IDs de deployment de Vercel, nombres de organización, contraseñas históricas) — ni siquiera para explicar que fueron eliminados. Donde `38` sí los citaba como evidencia, esta ronda de saneamiento los ha sustituido por marcadores neutros directamente en `38`.

---

## 1. Decisiones del propietario (recordatorio, ya aplicadas)

1. Licencia: **AGPL-3.0-only**.
2. Email personal en el historial de git: se conserva, sin reescritura de historial.
3. Mención al auditor externo contratado: generalizada a "auditoría externa de seguridad" en todos los documentos que se publican.
4. `SECURITY.md`: diseñado para GitHub Private Vulnerability Reporting, activable una vez el repositorio sea público. Sin email personal como canal obligatorio.
5. `CONTRIBUTING.md`: tratado como recomendable, no como bloqueador de seguridad.
6. GitHub Security remoto (Push Protection, branch protection, Dependabot): diferido al gate final de apertura — no se activa en esta fase.
7. No se ha cambiado la visibilidad del repositorio en ningún momento de esta fase.

---

## 2. Documentos sanitizados

### 2.1 En el alcance original de OSR-2

| Documento | Tratamiento |
|---|---|
| `MIGRACION-PRODUCCION.md` | Project-ref de producción, rutas locales del equipo, y la contraseña histórica del sistema mock de demo (5 apariciones) redactadas; narrativa y metodología (hallazgo de bundling con Rollup, técnica de verificación por build+grep) preservadas íntegras. Añadida una nota de vigencia: el sistema mock que motivó ese hallazgo ya no existe en el código actual (verificado por `grep`, cero resultados). |
| `seguridad/34_resultados_privacidad_0043_staging.md` | Project-refs de staging/producción, nombre de proyecto Vercel, patrones de email de prueba generalizados |
| `seguridad/36_plan_promocion_privacidad_0043.md` | Project-refs, IDs de deployment, organización de Vercel, URLs de deployment redactados |
| `seguridad/37_resultados_promocion_privacidad_0043.md` | Mismo tratamiento que `36` |
| `seguridad/08_migracion_candidata_0042.sql` | Solo cabecera: de "candidata, no ejecutar" a "histórico, ya aplicada" — **cuerpo SQL sin modificar** (confirmado en la auditoría de diff, §5) |

### 2.2 Hallazgo adicional durante el segundo secret scan (fuera del alcance original)

El segundo secret scan (§3) hizo una búsqueda dirigida de los identificadores ya redactados en los documentos anteriores, no solo un escaneo genérico de patrones de secretos. Esa búsqueda dirigida encontró que los mismos identificadores **también aparecían, sin redactar, en documentos que la auditoría OSR-1 no había marcado**:

| Documento/archivo | Qué contenía | Origen |
|---|---|---|
| `seguridad/15_analisis_alcanzabilidad_cookie.md` | Un ID de deployment de Vercel | Ya trackeado en `main` antes de esta fase |
| `seguridad/16_smoke_test_og_preview.md` | Una URL de deployment con el nombre de la organización de Vercel | Ya trackeado en `main` antes de esta fase |
| `seguridad/17_plan_promocion_produccion.md` | Ambos project-refs (producción/staging) e IDs de deployment | Ya trackeado en `main` antes de esta fase |
| `seguridad/21_open_source_readiness_plan.md` | Menciones nominales al auditor externo | Ya trackeado en `main` antes de esta fase |
| `seguridad/38_open_source_readiness_audit.md` | Ambos project-refs, nombre de organización de Vercel, la contraseña histórica de demo en claro, y menciones nominales al auditor externo — todo ello citado como **evidencia dentro del propio informe de auditoría** | Creado en esta sesión (OSR-1), comiteado por primera vez como parte de esta misma rama |
| `src/lib/supabase/database.types.ts` | El project-ref de producción, en un comentario de cabecera (archivo generado, no manual) | Ya trackeado en `main` antes de esta fase |

Los seis se sanitizaron con la misma técnica ya aplicada en 2.1 (sustitución de identificadores literales, generalización de la mención al auditor externo, preservando el resto de la narrativa). El caso de `seguridad/38` es el más relevante: al ser el propio informe de auditoría, citaba los valores reales como evidencia de "qué documento contiene qué" — se sustituyeron por los mismos marcadores neutros sin perder el argumento del hallazgo.

**Lectura de este hallazgo:** OSR-1 clasificó documentos por su contenido temático (los que hablaban de la promoción de `0043`), no por una búsqueda exhaustiva de cada identificador de infraestructura a través de todo el árbol trackeado. Ese método dejó fuera documentos de fases anteriores (`15`, `16`, `17`, `21`) que mencionaban los mismos identificadores de pasada, y el propio informe de auditoría (`38`), que los citaba como evidencia. El saneamiento de esta fase corrige ambos.

---

## 3. Segundo secret scan (tras todas las modificaciones)

- `gitleaks detect` sobre el historial completo alcanzable desde `HEAD` de esta rama: **110 commits escaneados, 0 leaks**.
- `gitleaks protect` sobre los cambios sin comitear (working tree vs. `HEAD`): **0 leaks**.
- `gitleaks detect --no-git` sobre el árbol de trabajo completo (incluye archivos no trackeados fuera del alcance de esta rama): 7 hallazgos, los siete en `.env`, `.env.oauth`, `.env.local`, `.env.staging.secrets` — confirmado que los cuatro están sin trackear y correctamente listados en `.gitignore`. Ninguno pertenece a esta rama ni se publicaría con ella.
- Búsqueda dirigida (no genérica) de cada identificador ya redactado en 2.1: cero apariciones restantes en el árbol trackeado — resultado que llevó al hallazgo de §2.2, ya corregido.

---

## 4. Verificación final de licencias

- `LICENSE`: texto verificado byte a byte idéntico al AGPL-3.0 canónico (`https://www.gnu.org/licenses/agpl-3.0.txt`, obtenido con `curl` directo, no reprocesado).
- `package.json`: campo `"license": "AGPL-3.0-only"` presente y coherente con `LICENSE`.
- `THIRD_PARTY_LICENSES.md`: documenta MapLibre GL JS v6.1.0 (BSD-3-Clause, texto íntegro copiado de `node_modules/maplibre-gl/LICENSE.txt`, incluidas las sub-atribuciones a Mapbox/glfx.js/d3-color) y las fuentes vendorizadas vía `pnpm` (OFL-1.1).
- Las 6 dependencias directas de producción se re-verificaron individualmente contra su propio `package.json`: `@fontsource-variable/inter` (OFL-1.1), `@fontsource-variable/space-grotesk` (OFL-1.1), `@lucide/svelte` (ISC), `@supabase/supabase-js` (MIT), `@vercel/og` (**MPL-2.0** — copyleft a nivel de archivo, no permisiva), `maplibre-gl` (BSD-3-Clause). Las licencias de las dependencias directas fueron revisadas y no se identificó una incompatibilidad que impida distribuir el código propio de CONVOCA bajo AGPL-3.0-only.

---

## 5. Auditoría del diff final

23 archivos modificados respecto a `main`, 2662 inserciones / 60 eliminaciones. Clasificación completa:

| Categoría | Archivos |
|---|---|
| Licencia | `LICENSE`, `THIRD_PARTY_LICENSES.md`, `package.json` |
| Documentación | `README.md` (reescritura completa), `docs/ARCHITECTURE.md` (nuevo, incluye una corrección tras el clean-room — ver §6) |
| Community health | `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml` |
| Saneamiento (identificadores/vigencia) | `.env.production.example`, `MIGRACION-PRODUCCION.md`, `seguridad/08`, `seguridad/15`, `seguridad/16`, `seguridad/17`, `seguridad/21`, `seguridad/34`, `seguridad/36`, `seguridad/37`, `src/lib/supabase/database.types.ts` |
| Documentación (informe de auditoría, sanitizado en esta misma fase) | `seguridad/38_open_source_readiness_audit.md` |

**Verificado explícitamente:**
- Cero archivos bajo `supabase/` en el diff — ninguna migración nueva, ningún cambio a una migración existente.
- Cero archivos bajo `src/` en el diff salvo `src/lib/supabase/database.types.ts`, cuyo único cambio es un comentario de cabecera (archivo generado, no manual) — sin ningún cambio de comportamiento.
- Cero cambios en `supabase/functions/`.
- No apareció ningún cambio funcional accidental en ningún momento de esta fase.

---

## 6. Clean-room test (ejecutado, real)

Clonado externo simulado de la rama `chore/open-source-readiness` en un directorio temporal fuera del repositorio de trabajo:

1. **Higiene**: confirmado que `.env`, `.env.staging.secrets`, `node_modules`, `.svelte-kit`, `.vercel` están ausentes del clon (correctamente ignorados); `.vscode/` trackeado contiene solo recomendaciones de editor, sin nada sensible.
2. **Instalación**: `pnpm install --frozen-lockfile` — limpia.
3. **Tests**: `pnpm test` — **129/129 PASS**.
4. **Security Baseline P0**: `pnpm security:baseline` — **PASS completo**, incluidos los jobs `cleanroom`/`rls-cleanroom`, que verifican de forma independiente que las 43 migraciones se aplican limpiamente vía el mecanismo de shadow-diff del CLI de Supabase.
5. **Stack local completo**: `supabase init` + `supabase start` sobre el clon — **las 43 migraciones (`0001`→`0043`) se aplicaron desde cero sin errores**. Esquema verificado directamente por SQL: **47/47 tablas públicas con RLS activado, 43 funciones, 93 policies, 48 triggers, 2 vistas** — coherente con el esquema esperado tras `0043`.
6. **Aplicación real contra ese stack local**: `vite dev` arrancado contra la URL/clave del stack local. Las 15 rutas de nivel superior de `src/routes/` respondieron con éxito (`/`, `/login`, `/registro`, `/descubrir`, `/pulso` y sus 3 subrutas, `/aceptar-condiciones`, `/crear`, `/cuenta`, `/organizador`, `/moderacion`, `/recuperar-cuenta` → todas `200`; `/convocatorias` y `/legal` → `404` esperado, son rutas sin índice propio, solo con subrutas dinámicas).
7. **Hallazgo real durante este paso, diagnosticado y resuelto**: `/descubrir` y `/pulso` devolvieron inicialmente `500` (`permission denied for table events`). Causa raíz: el bootstrap de privilegios por defecto de `supabase start` (CLI local) solo otorga privilegios completos a `anon`/`authenticated` sobre las tablas creadas por el rol `supabase_admin` (las internas de la plataforma), no sobre las tablas creadas por las migraciones de usuario (ejecutadas como `postgres`) — verificado directamente vía `pg_default_acl`. **Esto no es un defecto de CONVOCA**: un proyecto real de Supabase Cloud (el camino que documenta el propio `README.md`, `supabase link` + `db push` contra un proyecto propio) recibe ese bootstrap de privilegios automáticamente al crear el proyecto, algo que el emulador local `supabase start` no replica. Confirmado aplicando manualmente el `GRANT` estándar que Supabase Cloud aplica por defecto: ambas rutas pasaron a `200` sin ningún cambio de código. **Ninguna migración ni código de la aplicación se modificó para llegar a este resultado.**

   **Nota de alcance:** ni `README.md` ni `CONTRIBUTING.md` documentan `supabase start` como camino de instalación soportado — ambos instruyen `supabase link --project-ref <ref>` + `supabase db push` contra un proyecto Supabase propio real, que no tiene esta limitación (ver más arriba). Esta particularidad solo afecta a quien, más allá del flujo documentado, decida levantar un stack local puramente con el CLI (como hizo este propio clean-room). Se deja constancia aquí, no en `README.md`, para no añadir un camino de instalación que el proyecto no respalda activamente.

   Si alguien reproduce este escenario y encuentra `permission denied for table events` (o cualquier otra tabla) contra su propio `supabase start` local: es exactamente este hallazgo, no una migración rota. Solución, contra ese mismo proyecto **local** únicamente — nunca contra staging o producción reales, y sin usar ninguna credencial de `.env.staging.secrets` ni de producción:
   ```sql
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
   GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
   ```
   Ejecutado vía `psql` contra la base de datos local (`postgresql://postgres:postgres@127.0.0.1:54322/postgres` con los valores por defecto de `supabase start`) — no requiere tocar ninguna infraestructura real de CONVOCA.
8. **Corrección documental derivada**: este mismo clean-room reveló que `docs/ARCHITECTURE.md` (escrito en la fase anterior de OSR-2, antes de ejecutar el clean-room) afirmaba incorrectamente `ssr = false` como regla general. El código real tiene `ssr = true` (reactivado deliberadamente, según el propio comentario de `+layout.ts`, para SEO y previsualizaciones sociales) sin sesión de servidor. Corregido en `docs/ARCHITECTURE.md` antes de esta entrega.
9. **Desmontaje**: proceso `vite dev` terminado, `supabase stop` ejecutado (contenedores Docker parados), directorio temporal del clon eliminado. No queda ningún proceso, contenedor ni archivo residual de esta prueba.

---

## 7. Build/test/baseline final (rama real de trabajo, no el clon)

- `pnpm install --frozen-lockfile` — limpio.
- `pnpm test` — **129/129 PASS**.
- `pnpm build` — build de producción completo sin errores (los únicos avisos son advertencias estándar y esperadas de dependencias opcionales de plataforma de `sharp`/`@opentelemetry`, no relacionadas con este saneamiento).
- `pnpm security:baseline` — **PASS completo, 12/12 jobs** (`migrations-structure`, `cleanroom`, `rls-cleanroom`, `security-definer`, `using-true`, `session-architecture`, `edge-functions`, `storage`, `install`, `build`, `dependencies`, `secrets`).
- `pnpm audit --prod` — sin advisories HIGH/CRITICAL. Las advertencias HIGH del audit completo (no `--prod`) son de dependencias de build-tooling ya cubiertas por la excepción registrada `build-tooling-no-path-to-bundle` (revisión programada antes de 2026-11-09) — sin cambios respecto al estado ya conocido.

---

## 8. Riesgos y decisiones diferidas (sin cambios respecto a lo ya decidido)

- **GitHub Security remoto** (Push Protection, branch protection, Dependabot): activación manual, diferida al día de apertura real del repositorio — no forma parte de esta fase.
- **Pinning de GitHub Actions de terceros a SHA** (`actions/checkout@v5`, etc.): mejora recomendada, no bloqueante, ya identificada en OSR-1 (§20) y sin cambios — se mantiene como mejora futura, no como bloqueador de esta fase.
- **Licencia específica de contenido no-código, provenance commit↔deployment, parametrización de marca**: diferidas explícitamente por el propietario, fuera de alcance de OSR-2.

---

## 9. Tabla de reevaluación de bloqueadores (OSR-1 → OSR-2)

Bloqueadores identificados en la tabla maestra de `38` (§20), reevaluados tras el saneamiento:

### PRE-PUBLICACIÓN (deben estar resueltos antes de fusionar/publicar)

| Bloqueador (OSR-1) | Estado OSR-1 | Estado OSR-2 |
|---|---|---|
| `MIGRACION-PRODUCCION.md` — project-ref + mención al auditor + sección de mock obsoleta | FIX | **PASS** — redactado, nota de vigencia añadida |
| `seguridad/34`/`36`/`37` — project-refs/deployment IDs | FIX | **PASS** — redactado |
| `seguridad/08` — etiquetado como "candidata" | FIX | **PASS** — cabecera actualizada, cuerpo SQL sin tocar |
| `static/vendor/` MapLibre sin aviso de licencia | FIX | **PASS** — `THIRD_PARTY_LICENSES.md` |
| README genérico | FIX | **PASS** — reescrito |
| LICENSE / SECURITY.md / CONTRIBUTING.md ausentes | FIX | **PASS** — los 3 creados |
| CODE_OF_CONDUCT.md / plantillas issue-PR | FIX (BAJA, no bloqueante) | **PASS** — creados |
| Prueba clean-room real nunca ejecutada | FIX (ALTA) | **PASS** — ejecutada de extremo a extremo, incluido un hallazgo real diagnosticado (ver §6) |
| *(nuevo, no en `38`)* Identificadores de infraestructura en `seguridad/15`/`16`/`17`/`21`/`38` y `database.types.ts` | — | **PASS** — encontrado y corregido en esta misma fase (ver §2.2) |

### NO BLOQUEANTE (mejora recomendada, no impide publicar)

| Ítem | Estado OSR-1 | Estado OSR-2 |
|---|---|---|
| Pinning de GitHub Actions de terceros a SHA | FIX (BAJA) | **Sin cambios** — deferred, mejora futura recomendada |

### ACCIONES DEL MOMENTO DE HACER PÚBLICO (no son bloqueadores de esta fase; se ejecutan cuando se decida abrir el repositorio)

| Ítem | Nota |
|---|---|
| GitHub Security remoto (Push Protection, branch protection, Dependabot) | Solo se puede/debe activar en el momento de abrir el repositorio — no es una tarea pendiente de esta fase, es la siguiente fase por diseño |
| GitHub Private Vulnerability Reporting (canal declarado en `SECURITY.md`) | No puede estar activo mientras el repositorio es PRIVATE — esto **no cuenta como fallo**, es la condición esperada; se activa junto con la visibilidad pública |
| Cambio de visibilidad del repositorio | Explícitamente fuera de alcance de esta fase, por instrucción directa |

**Todos los bloqueadores PRE-PUBLICACIÓN de OSR-1 están en PASS. No queda ningún bloqueador pendiente para fusionar esta rama.** Lo único que queda abierto son acciones que, por diseño, solo tienen sentido en el momento de hacer público el repositorio.

---

## Resultado

Saneamiento ejecutado y verificado empíricamente en cada punto (no asumido): secret scan formal dos veces (árbol + historial completo + working tree), clean-room real de extremo a extremo con las 43 migraciones aplicadas desde cero y la aplicación sirviendo las 15 rutas reales contra ese entorno, licencias verificadas archivo por archivo, diff final auditado y clasificado sin ningún cambio funcional de producto. Un hallazgo adicional (identificadores de infraestructura en documentos fuera del alcance original de OSR-2, incluido el propio informe de auditoría) se localizó y corrigió dentro de esta misma fase.

**OPEN SOURCE READINESS — PR LISTO PARA REVISIÓN**
