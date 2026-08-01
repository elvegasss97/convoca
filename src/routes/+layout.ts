/**
 * SSR reactivado: el backend ya es Supabase real (ver
 * MIGRACION-PRODUCCION.md, Fase 3), no el array en memoria de la Fase 1 que
 * motivó desactivarlo originalmente. `eventsService`/`organizersService`/etc.
 * leen contra la misma base de datos tanto en el servidor como en el
 * navegador, así que el HTML inicial ya puede llevar contenido real
 * (título, convocatorias, metadatos) sin depender de que el JS del cliente
 * termine de ejecutarse — necesario para SEO, previsualizaciones sociales y
 * rendimiento de carga inicial.
 *
 * Todo el código que toca APIs de navegador (`localStorage`, `window`,
 * `document`, geolocalización) ya está guardado tras `browser` de
 * `$app/environment` (ver `$lib/supabase/client.ts`, `$lib/services/
 * attendanceService.ts`, `$lib/auth/session.svelte.ts`, `EventMap.svelte`),
 * así que no hay ningún componente que rompa al ejecutarse primero en el
 * servidor.
 */
export const ssr = true;
export const prerender = false;
