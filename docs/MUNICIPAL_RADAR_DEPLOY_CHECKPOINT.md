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

- Historial aplicado actualmente hasta `0059`; `0060` está pendiente de validación/aplicación explícita en staging.
- `0058`: los hallazgos internos `detected` pueden existir sin coordenadas inventadas; los estados públicos siguen exigiendo ubicación canónica.
- `0059`: revisión humana `publish | dismiss`, staff + MFA/AAL2, fuente obligatoria para publicar y auditoría de decisiones.
- Edge Function `review-municipal-issue` activa con JWT obligatorio.
- Pruebas transaccionales sobre `0059` con `ROLLBACK`: AAL1 bloqueado, AAL2 permitido, publicación sin punto canónico bloqueada, canonicalización correcta, descarte privado y auditoría correcta.
- Cero residuos de datos de prueba tras esas pruebas.
- Primera bandeja de siete hallazgos reales cargada exclusivamente como `detected`, privada por RLS y sin coordenadas hasta revisión.
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

Se añadieron prueba de regresión y `0060_preflight.sql` / `0060_postflight.sql`. La migración `0060` ya reconstruye correctamente una base Supabase local limpia; falta su prueba funcional en staging antes de considerarla promovible.

## Tipos

`src/lib/supabase/database.types.ts` fue regenerado mecánicamente desde una base Supabase local desechable reconstruida con todas las migraciones del repositorio hasta `0060`. El workflow temporal de regeneración se eliminó en el mismo commit de generación.

## Quality gate

- Antes de introducir `0060`, el HEAD `71fa58215e1be328bc7c0165ad74ab6c68e662dd` pasó PR Quality completo: `pnpm check`, Prettier + ESLint del diff y la suite de tests completa.
- Ese mismo HEAD pasó Security Baseline completo y Preview READY sin errores/fatales de runtime.
- Tras `0060`, los tipos ya se han regenerado sobre una reconstrucción clean-room que aplica las 60 migraciones.
- Pendiente en este checkpoint: confirmar en el HEAD final que PR Quality, Security Baseline y Preview vuelven a terminar verdes incluyendo la nueva regresión de `0060`.

## Producción

Producción permanece en `0057` durante este checkpoint. No se promoverán `0058/0059/0060`, la Edge de revisión ni el código de la PR hasta que Security Baseline, PR Quality, Preview y los preflight/postflight funcionales estén verdes y exista autorización explícita.

Los siete hallazgos `detected` de staging no forman parte automáticamente del despliegue de datos a producción. Ningún agente publica problemas de forma automática.
