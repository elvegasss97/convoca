# Muro Municipal + Firmas — hardening 0056

## Por qué existe

`0054`/`0055` dejaron una V1 funcional y pasaron staging, pero una revisión posterior antes de cargar contenido real encontró invariantes que no debían quedar confiadas al navegador o a procesos manuales.

Esta fase **no rediseña el producto**. Endurece integridad territorial, privacidad, supresión de cuenta, consentimiento, moderación y los gates de seguridad.

## Cambios de 0056

### 1. Ubicación municipal autoritativa

Antes, `create_municipal_petition` recibía `lat/lng` del navegador. Aunque validaba el código INE y límites aproximados de España, una llamada manual podía combinar un municipio con coordenadas de otro lugar.

Desde 0056:

- desaparece la RPC pública que aceptaba coordenadas;
- el navegador solo envía `municipalityIneCode`;
- la Edge Function `create-municipal-petition` valida el JWT;
- carga el nombre desde `ine_municipalities`;
- reutiliza `municipal_map_points` o resuelve el municipio contra el Geocoder REST oficial de CartoCiudad/CNIG;
- solo acepta un resultado de tipo municipio cuyo `muniCode` coincide exactamente con el INE pedido;
- la RPC interna `create_municipal_petition_server` vuelve a leer `lat/lng` desde `municipal_map_points`: **ni el cliente ni la Edge Function pasan coordenadas a la inserción**.

La tabla `municipal_map_points` no tiene acceso para `anon` ni `authenticated`.

En un `cache miss`, la Edge Function llama **antes de cualquier petición externa** a `guard_municipal_map_resolution_server`. Ese guard exige cuenta válida + condiciones vigentes y limita las resoluciones nuevas por usuario (5/10 min y 25/día). Los municipios ya cacheados no consumen este bucket ni generan tráfico a CartoCiudad.

### 2. Coherencia problema ↔ municipio

El propio Muro queda también protegido: un `municipal_issue` puede existir como `detected` mientras se investiga, pero al pasar a un estado público la BD exige `municipality_ine_code` y un punto canónico ya verificado. Un trigger sustituye nombre, provincia y coordenadas por los valores autoritativos de `ine_municipalities` + `municipal_map_points`. Así un error de un futuro agente o del panel interno no puede iluminar públicamente el municipio equivocado.

Si `issue_id` está presente en una recogida, el problema debe:

- estar en estado público (`verified`, `in_action`, `resolved`), y
- tener exactamente el mismo `municipality_ine_code` que la recogida.

Un problema de Granada no puede asociarse a una recogida marcada como Madrid.

El trigger de publicación es `SECURITY INVOKER` y lee únicamente las columnas canónicas `lat/lng` concedidas a staff; no hace `SELECT *` sobre la caché interna. Esto mantiene el principio de mínimo privilegio también durante la publicación manual desde moderación.

### 3. Eliminación de cuenta

`municipal_petitions.created_by` pasa de `NOT NULL / ON DELETE RESTRICT` a nullable / `ON DELETE SET NULL`.

Resultado:

- eliminar una cuenta no queda bloqueado porque hubiera creado una recogida;
- la recogida pública puede conservarse;
- desaparece el vínculo identificativo con su creador.

Los apoyos siguen con `ON DELETE CASCADE`, por lo que se eliminan al borrar la cuenta.

### 4. Consentimiento específico de apoyos

Cada apoyo activo guarda:

- `consent_version`;
- `consented_at`.

La RPC exige:

- acción autenticada;
- consentimiento explícito `true`;
- versión exacta `2026-08-20`.

Los apoyos existentes anteriores a 0056 no tenían esta evidencia porque la UI antigua nunca la pidió. **No se les inventa consentimiento retroactivo:** 0056 elimina esas filas y obliga a que cualquier apoyo activo posterior tenga evidencia específica.

Retirar el apoyo elimina la fila completa cuenta ↔ petición.

### 5. Condiciones legales también en servidor

La página de creación ya comprueba las versiones aceptadas en cliente. 0056 repite la regla dentro de la RPC privilegiada para impedir que una llamada manual a la Edge Function se salte ese gate.

Versiones esperadas:

- términos: `2026-08-20`;
- privacidad: `2026-08-20`;
- uso pacífico: `2026-08-01`.

**Regla operativa:** si cambia `src/lib/legal/versions.ts`, actualizar este gate mediante una migración posterior. El check `check-municipal-integrity.mjs` detecta desalineaciones de estas versiones.

### 6. Moderación reactiva completa

No hay preaprobación obligatoria: las recogidas siguen publicándose inmediatamente.

Se añade:

- botón **Reportar esta recogida**;
- motivos cerrados;
- rate limit;
- `municipal_petition_reports`, privada;
- cola en `Centro de Operaciones → Reportadas → Firmas municipales reportadas`;
- acción `Descartar reporte`;
- acción `Ocultar recogida`.

La identidad de quien reporta **no se selecciona en el panel de moderación**.

La acción de staff pasa por `review_municipal_petition_report`, exige `is_moderator_or_admin()` —y por tanto MFA/aal2 según 0052— y deja huella inmutable en `audit_trail`.

### 7. Gates de seguridad

`check-edge-functions.mjs` ya no detecta únicamente la cadena `service_role`: también trata `SUPABASE_SECRET_KEYS` / Secret API Keys nombradas como credenciales privilegiadas.

Se añade `check-municipal-integrity.mjs`, que fija como regresiones bloqueantes:

- volver a confiar en coordenadas del navegador;
- perder `ON DELETE SET NULL`;
- permitir issue de otro municipio;
- apoyos sin consentimiento específico;
- perder el circuito de reportes/moderación;
- volver a Nominatim desde el formulario municipal;
- desalinear versiones legales cliente/servidor.

También se añaden pruebas unitarias en `municipalService.test.ts` para las escrituras de cliente.

## Credencial de la Edge Function

La función usa una **Secret API Key nombrada** `municipal_write`, obtenida desde `SUPABASE_SECRET_KEYS`.

No guardar esta clave en:

- `.env` del frontend;
- Vercel `PUBLIC_*`;
- GitHub;
- commits;
- logs.

Debe crearse/configurarse en cada proyecto Supabase (staging y producción) usando el mecanismo de Secret API Keys ya empleado por `delete-account`.

## Orden de integración obligatorio

1. Revisar el diff completo.
2. Revisar de forma independiente cada nueva/modificada `SECURITY DEFINER`.
3. Revisar la Edge Function privilegiada con el checklist G-SR.
4. Ejecutar `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build` y `pnpm security:baseline`.
5. Configurar `municipal_write` solo en **staging**.
6. `supabase link` a staging.
7. `migration list`.
8. `db push --dry-run`.
9. Aplicar **solo 0056** si el dry-run es correcto.
10. Desplegar `create-municipal-petition` a staging.
11. Regenerar `src/lib/supabase/database.types.ts` desde staging y comprobar que no introduce cambios inesperados.
12. Repetir tests + baseline.
13. Pruebas funcionales reales de staging.
14. PR/CI.
15. Producción solo después de revisión manual.

No modificar 0054/0055: ya forman parte del historial aplicado.

### Rollback y conservación de evidencia

0056 elimina deliberadamente los apoyos legacy que no contienen evidencia de consentimiento específico. Por eso **no existe un rollback automático honesto** capaz de reconstruir esas filas con consentimiento que nunca se recogió. Antes de aplicar 0056 en producción:

- ejecutar el preflight y revisar el número de apoyos que se eliminarán;
- detener el despliegue si el recuento no es el esperado;
- conservar backup/snapshot conforme al procedimiento operativo del proyecto si se necesita evidencia histórica;
- ante un fallo posterior, preferir una migración de corrección hacia delante en vez de reinsertar apoyos sin consentimiento.

## Overrides esperados del Security Baseline

El gate debe fallar inicialmente hasta que Claude/persona revisora confirme realmente los checklists. Solo entonces registrar los trailers exactos que pida el CI. Como mínimo se esperan revisiones para:

- `security-definer:create_municipal_petition_server`
- `security-definer:set_municipal_petition_support`
- `security-definer:report_municipal_petition`
- `security-definer:review_municipal_petition_report`
- `service-role:create-municipal-petition` (nombre histórico del gate; cubre ahora también Secret API Keys)

No añadir estos overrides para “poner el CI verde” sin completar la revisión defensiva.

## Matriz de pruebas de staging

### Integridad territorial

- Crear recogida normal con un INE real → aparece en el municipio correcto.
- El body de la Edge no acepta `lat`, `lng` ni `point`.
- Intentar RPC antigua `create_municipal_petition(...)` → no existe/no ejecutable.
- Intentar vincular un `issue_id` público de otro municipio → rechazado.
- INE inexistente → rechazado.
- Simular fallo de CartoCiudad para un municipio no cacheado → falla cerrado; no crea una petición sin ubicación verificada.
- Reintentar municipio ya cacheado con CartoCiudad no disponible → usa la caché y funciona.

### Cuenta y privacidad

- Crear petición → eliminar esa cuenta → borrado de cuenta no bloqueado y `created_by` queda `NULL`.
- `anon` no puede leer `created_by`, apoyos ni reportes individuales.
- Un usuario solo ve su propia fila de `municipal_petition_supports`.
- Moderación no recibe `reporter_id` desde el servicio/UI.

### Apoyos

- Sin marcar consentimiento → UI no envía apoyo.
- RPC con `p_explicit_consent=false` → rechazado.
- RPC con versión distinta de `2026-08-20` → rechazado.
- Apoyo válido → contador +1.
- Segundo apoyo de la misma cuenta → contador permanece estable.
- Segunda cuenta → contador +1.
- Retirar → fila de apoyo desaparece y contador -1.

### Moderación

- Usuario autenticado reporta → aparece en la cola de staff.
- Anónimo → no puede reportar.
- Moderador sin MFA → no puede leer/accionar cola.
- Moderador con MFA descarta → reporte sale de la cola + audit trail.
- Moderador con MFA oculta → petición desaparece del público + todos sus reportes abiertos pasan a `actioned` + audit trail.

### Legales

- Cuenta con versiones anteriores → creación rechazada tanto por UI como por servidor.
- Tras aceptar versiones vigentes → creación permitida.

## CORS

La Edge usa `Access-Control-Allow-Origin: *`, igual que una API Bearer pública: no usa cookies ni `credentials`, y cada escritura exige un JWT validado antes de resolver la credencial privilegiada. El wildcard **no es una autorización**; la autorización sigue en JWT/RPC. Si en el futuro se migra Auth a cookies o credenciales automáticas del navegador, este punto debe revisarse antes de ese cambio.

## Estado legal

Los textos de Términos/Privacidad se han actualizado para describir el Muro, la naturaleza no oficial de “Firmar”, la relación interna cuenta ↔ apoyo y el consentimiento específico. Siguen siendo **borradores funcionales del proyecto** y deben recibir revisión jurídica profesional antes de un lanzamiento público relevante; 0056 mejora coherencia técnica y transparencia, no sustituye asesoramiento jurídico.
