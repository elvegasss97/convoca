# Aplicación del override de `sharp` al repositorio real — CONVOCA

**Fecha:** 2026-08-07
**Alcance:** aplicación al repositorio real (no staging, no producción) del override de `sharp@0.35.3` ya validado en `13_resultados_pruebas_pendientes_staging.md`, más fijado de `engines.node`. Ningún push, deploy ni cambio en Vercel/Supabase se ha realizado en esta sesión.

---

## 1. Cambios aplicados

| Commit | Contenido |
|---|---|
| `b18fa86` | `pnpm-workspace.yaml`: `overrides: { sharp: 0.35.3 }`. `pnpm-lock.yaml` regenerado (`pnpm install`) — confirmado con `pnpm why sharp` → `sharp@0.35.3` en todo el árbol. |
| `739c3a2` | `package.json`: `engines.node: "22.x"` — fija la major de Node para evitar que Vercel seleccione automáticamente una futura (el proyecto no fijaba ninguna versión previamente; confirmado que 22.x está soportada por Vercel actualmente, ver [Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)). No afectó la resolución del lockfile (`pnpm install` → `Already up to date`). |

## 2. Validación local tras aplicar el override

| Prueba | Resultado |
|---|---|
| `pnpm build` | **PASS** — exit 0, build completo (~1m9s), PWA generada. Avisos de `@sveltejs/adapter-vercel` sobre `@img/sharp-*` no localizados son esperados (binarios `optionalDependencies` por plataforma, resueltos en runtime, no en build) — mismo comportamiento que ya existía con `sharp@0.34.5`, no es una regresión del override. |
| `pnpm audit --prod` | **Sin vulnerabilidades conocidas.** |
| `node --version` | `v22.22.2` (dentro del rango `22.x` fijado) |

## 3. `pnpm audit` completo (incluye devDependencies) — 4 hallazgos

| Severidad | Paquete | Cadena | Clasificación |
|---|---|---|---|
| high | `fast-uri` | `@vite-pwa/sveltekit` → `workbox-build` → `ajv` | Build/dev tooling — no se empaqueta en el bundle SSR desplegado |
| high | `brace-expansion` (×2 rutas) | `eslint`/`minimatch`; `workbox-build` → `jake`/`filelist` | Build/dev tooling — no se empaqueta en el bundle SSR desplegado |
| **low** | **`cookie`** | `@sveltejs/adapter-vercel` → `@sveltejs/kit` → `cookie`; `@sveltejs/kit` → `cookie` | **No clasificado como build/dev-only.** `@sveltejs/kit` es un `devDependency` pero incorpora código que se ejecuta en runtime (el propio servidor SSR/adaptador que procesa cookies de sesión en cada request) — la posición del paquete en `package.json` no determina si termina en el bundle desplegado. `pnpm audit --prod` no lo detecta porque `@sveltejs/kit` está declarado como dev, pero eso es una limitación de cómo `pnpm audit --prod` filtra por árbol declarado, no una garantía de que el código de `cookie` esté ausente del runtime. **Estado: riesgo LOW, pendiente de verificar directamente en el bundle SSR desplegado (`.svelte-kit/output/server`) si la ruta vulnerable de `cookie` (parseo de nombre/path/dominio con caracteres fuera de rango) es alcanzable en producción.** No se ha aplicado ningún cambio de dependencias para mitigarlo en esta sesión.

**Nota de corrección respecto a una afirmación previa en esta sesión:** se había descrito inicialmente el hallazgo de `cookie` como "dev tooling, sin impacto en producción" basándose únicamente en que `pnpm audit --prod` salía limpio. Esa inferencia es incorrecta como regla general — ya se había verificado en este mismo proyecto que dependencias declaradas como `devDependency` (como `@sveltejs/kit`) pueden incorporar código que efectivamente corre en el runtime desplegado. Se corrige aquí: la ausencia en `pnpm audit --prod` no es evidencia suficiente de que el paquete esté ausente del bundle de producción.

## 4. Estado

**No se ha aplicado ningún cambio a producción, staging ni a la configuración de Vercel/Supabase en esta sesión.** Los dos commits (`b18fa86`, `739c3a2`) están en `main` local, por delante de `origin/main`, sin `push`.

**Pendiente:** verificar si `cookie` (parseo de nombre/path/dominio) es alcanzable en el bundle SSR desplegado antes de dar por cerrado ese hallazgo como bajo impacto real.
