import type { DemoAccountSeed } from './demoAccounts';

/**
 * Sustituto vacío de `demoAccounts.ts`, usado SOLO en builds de producción.
 *
 * Comprobamos empíricamente que ocultar el import dinámico de
 * `demoAccounts.ts` detrás de un `if (ENABLE_DEMO_DATA)` NO basta: Rollup
 * genera un chunk físico para cualquier `import()` con especificador
 * estático, se llegue o no a ejecutar esa rama en tiempo de ejecución. El
 * resultado era un archivo público en `_app/immutable/chunks/*.js` con la
 * contraseña y los correos de demostración en texto plano, servido igual en
 * producción aunque la app nunca lo importara.
 *
 * La solución real es sustituir el módulo entero en `vite.config.ts`
 * (mediante `resolve.alias`, solo cuando `PUBLIC_APP_ENV=production`) para
 * que el chunk que se genera para producción sea ESTE archivo — sin datos —
 * en vez de `demoAccounts.ts`.
 */
export const DEMO_PASSWORD = '';
export const DEMO_ACCOUNTS: DemoAccountSeed[] = [];
