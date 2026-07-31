import {
	PUBLIC_APP_ENV,
	PUBLIC_ENABLE_DEMO_DATA,
	PUBLIC_ENABLE_DEV_TOOLS,
	PUBLIC_AUTH_GOOGLE_ENABLED,
	PUBLIC_AUTH_PASSWORD_ENABLED
} from '$env/static/public';

/**
 * Configuración de entorno explícita, leída de variables `PUBLIC_*` en
 * tiempo de compilación (`$env/static/public`, no `$env/dynamic/public`):
 * Vite las sustituye por su valor literal en el bundle, exactamente igual
 * que hacía antes `import.meta.env.DEV`. Esto es intencional y es lo que
 * hace que estas banderas **no se puedan activar manipulando el
 * navegador**: no existen como datos en tiempo de ejecución (no hay ningún
 * objeto en `window` que alguien pueda editar desde la consola), son
 * constantes fijadas al construir la aplicación. Cambiarlas exige volver a
 * desplegar con otro valor de variable de entorno en el hosting.
 */

export type AppEnv = 'development' | 'staging' | 'production';

function parseAppEnv(value: string | undefined): AppEnv {
	if (value === 'staging' || value === 'production') return value;
	return 'development';
}

/** Entorno declarado explícitamente — nunca se infiere de la URL ni del modo de Vite. */
export const APP_ENV: AppEnv = parseAppEnv(PUBLIC_APP_ENV);

export const IS_PRODUCTION = APP_ENV === 'production';
export const IS_STAGING = APP_ENV === 'staging';
export const IS_DEVELOPMENT = APP_ENV === 'development';

/**
 * Defensa en profundidad, no una opción: en producción los datos de
 * demostración y las herramientas de desarrollo quedan desactivados
 * SIEMPRE, incluso si alguien deja mal configuradas
 * `PUBLIC_ENABLE_DEMO_DATA` / `PUBLIC_ENABLE_DEV_TOOLS` en el panel del
 * hosting. `IS_PRODUCTION` manda por encima de esas dos variables.
 */
/**
 * Con Supabase conectado, los datos de demostración ya no se cargan en el
 * cliente (no hay ningún array mock que sembrar en el navegador): viven,
 * si acaso, en `supabase/seed.sql` (solo para `supabase start`/`db reset`
 * en local, nunca en el proyecto remoto). Esta constante se conserva
 * porque el contrato de variables de entorno la sigue exigiendo, pero hoy
 * no gatea ningún código de la SPA.
 */
export const ENABLE_DEMO_DATA = !IS_PRODUCTION && PUBLIC_ENABLE_DEMO_DATA === 'true';
export const ENABLE_DEV_TOOLS = !IS_PRODUCTION && PUBLIC_ENABLE_DEV_TOOLS === 'true';

/**
 * Interruptores de método de autenticación (beta con Google como único
 * método público). A diferencia de `ENABLE_DEMO_DATA`/`ENABLE_DEV_TOOLS`,
 * estos NO se fuerzan por `IS_PRODUCTION`: son un ajuste de producto que el
 * propio proyecto controla por entorno de despliegue (p. ej. mantener
 * ambos activos en desarrollo para poder probar el formulario de correo,
 * y solo Google en la producción de la beta). Siguen siendo constantes de
 * compilación — nadie puede activarlas manipulando el navegador, cambiar
 * su valor exige volver a desplegar con otra variable de entorno.
 */
export const ENABLE_GOOGLE_AUTH = PUBLIC_AUTH_GOOGLE_ENABLED === 'true';
export const ENABLE_PASSWORD_AUTH = PUBLIC_AUTH_PASSWORD_ENABLED === 'true';
