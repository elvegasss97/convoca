# Smoke test HTTP real de la ruta OG — Preview `security/sharp-node22-preview`

**Fecha:** 2026-08-07
**Deployment probado:** `https://convoca-6jd95sp9j-vegas13.vercel.app` (Preview, `target: null`, commit `407a6fe`/`7adad8f`, entorno Supabase = `convoca-staging`, confirmado por el usuario en la tarea anterior).
**Objetivo:** validar en runtime real (no build local) el endpoint `/og/convocatorias/[slug]`, que es el que ejercita `sharp@0.35.3` vía `@vercel/og` en producción/preview. No se ha tocado `sharp` ni `cookie` en esta tarea.

---

## Acceso al Preview

El deployment tiene activa la protección de Vercel (Deployment Protection / SSO) — cualquier request sin autenticar recibe `307` a `vercel.com/sso-api`. Se accedió usando el mecanismo oficial **"Protection Bypass for Automation"** del propio proyecto (cabecera `x-vercel-protection-bypass`), sin exponer el token en ningún archivo del repositorio ni en este documento. No se ha modificado ninguna configuración de protección del proyecto.

## Descubrimiento del slug (sin credenciales de base de datos)

Para no usar credenciales directas de `convoca-staging`, se obtuvo un slug real navegando la propia página pública `/descubrir` del Preview (que sirve datos reales de `convoca-staging` vía SSR). Se extrajeron enlaces `/convocatorias/{slug}` ya existentes — **no se creó ningún dato nuevo**:

- `castellon-a7bc01aa` (usado para el test positivo)
- `prueba-2-dbe73128` (alternativo, no usado)

Ambos son convocatorias **ya existentes en staging** de sesiones anteriores; no son fixtures creados en esta tarea.

## 1. Slug válido — `GET /og/convocatorias/castellon-a7bc01aa`

| Comprobación | Resultado |
|---|---|
| Código HTTP | **200** ✅ |
| `Content-Type` | **`image/png`** ✅ |
| Descarga a archivo | ✅ — 58.410 bytes |
| Validación de formato (`file`) | ✅ — `PNG image data, 1200 x 630, 8-bit/color RGBA, non-interlaced` |
| No vacío | ✅ — 58.410 bytes, muy por encima de un PNG vacío/corrupto |

**PASS (5/5).** Confirma en runtime real de Vercel (no en un smoke test aislado en `/tmp` como en `13_resultados_pruebas_pendientes_staging.md`) que `@vercel/og` + `sharp@0.35.3` generan correctamente la imagen social con datos reales de `convoca-staging`.

## 2. Slug inexistente — `GET /og/convocatorias/este-slug-no-existe-nunca-jamas-test-inexistente-000`

| Comprobación | Resultado |
|---|---|
| Código HTTP | **404** ✅ |
| Cuerpo | JSON de error estándar de SvelteKit (`error(404, 'Convocatoria no encontrada')` en `src/routes/og/convocatorias/[slug]/+server.ts:45`) |

**PASS.** Confirma que `getEvent()` devuelve `undefined` para un slug inexistente y la ruta responde con el 404 esperado, sin fallback silencioso a la imagen genérica (ese fallback solo se activa por fallo de red/fuente, según el código, no por convocatoria inexistente).

---

## Resumen

| Prueba | Resultado |
|---|---|
| OG con slug válido de staging → 200, `image/png`, PNG válido y no vacío | **PASS** |
| OG con slug inexistente → 404 | **PASS** |

**No se ha creado ni modificado ningún dato** (ni en staging ni en producción) — se usaron dos convocatorias ya existentes en `convoca-staging` únicamente para leer. **No se ha hecho merge ni deploy de producción.** No se ha vuelto a tocar `sharp` ni `cookie` en esta tarea. Los archivos temporales con el token de bypass, cookies y las respuestas descargadas se han eliminado del scratchpad tras la verificación.
