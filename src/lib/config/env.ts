import {
	PUBLIC_APP_ENV,
	PUBLIC_ENABLE_DEMO_DATA,
	PUBLIC_ENABLE_DEV_TOOLS
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
export const ENABLE_DEMO_DATA = !IS_PRODUCTION && PUBLIC_ENABLE_DEMO_DATA === 'true';
export const ENABLE_DEV_TOOLS = !IS_PRODUCTION && PUBLIC_ENABLE_DEV_TOOLS === 'true';
