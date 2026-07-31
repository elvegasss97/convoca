/**
 * Especificador virtual resuelto por alias en `vite.config.ts`: apunta a
 * `demoAccounts.ts` (real) en desarrollo/staging, o a `demoAccounts.empty.ts`
 * (vacío) cuando `PUBLIC_APP_ENV=production`. Ver el comentario en
 * `vite.config.ts` para la razón por la que hace falta este nivel de
 * indirección en vez de un simple `import()` condicional.
 */
declare module 'convoca:demo-accounts' {
	import type { DemoAccountSeed } from './demoAccounts';

	export type { DemoAccountSeed };
	export const DEMO_PASSWORD: string;
	export const DEMO_ACCOUNTS: DemoAccountSeed[];
}
