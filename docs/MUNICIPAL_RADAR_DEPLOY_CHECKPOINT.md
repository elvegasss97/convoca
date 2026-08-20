# Radar Municipal — checkpoint preproducción

Fecha: 2026-08-20

Este archivo fija el estado verificable antes de promover el Radar Municipal a producción.

## Código y UX

- El mapa municipal mantiene zoom y habilita explícitamente `dragPan`.
- El mapa arranca sin seleccionar automáticamente el primer problema o recogida.
- Las fichas se abren al seleccionar un punto y pueden cerrarse.
- El estado vacío no se superpone de forma permanente sobre el mapa.
- Los gates de integridad municipal protegen estas invariantes.

## Staging

- Historial aplicado y verificado de forma consecutiva hasta `0060` (`0058 -> 0059 -> 0060`).
- `0058`: los hallazgos internos `detected` pueden existir sin coordenadas inventadas; los estados públicos siguen exigiendo ubicación canónica.
- `0059`: revisión humana `publish | dismiss`, staff + MFA/AAL2, fuente obligatoria para publicar y auditoría de decisiones.
- `0060`: el paso de `detected` a `verified` o `dismissed` queda obligado a pasar por `review_municipal_issue`; el `UPDATE` directo queda bloqueado incluso para staff+AAL2.
- Edge Function `review-municipal-issue` permanece `ACTIVE` con JWT obligatorio (`verify_jwt=true`).
- Preflight `0060`: dependencias de 0059 y trigger canónico de 0056 presentes; estado previo 7 `detected`, 0 `dismissed`, 0 públicos.
- Postflight `0060`: trigger de camino auditado activo, contexto transaccional + puerta staff presentes, RPC conserva fuente/punto/auditoría, `anon` sin EXECUTE y `authenticated` con EXECUTE.
- Prueba funcional transaccional de `0060` con `ROLLBACK`: `detected -> dismissed` directo bloqueado; `detected -> verified` directo bloqueado; AAL1 bloqueado; publish AAL2 por RPC permitido y auditado; contexto no reutilizable entre issues; dismiss AAL2 por RPC permitido y auditado; `verified -> in_action -> resolved` permitido; público -> `detected` bloqueado; `dismissed` -> `detected` bloqueado.
- Para probar publish se creó un punto municipal temporal dentro de la transacción; el `ROLLBACK` dejó `municipal_map_points=0` y cero puntos de prueba.
- Tras las pruebas siguen exactamente 7 hallazgos reales en `detected`, 0 descartados y 0 públicos.
- Primera bandeja de siete hallazgos reales permanece exclusivamente privada por RLS y sin coordenadas hasta revisión.
- Anon no puede leer los hallazgos `detected`, sus fuentes ni sus sugerencias.

## 0060 — camino único de revisión

La auditoría manual detectó un bypass residual: la policy histórica de staff permitía `UPDATE` directo sobre `municipal_issues`, por lo que un staff con MFA podía intentar `detected -> verified` sin pasar por la RPC de `0059` y saltarse la exigencia de fuente y el `audit_trail`.

`0060_municipal_issue_review_path_guard.sql` cierra ese camino a nivel de base de datos:

- todo `INSERT` de un hallazgo nace obligatoriamente como `detected`;
- `detected -> verified` y `detected -> dismissed` exigen el contexto transaccional exacto actor + issue + acción que establece `review_municipal_issue`;
- el guard vuelve a comprobar `is_moderator_or_admin()`;
- un `dismissed` no puede reactivarse por `UPDATE` directo;
- un estado público no puede regresar a estado interno por `UPDATE` directo;
- el ciclo público `verified | in_action | resolved` permanece operativo;
- `review_municipal_issue` mantiene MFA/AAL2, bloqueo de fila, fuente obligatoria, punto municipal canónico y auditoría.

Se añadieron prueba de regresión y `0060_preflight.sql` / `0060_postflight.sql`. La migración `0060` reconstruye correctamente una base Supabase local limpia y también ha superado preflight, postflight y prueba funcional en staging.

## Tipos

`src/lib/supabase/database.types.ts` fue regenerado mecánicamente desde una base Supabase local desechable reconstruida con todas las migraciones del repositorio hasta `0060`. El workflow temporal de regeneración se eliminó en el mismo commit de generación. El archivo generado y la regresión específica de `0060` fueron después formateados mecánicamente con la misma configuración de Prettier del repositorio.

## Quality gate

- HEAD de código `808c79ee54454ba0875ea964c065e554f2b728b0`: PR Quality completo en verde (`pnpm check`, Prettier + ESLint del diff y suite de tests completa).
- Ese mismo HEAD pasó Security Baseline completo: dependencias, gitleaks, SECURITY DEFINER/triggers, Edge privilegiadas, integridad municipal, build reproducible, estructura de migraciones, clean-room y RLS.
- Preview Vercel del mismo HEAD quedó `READY` y no mostró errores/fatales de runtime.
- El commit posterior a este checkpoint solo documenta la validación de staging; debe volver a cerrar los gates antes de cualquier promoción.

## Producción

Producción permanece en `0057` durante este checkpoint. No se promoverán `0058/0059/0060`, la Edge de revisión ni el código de la PR hasta que los gates del HEAD final vuelvan a estar verdes, se realice el preflight específico de producción y exista autorización explícita para producción.

Los siete hallazgos `detected` de staging no forman parte automáticamente del despliegue de datos a producción. Ningún agente publica problemas de forma automática.
