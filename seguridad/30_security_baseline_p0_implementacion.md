# 30 — Security Baseline P0: implementación v1

**Fuente de requisitos:** `seguridad/19_security_baseline_v1_diseno.md` (diseño, revisión 2). Este documento describe la implementación real: qué se construyó, cómo ejecutarlo, cómo interpretar un fallo, y qué queda deliberadamente fuera.

**No se afirma que CONVOCA sea segura.** Security Baseline P0 implementada y verificada según los controles definidos en `seguridad/19`. Reduce la probabilidad de que una regresión sobre garantías ya conocidas pase inadvertida — no elimina el riesgo de vulnerabilidades nuevas ni de errores de diseño no contemplados.

---

## 1. Controles implementados

| Control | Nivel (§1.1 de `19`) | Script/mecanismo | Bloquea en |
|---|---|---|---|
| B1 — tabla nueva sin RLS (texto) | TRIPWIRE | `check-migrations-structure.mjs` | PR/push |
| B1b — tabla sin RLS (DB real) | **GATE**, más fuerte que B1 — ver §3 | `check-rls-cleanroom.mjs` | PR/push |
| B2 — `disable row level security` literal | TRIPWIRE | `check-migrations-structure.mjs` | PR/push |
| B3 — numeración de migraciones | TRIPWIRE | `check-migrations-structure.mjs` | PR/push |
| Gate de migraciones históricas (0001-0042) modificadas | GATE | `check-migrations-structure.mjs` | PR/push |
| B4/B5 — `pnpm install --frozen-lockfile` + `pnpm build` | GARANTÍA VERIFICADA (funcional) | workflow `build-reproducible` | PR/push |
| B8 — `engines.node` presente | TRIPWIRE | workflow `build-reproducible` | PR/push |
| Migraciones clean-room (0001→0042 desde vacío) | GARANTÍA VERIFICADA | `check-cleanroom.mjs` (Supabase CLI 2.113.0) | PR/push |
| RLS sobre la DB clean-room | GATE (demostración real, no texto) | `check-rls-cleanroom.mjs` (Supabase CLI 2.113.0) | PR/push |
| B9 — `SECURITY DEFINER` nuevo/modificado | TRIPWIRE + GATE | `check-security-definer.mjs` | PR/push |
| B9b — triggers críticos (manifest) | TRIPWIRE + GATE | `check-security-definer.mjs` | PR/push |
| B10 — policy `USING(true)`/`WITH CHECK(true)` | TRIPWIRE + GATE | `check-using-true.mjs` | PR/push |
| G-SSR — arquitectura de sesión | TRIPWIRE + GATE | `check-session-architecture.mjs` | PR/push |
| G-SR — Edge Function con `service_role` | TRIPWIRE + GATE | `check-edge-functions.mjs` | PR/push |
| G-STORAGE — bucket/policy de Storage | TRIPWIRE + GATE | `check-storage.mjs` | PR/push |
| B6/W1 — doble auditoría de dependencias | GARANTÍA VERIFICADA + GATE | `check-dependencies.mjs` | PR/push |
| B7 — secretos en el diff | TRIPWIRE | `gitleaks` + `.gitleaks.toml`, solo commits nuevos | PR/push |
| B7 (histórico) — secretos en todo el historial | GARANTÍA VERIFICADA (informe) | `gitleaks`, cron semanal | PERIODIC, no bloquea |
| B11 — smoke test de disponibilidad | GARANTÍA VERIFICADA (acotada a disponibilidad) | `security-smoke-availability.yml` | push a `main`, no en PR (ver §5 limitaciones) |

No se implementó nada de P1/P2 (`P-D0`-`P-D6`, matriz de identidades de §7 de `19`, MFA, etc.) — fuera de alcance de esta fase por instrucción explícita.

---

## 2. Archivos creados

```
.github/workflows/security-baseline.yml
.github/workflows/security-smoke-availability.yml
.gitleaks.toml
scripts/security/lib/diff.mjs
scripts/security/lib/override.mjs
scripts/security/check-migrations-structure.mjs
scripts/security/check-cleanroom.mjs
scripts/security/check-rls-cleanroom.mjs
scripts/security/check-security-definer.mjs
scripts/security/check-using-true.mjs
scripts/security/check-session-architecture.mjs
scripts/security/check-edge-functions.mjs
scripts/security/check-storage.mjs
scripts/security/check-dependencies.mjs
scripts/security/run-all.mjs
security-baseline/manifests/critical-triggers.json
security-baseline/manifests/using-true-policies.json
security-baseline/manifests/edge-functions-service-role.json
security-baseline/manifests/storage-buckets.json
security-baseline/manifests/dependency-exceptions.json
package.json   (+ script "security:baseline")
```

Ningún archivo de `supabase/migrations/`, código de `src/`, configuración de Supabase/Vercel, ni staging se modifica por esta implementación.

---

## 3. Diseño técnico relevante (decisiones no triviales)

- **Migraciones clean-room sin tocar producción/staging:** `check-cleanroom.mjs` ejecuta `supabase@2.113.0 db diff --db-url <destino inalcanzable> --schema public`. El CLI construye siempre el shadow (Docker, todas las migraciones aplicadas en orden) **antes** de intentar conectar al destino de comparación — verificado empíricamente antes de codificarlo: con un destino inalcanzable, las 42 migraciones se aplican igual y el único error es el esperado de conexión al final. Cero credenciales de producción/staging.
- **RLS demostrado contra una DB real, no contra texto:** `check-rls-cleanroom.mjs` usa `supabase@2.113.0 db diff --from <réplica vacía y desechable> --to migrations --schema public`. Se eligió esta vía (en vez de aplicar las migraciones a mano vía `psql` contra un Postgres genérico) porque **se intentó primero la vía directa y falló**: la migración `0006` inserta en `storage.buckets`, tabla que solo existe si el bootstrap completo de plataforma (storage-api, gotrue) se ejecuta — exactamente lo que hace el shadow del CLI y lo que un contenedor Postgres genérico, arrancado a mano, no reproduce. Usar el propio CLI evita reimplementar ese bootstrap de forma no fiable. El diff resultante contiene `ALTER TABLE public.X ... ENABLE ROW LEVEL SECURITY` por cada tabla con RLS — cualquier tabla `CREATE TABLE public.X` sin esa línea emparejada es una tabla sin RLS. No asume 47 tablas: evalúa las que existan de verdad.
- **Detección de "qué es nuevo en este PR":** `scripts/security/lib/diff.mjs` resuelve una base de comparación (`BASE_REF` explícito del workflow → `origin/main` → `HEAD~1`) y expone `added`/`modified` como listas de archivos vía `git diff --name-status`. Todos los checks diff-based (B1/B9/B10/G-SSR/G-SR/G-STORAGE, gate de históricas) comparten este módulo — ninguno reimplementa su propia noción de "nuevo".
- **Mecanismo único de override para todo GATE:** una línea trailer exacta en el mensaje del commit HEAD, `Security-Baseline-Override: <check-id>:<detalle-exacto>` (`scripts/security/lib/override.mjs`). Nunca un archivo de allowlist que crezca sin revisión — cada override queda permanentemente atado a un commit y autor concretos en el historial de git. Un GATE con override sigue imprimiendo el hallazgo (no lo oculta), solo deja de bloquear.
- **Secretos — reglas propias sobre el ruleset por defecto de gitleaks**, no una sustitución: `sbp_[a-f0-9]{40}` (token de Supabase), `SUPABASE_SERVICE_ROLE_KEY` asignada a un JWT real, tokens de Vercel, `postgres://`/`postgresql://` con credenciales embebidas. Verificado contra los 96 commits del historial real del repo (ruleset por defecto + estas reglas): **cero hallazgos** — ninguno de los `.env.example`/`.env.test`/etc. permitidos por `.gitignore` dispara ninguna regla, sin necesidad de allowlistear ningún archivo por ruta.
- **Build reproducible con credenciales ficticias:** `pnpm build` en CI usa los valores exactos de `.env.example` (`PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_PUBLISHABLE_KEY` ficticios), nunca un proyecto real. Confirmado antes de escribir el workflow: `export const prerender = false` en `src/routes/+layout.ts` — el build no hace ninguna llamada de red en tiempo de compilación, así que valores ficticios son suficientes.

---

## 4. Excepciones registradas

### Dependencias (`security-baseline/manifests/dependency-exceptions.json`)

Estado real del repo en el momento de escribir esto (`pnpm audit --prod` / `pnpm audit`):

| Paquete | Severidad | Alcance | Clasificación | Revisar antes de |
|---|---|---|---|---|
| `cookie` | low | solo completo | alcanzabilidad no confirmada — `serialize()`/`cookies.set()` nunca se invoca (ver `seguridad/15_analisis_alcanzabilidad_cookie.md`); reactivado automáticamente por G-SSR si eso cambia | 2026-11-09 |
| `fast-uri` | high | solo completo | tooling de build (eslint), sin ruta al bundle | 2026-11-09 |
| `brace-expansion` (×2 rangos) | high | solo completo | tooling de build (eslint/workbox-build), sin ruta al bundle | 2026-11-09 |
| `nanoid` | high | solo completo | tooling de build, vía `postcss`←`eslint-plugin-svelte`/`vite` (verificado con `pnpm why nanoid`); patrón vulnerable requiere invocar `customAlphabet()`/`customRandom()` con `size=0`, ningún código de CONVOCA lo hace | 2026-11-09 |

`pnpm audit --prod` (runtime real): **0 advisories** en el momento de escribir esto — sin ninguna excepción activa ahí, tal como exige la política (`19` §10: `--prod` nunca debería tener una excepción activa sin que sea, por definición, un hallazgo crítico).

Una excepción que supera su `reviewBy` sin resolverse escala automáticamente a `FAIL` en el siguiente PR que la toque (`check-dependencies.mjs` lo aplica leyendo la fecha, no hace falta ningún paso manual adicional para que se active).

### Otros manifests (inventarios, no "excepciones" en el sentido de dependencias)

- `critical-triggers.json`: `profiles_prevent_role_self_update` (único trigger crítico hoy).
- `using-true-policies.json`: `organizers_select_public`, `next_block_vote_rounds_select_public`.
- `edge-functions-service-role.json`: `delete-account` (única Edge Function con `service_role` hoy).
- `storage-buckets.json`: `verification-documents` (único bucket hoy).

Cada entrada documenta función/policy/bucket exacto y el motivo — nunca una ruta o carpeta completa.

---

## 5. Limitaciones conocidas (declaradas, no ocultas)

- **G-STORAGE solo lee lo versionado en `supabase/migrations/`.** No se conecta a producción/staging para confirmar que el estado real de Storage coincide con lo declarado en las migraciones — eso es `P-D5` (periódico), explícitamente fuera de P0.
- **B11 (smoke de disponibilidad) no corre en cada PR.** Sin integración Git↔Vercel activa, un PR no genera hoy un Preview Deployment fiable — decisión abierta en `19` §8/§17, no resuelta aquí. El smoke test implementado corre contra producción (`https://convoca.cloud`) después de cada push a `main`, más disparo manual y cron diario — mide disponibilidad de un estado ya desplegado, no valida un PR antes de mergear.
- **G-SR usa una heurística para funciones ya inventariadas:** una Edge Function ya conocida (`delete-account`) solo reabre el gate si el diff toca líneas relacionadas con autorización (`service_role`, `createClient`, `auth.`) — no por cualquier cambio de texto. Esto reduce fricción en retoques triviales, a costa de no ser 100% exhaustivo ante un cambio de lógica de autorización que no toque esas palabras clave literalmente.
- **`check-cleanroom.mjs` y `check-rls-cleanroom.mjs` reaplican las 42 migraciones cada uno por separado** (dos arranques de Docker en vez de reutilizar un solo shadow). Redundante en coste de CI, no en corrección — cada check es independientemente válido. Optimización futura, no crítica.
- **B1 (texto) declara su alcance como solo esquema `public`, identificadores `snake_case` sin comillas** — no cubre otros esquemas ni identificadores citados/con mayúsculas (mismo límite ya documentado en `19` §2, Kimi RT-001). El check DB-real (`check-rls-cleanroom.mjs`) no tiene ese límite — cubre toda tabla real de `public` sin importar cómo se escribió la migración, pero sigue limitado al esquema `public`.
- **No existe `supabase/config.toml` en este repo** — los checks que usan el CLI (`db diff`) funcionan sin él (verificado repetidamente), pero significa que comandos convencionales como `supabase start`/`db reset` no están disponibles como alternativa más simple. No se creó uno en esta fase por no ser parte del alcance pedido.
- **Matriz de identidades de `19` §7 (autorización real) no implementada.** El propio diseño ya advierte: B11 prueba disponibilidad, no autorización — el incidente real que casi rompió `0042` (reclasificación de función pública a privada) lo habría detectado la matriz de identidades, no B11. Sigue siendo P1.

---

## 6. Cómo ejecutarlo localmente

```bash
pnpm security:baseline
```

Ejecuta, en orden, los mismos checks que el workflow de CI: estructura de migraciones → clean-room → RLS clean-room → SECURITY DEFINER/triggers → `USING(true)` → arquitectura de sesión → Edge Functions → Storage → build reproducible → dependencias → secretos. Requiere Docker (para clean-room, RLS y `gitleaks`) y red (para `npx supabase@2.113.0`, `pnpm install`, `docker pull` de las imágenes necesarias la primera vez).

Flags:
- `pnpm security:baseline -- --skip-docker` — omite clean-room/RLS/secretos (checks rápidos, sin Docker).
- `pnpm security:baseline -- --skip-build` — omite `pnpm install`/`pnpm build`.

Termina con una de estas dos líneas, siempre:

```
SECURITY BASELINE P0 — PASS
```
```
SECURITY BASELINE P0 — FAIL (check: <nombre-del-check>)
```

Cualquier script individual también se puede ejecutar suelto, p. ej. `node scripts/security/check-using-true.mjs`.

---

## 7. Cómo interpretar un fallo

1. El nombre del check que falló identifica exactamente qué grupo de `19` §15 está implicado (tabla de §1 de este documento).
2. Cada línea `FAIL` explica qué se encontró y, si es un GATE, qué revisar antes de aceptarlo.
3. Si tras la revisión el cambio es legítimo: añade la línea de override exacta que el propio mensaje de `FAIL` indica al mensaje del commit (`Security-Baseline-Override: <check>:<detalle>`), y si corresponde a un inventario (using-true, Storage, Edge Functions, triggers), añade también la entrada al manifest correspondiente en `security-baseline/manifests/`.
4. Un TRIPWIRE nunca se "arregla" solo — su FAIL siempre exige la decisión humana del GATE asociado, no una corrección automática.

---

## 8. Pruebas negativas realizadas

Todas ejecutadas sobre esta misma rama, cada una como commit temporal revertido inmediatamente después (`git reset --hard` al commit de la implementación) — **ninguna quedó en el historial real**. Verificado tras cada una que el árbol de trabajo y el log de git volvían exactamente al estado previo.

| # | Control | Mutación temporal | Resultado esperado | Resultado real |
|---|---|---|---|---|
| 1 | B3 (numeración) | Copia de `0042_...sql` renombrada a `0042_duplicado_test.sql` | FAIL | **FAIL** — "versión duplicada 0042" |
| 2 | B1 (texto, tabla sin RLS) | `CREATE TABLE public.test_sin_rls` sin `ENABLE ROW LEVEL SECURITY` | FAIL | **FAIL** |
| 3 | B1b (RLS, DB real) | Misma tabla que #2, verificada contra el esquema clean-room real | FAIL | **FAIL** — "1 tabla(s) sin RLS habilitada: test_sin_rls" (sobre 48 tablas reconstruidas) |
| 4 | B9 (`SECURITY DEFINER` nuevo) | Función nueva `test_definer_inseguro()` con `security definer` | FAIL | **FAIL** |
| 4b | B9 + override | Misma mutación que #4, con `Security-Baseline-Override: security-definer:test_definer_inseguro` en el commit | WARN, no bloquea | **PASS con WARN** — confirma que el mecanismo de override funciona en ambas direcciones |
| 5 | B10 (`USING(true)`) | Policy nueva `test_policy_publica` con `using (true)`, no inventariada | FAIL | **FAIL** |
| 6 | B7 (secretos) | Archivo con `SUPABASE_ACCESS_TOKEN=sbp_<40 hex reales>` | FAIL (gitleaks) | **FAIL** — 1 leak encontrado |
| 7 | G-SSR (arquitectura de sesión) | `src/hooks.server.ts` nuevo | FAIL | **FAIL** |
| 8 | G-SR (`service_role`) | Edge Function nueva usando `SUPABASE_SERVICE_ROLE_KEY` | FAIL | **FAIL** |
| 9 | G-STORAGE | `INSERT INTO storage.buckets` con un id nuevo no inventariado | FAIL | **FAIL** |
| extra | Gate de migraciones históricas | Un comentario añadido a `0041_...sql` (ya aplicada en producción) | FAIL | **FAIL** — exige `Security-Baseline-Override: historical-migration:0041` |

11/11 pruebas negativas con el resultado esperado. Ninguna requirió ajustar un check después de escribirlo — se documentan tal como salieron a la primera.

---

## 9. Qué queda explícitamente para P1/P2

Textual de `seguridad/19_security_baseline_v1_diseno.md` §15, no repetido ni reinterpretado aquí:

- `P-D0` (`has_schema_privilege('anon'/'authenticated', 'public', 'CREATE')`) — el hallazgo más importante de la revisión de Kimi (RT-004), hoy sigue sin ser gate por-PR.
- `P-D1`/`P-D2` (`search_path` real y `has_function_privilege` real de todas las funciones, no solo las nuevas de un PR).
- Manifest versionado de clasificación de funciones (privada/pública) — hoy el manifest de este documento solo cubre lo ya conocido, no una clasificación exhaustiva de las ~33 `SECURITY DEFINER` existentes.
- Matriz de identidades de `19` §7 implementada de verdad (fixtures, 6 identidades, limpieza automática).
- Dependabot activado.
- Decisión y ejecución sobre integración Git↔Vercel (bloquea que B11 corra por-PR con un Preview real).
- `P-D6` (manifest de tablas RLS-sin-políticas intencionadas, p. ej. `attendance_responses`).
- `P-D3` (diff de forma de fila de funciones públicas), MFA de staff, `P-S1`/`P-S2` (CORS/rate limiting formalizados), auditoría de todo el historial de git + redacción de identificadores antes de publicar el repo, decisión de permisos de staff por tipo de dato.

No se implementó privacidad de la participación (`19` §13) ni Open Source Readiness (`19` §14) — explícitamente fuera de esta fase, cada uno con su propio documento.
