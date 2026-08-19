# Radar / Muro Municipal — V1

## Objetivo

Añadir a Pulso Ciudadano un mapa nacional en el que:

1. CONVOCA publica problemas municipales documentados.
2. Cada ficha conserva fuentes y hasta cuatro posibles vías de actuación (orientación, no “solución oficial”).
3. Cualquier cuenta autenticada puede abrir una recogida de apoyos sobre un problema existente o desde cero.
4. Una cuenta solo puede apoyar una vez cada petición.
5. El mapa de Firmas aumenta el halo visual según el número agregado de apoyos.
6. Un apoyo CONVOCA no se presenta como firma jurídica válida para ILP u otros procedimientos oficiales.

## Rutas nuevas

- `/pulso/municipal` — mapa protagonista + Muro + modo Firmas.
- `/pulso/municipal/crear` — crear recogida ciudadana.
- `/pulso/municipal/crear?issue=<uuid>` — crearla vinculada a un problema ya documentado.

## Datos

Migración: `supabase/migrations/0054_municipal_radar_and_petitions.sql`.

Tablas:

- `municipal_issues`
- `municipal_issue_sources`
- `municipal_issue_suggestions`
- `municipal_petitions`
- `municipal_petition_supports`

RPC:

- `create_municipal_petition`
- `set_municipal_petition_support`
- `get_municipal_petition_counts`
- `get_municipal_radar_summary`

El código INE se reutiliza desde `ine_municipalities`; no aparece un segundo catálogo de municipios.

## Privacidad

- `municipal_issues.created_by` no tiene permiso de lectura público.
- `municipal_petitions.created_by` no tiene permiso de lectura público.
- `municipal_petition_supports` solo deja a una sesión leer sus propias filas.
- Los contadores públicos salen de una RPC agregada `SECURITY DEFINER`; nunca se publica la lista de firmantes.
- No se infiere “firma local” a partir de datos no verificados. La V1 muestra apoyos totales.

## Publicación del Radar

`municipal_issues.status = 'detected'` es bandeja interna. RLS impide que anónimos o ciudadanos lo lean.

Flujo previsto:

`agente detecta → detected → revisión/evidencia → verified → público`

Estados públicos posteriores:

- `verified`
- `in_action`
- `resolved`

La automatización/agent runner futuro debe escribir **borradores**, no publicar directamente.

## Seguridad / baseline

La migración añade cuatro funciones `SECURITY DEFINER`. El repositorio tiene un GATE que exige segunda revisión explícita antes de mergear.

Después de la revisión independiente, el commit de integración tendrá que registrar los overrides exactos que pida `check-security-definer.mjs`, previsiblemente:

- `Security-Baseline-Override: security-definer:create_municipal_petition`
- `Security-Baseline-Override: security-definer:set_municipal_petition_support`
- `Security-Baseline-Override: security-definer:get_municipal_petition_counts`
- `Security-Baseline-Override: security-definer:get_municipal_radar_summary`

No deben añadirse esos overrides hasta haber revisado realmente:

- `search_path` fijo;
- autenticación y `auth.uid()` donde corresponde;
- validación de parámetros;
- `REVOKE/GRANT` explícitos;
- ausencia de filtraciones de identidad;
- rate limit de creación;
- comportamiento de peticiones ocultas/cerradas.

## Integración recomendada

1. Revisar diff completo.
2. Aplicar 0054 en staging.
3. Regenerar `src/lib/supabase/database.types.ts` desde el esquema de staging/local (el archivo incluido en esta entrega ya refleja 0054 para poder integrar el código, pero debe volver a generarse como fuente autoritativa).
4. Ejecutar `pnpm check`, `pnpm test`, `pnpm lint` y `pnpm security:baseline`.
5. Hacer smoke test de `/pulso/municipal` sin sesión y con sesión.
6. Probar dos cuentas: una firma, la otra firma, comprobar contador 2 y que ninguna puede leer la identidad de la otra.
7. Probar doble firma de la misma cuenta: el contador no debe subir a 2.
8. Probar que `detected` no aparece en público.
9. Solo después promover a producción.

## Contenido inicial

La migración NO siembra noticias ni reclamaciones reales automáticamente. Los primeros problemas deben entrar como filas documentadas con fuente, fecha, competencia y evidencia revisadas. Esto evita convertir un titular o una denuncia unilateral en un hecho de CONVOCA.

## Correcciones posteriores

- **`0055_fix_municipal_petition_anon_execute_grant.sql`**: hallazgo confirmado empíricamente contra staging tras aplicar 0054. `revoke all on function ... from public` no retira el `EXECUTE` que este proyecto de Supabase concede por defecto a `anon`/`authenticated` en cada función nueva de `public` — hace falta revocar de `anon` explícitamente, aparte de `public` (mismo patrón que `0042_security_hardening_review3.sql` ya estableció para `set_concern_listening_priorities` y funciones hermanas, que 0054 no replicó). Sin 0055, una llamada anónima a `create_municipal_petition`/`set_municipal_petition_support` llegaba a ejecutar el cuerpo de la función (aunque el `auth.uid() is null` interno seguía bloqueando cualquier efecto real). **Al escribir nuevas funciones `SECURITY DEFINER` de solo-`authenticated` en este proyecto, revocar siempre de `public` Y `anon` por separado, nunca solo de `public`.**
