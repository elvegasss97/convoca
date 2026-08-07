# Análisis de alcanzabilidad real: advisory `cookie` (low) — CONVOCA

**Fecha:** 2026-08-07
**Alcance:** determinar presencia + alcanzabilidad real del hallazgo `cookie` de `pnpm audit` en el runtime SSR desplegado (Preview `security/sharp-node22-preview`, deployment `dpl_BMf4ThywdWSW9nT4hhKP8Y7U6G5D`). Ninguna dependencia se ha modificado en esta sesión — este documento es puramente de investigación, tal como se pidió ("no arreglar el audit por reflejo").

---

## 1. `pnpm why cookie`

```
cookie@0.6.0
└─┬ @sveltejs/kit@2.70.2
  ├─┬ @sveltejs/adapter-vercel@6.3.4
  │ └── convoca@0.0.1 (devDependencies)
  ├─┬ @vite-pwa/sveltekit@1.1.0
  │ └── convoca@0.0.1 (devDependencies)
  └── convoca@0.0.1 (devDependencies)

Found 1 version of cookie
```

- **Versión exacta:** `cookie@0.6.0` (única versión resuelta en el árbol).
- **La introduce:** `@sveltejs/kit@2.70.2` — confirmado en `@sveltejs/kit/package.json`: `"cookie": "^0.6.0"` está en su bloque **`dependencies`** (no `devDependencies` del propio `@sveltejs/kit`), es decir, `@sveltejs/kit` la declara como dependencia de **runtime**, no de build.
- `@sveltejs/kit` en sí mismo cuelga de `convoca` como `devDependency` — pero (como ya se corrigió en `14_aplicacion_override_sharp_repo_real.md`) eso no determina si su código se ejecuta en producción: `@sveltejs/kit` **es** el propio framework SSR que sirve cada request.

## 2. Inspección del output de build

**`.svelte-kit/output/server/index.js`** (bundle SSR real, generado por `pnpm build` con el mismo lockfile que usaría el deploy remoto):

- Las funciones `parse()` (línea 2618) y `serialize()` (línea 2657) de la librería `cookie` están **inlineadas directamente** en el bundle — no como import externo, sino como código fuente copiado por el bundler. El contenido coincide exactamente con la implementación de `cookie@0.6.0` (misma regex `fieldContentRegExp`, misma lógica de parseo por índice).
- Origen confirmado en el código fuente de `@sveltejs/kit`: `src/runtime/server/cookie.js`, línea 1: `import { parse, serialize } from 'cookie';`

**`.vercel/output/functions`** (salida real del adaptador de Vercel, generada por el mismo build): la función `![-]/catchall.func` — la función serverless que atiende **todas** las rutas de página vía SSR — contiene ese mismo `.svelte-kit/output/server/index.js` con `parse`/`serialize` embebidos.

**Conclusión de la pregunta 3:**

> **A) Está incluido en el runtime SSR desplegado.** Confirmado con evidencia directa de código, no por inferencia de posición en `package.json`.

## 3. Para qué lo usa SvelteKit en CONVOCA

`src/runtime/server/cookie.js` de `@sveltejs/kit` usa la librería en dos puntos:

| Función | Uso | ¿Cuándo se ejecuta? |
|---|---|---|
| `parse()` | `get_cookies(request, url)` — parsea la cabecera `Cookie` entrante de cada request para construir `event.cookies` | Se invoca en la construcción del `RequestEvent`, en **cada** request que SvelteKit atiende (esté o no la app usando cookies) |
| `serialize()` | Dentro de `cookies.set(name, value, options)` / `cookies.serialize(name, value, options)` — genera la cabecera `Set-Cookie` | **Solo** si el código de la aplicación (o una librería) llama explícitamente a `event.cookies.set(...)` o `.serialize(...)` |

El advisory de `pnpm audit` ("cookie accepts cookie name, path, and domain with out of bounds characters", GHSA-pxg6-pf52-xh8x) es específico de **`serialize()`**: la regex de validación (`fieldContentRegExp`) de `cookie@0.6.0` acepta en `name`/`domain`/`path` caracteres que no debería, lo que permite inyección de cabecera `Set-Cookie` **si esos parámetros provienen de entrada no confiable**. No afecta a `parse()` — parsear una cabecera arbitraria en un objeto no es, por sí mismo, la vulnerabilidad reportada aquí.

## 4. Búsqueda de alcanzabilidad real en CONVOCA

Se buscó exhaustivamente cualquier llamada que pudiera alimentar `serialize()` con datos de request:

```
grep -rn "cookies\.set(\|cookies\.delete(\|cookies\.serialize(" src/
→ sin resultados
```

- **No existe `src/hooks.server.ts`** en el repositorio — SvelteKit no tiene ningún punto de entrada de servidor personalizado para esta app.
- **No se usa `@supabase/ssr`** (la librería de Supabase que sí gestiona cookies de sesión servidor a servidor) — CONVOCA depende únicamente de `@supabase/supabase-js` (cliente puro, sesión en `localStorage`/memoria del navegador). Esto es coherente con el hallazgo ya documentado en `13_resultados_pruebas_pendientes_staging.md`: *"no hay cookies de sesión involucradas, es un Bearer token"*.
- Se revisó el propio código fuente de `@sveltejs/kit` (`src/runtime/server/respond.js` y el resto de `runtime/server/`): **ningún punto interno del framework llama a `cookies.set()`/`serialize()` automáticamente** — solo existen strings de mensajes de error que mencionan la API.
- Se revisó `@sveltejs/adapter-vercel@6.3.4`: **no invoca `cookies.set()`/`serialize()` internamente.**

**Conclusión:** no existe, en el código actual de CONVOCA ni en las dependencias que ejecuta, ninguna ruta que llegue a invocar `serialize()` con parámetros derivados de una request externa — de hecho, no existe ninguna ruta que invoque `serialize()` en absoluto. El código vulnerable está cargado en memoria en cada invocación de la función SSR, pero la función que contiene el defecto (`serialize`) nunca se ejecuta con los datos de la aplicación actual.

`parse()` sí se ejecuta en cada request (parsea la cabecera `Cookie` entrante), pero esa función no es la que reporta el advisory.

---

## 5. Respuestas directas

| Pregunta | Respuesta |
|---|---|
| **Paquete presente en runtime** | **SÍ** — confirmado por código fuente inlineado en `.svelte-kit/output/server/index.js` y en la función `catchall.func` del output de Vercel. |
| **Código vulnerable (`serialize`, con name/path/domain no confiables) alcanzable por petición externa** | **NO** — con alta confianza, no "no demostrado": se verificó exhaustivamente que no existe ninguna llamada a `cookies.set()`/`cookies.serialize()` en el código de la app, en `hooks.server.ts` (inexistente), ni en las dependencias que corren en el request path (`@sveltejs/kit` internamente, `@sveltejs/adapter-vercel`). `parse()` sí es alcanzable en cada request, pero no es la función con el defecto reportado. |
| **Impacto realista en CONVOCA** | Ninguno en el estado actual del código. Es una dependencia transitiva con una función vulnerable presente pero **muerta en la práctica** (unreachable code path) para esta aplicación concreta. El riesgo es *latente*: si en el futuro se añade `hooks.server.ts`, autenticación basada en cookies de servidor (p. ej. migrar a `@supabase/ssr`), o cualquier llamada a `cookies.set()`/`.serialize()` con un `name`, `path` o `domain` derivado de input de usuario, el código vulnerable pasaría a ser explotable sin que nada más cambie. |
| **Severidad recomendada para este proyecto** | Bajar de "low" (severidad del advisory upstream, agnóstica del contexto) a **informativa / sin riesgo activo actual**, pero **mantenerla trackeada** — no cerrar el hallazgo como falso positivo, sino como "mitigado por ausencia de código explotador, revisar si se introduce manejo de cookies de servidor". |
| **Versión mínima de `cookie` que elimina el advisory** | `>=0.7.0` (según el propio advisory; confirmado disponible en el registro: `0.7.0`, `0.7.1`, `0.7.2`). |
| **Opciones compatibles para actualizarlo** | Ver punto 7 y 8 abajo. |

## 6. ¿Resuelve esto una actualización de `@sveltejs/kit`?

**No, todavía no.** `@sveltejs/kit@2.70.2` es actualmente la **última versión publicada** (`pnpm view @sveltejs/kit@latest version` → `2.70.2`, la misma ya instalada) y sigue declarando `"cookie": "^0.6.0"`. No existe hoy ninguna versión más nueva de `@sveltejs/kit` que resuelva esto de forma nativa. Esta vía queda descartada por ahora, no por incompatibilidad sino por no existir todavía.

## 7. Candidato de `pnpm override` (no aplicado)

Si en el futuro se decide cerrar el hallazgo de forma proactiva (no por explotabilidad actual, sino por higiene), el candidato mínimo sería:

```yaml
overrides:
  cookie: 0.7.2
```

**Riesgo de compatibilidad a evaluar antes de aplicar (no evaluado en esta sesión, no aplicado):**
- `cookie@0.7.x` mantiene la misma superficie de API que `0.6.x` (`parse(str, options)` / `serialize(name, value, options)` como funciones sueltas) — es previsiblemente compatible con el uso que hace `@sveltejs/kit@2.70.2` en `cookie.js`, ya que el cambio 0.6→0.7 es principalmente un endurecimiento de las regex de validación, no un cambio de API.
- **No forzar `cookie@1.x` o `cookie@2.x`** — estas son major versions con cambios de API/comportamiento no verificados contra el uso interno de `@sveltejs/kit@2.70.2`; forzarlas por override sería una combinación no probada por los mantenedores de SvelteKit y podría romper el manejo de cookies en runtime de forma silenciosa (mismo patrón de riesgo que se evaluó y validó explícitamente para el override de `sharp` antes de aplicarlo — aquí ese mismo tipo de validación con smoke test **no se ha hecho todavía** para `cookie`).
- Antes de aplicar cualquier override de `cookie`, correspondería un smoke test aislado análogo al de `sharp` (ver `13_resultados_pruebas_pendientes_staging.md`, sección 4): confirmar que `event.cookies.set()`/`.get()` siguen funcionando igual con `cookie@0.7.2` bajo `@sveltejs/kit@2.70.2`, antes de tocar el repositorio real.

---

## Estado

**No se ha modificado ninguna dependencia, `pnpm-workspace.yaml`, `package.json` ni `pnpm-lock.yaml` en esta sesión.** No se ha hecho push, merge, deploy ni cambios en Vercel/Supabase. Este documento es puramente de análisis.
