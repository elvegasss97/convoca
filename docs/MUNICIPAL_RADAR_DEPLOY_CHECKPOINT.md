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

- Historial aplicado hasta `0059`.
- `0058`: los hallazgos internos `detected` pueden existir sin coordenadas inventadas; los estados públicos siguen exigiendo ubicación canónica.
- `0059`: revisión humana `publish | dismiss`, staff + MFA/AAL2, fuente obligatoria para publicar y auditoría de decisiones.
- Edge Function `review-municipal-issue` activa con JWT obligatorio.
- Pruebas transaccionales con `ROLLBACK`: AAL1 bloqueado, AAL2 permitido, publicación sin punto canónico bloqueada, canonicalización correcta, descarte privado y auditoría correcta.
- Cero residuos de datos de prueba tras las pruebas.
- Primera bandeja de siete hallazgos reales cargada exclusivamente como `detected`, privada por RLS y sin coordenadas hasta revisión.
- Anon no puede leer los hallazgos `detected`, sus fuentes ni sus sugerencias.

## Tipos

`src/lib/supabase/database.types.ts` fue regenerado mecánicamente desde una base Supabase local desechable reconstruida con todas las migraciones del repositorio hasta `0059`. El workflow temporal de regeneración se eliminó en el mismo commit de generación.

## Producción

Producción permanece en `0057` durante este checkpoint. No se promoverán `0058/0059`, la Edge de revisión ni el código de la PR hasta que Security Baseline, PR Quality, Preview y preflight de producción estén verdes.

Los siete hallazgos `detected` de staging no forman parte automáticamente del despliegue de datos a producción. Ningún agente publica problemas de forma automática.
