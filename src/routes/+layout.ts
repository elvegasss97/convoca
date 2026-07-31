/**
 * Fase 1 (prototipo): toda la "base de datos" es un array en memoria dentro
 * de los módulos de `$lib/services/*`, respaldado por localStorage. Ese
 * estado NO se comparte entre el proceso de servidor (usado por SvelteKit
 * para el renderizado inicial/SSR) y el proceso del navegador — son dos
 * instancias de módulo distintas. Con SSR activo, cualquier navegación dura
 * (recargar, teclear una URL, o que el sistema operativo del móvil descargue
 * la pestaña en segundo plano) volvía a pedir el HTML al servidor, que nunca
 * se enteró de las convocatorias creadas en el cliente: parecía que la
 * creación "no funcionaba".
 *
 * Desactivar SSR aquí hace que *todas* las rutas —incluida la primera
 * carga— ejecuten sus `load` en el navegador, donde vive el único estado
 * real (sincronizado con localStorage). Cuando se conecte Supabase en la
 * fase 2, esta restricción desaparece: se podrá reactivar SSR sin tocar
 * ningún componente.
 */
export const ssr = false;
