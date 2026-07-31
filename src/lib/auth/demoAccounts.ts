import type { UserRole } from './types';

/**
 * Datos de las cuentas de demostración. Vive en su propio módulo, separado
 * de `authService.ts`, para que se pueda importar de forma **dinámica y
 * condicional** (`await import(...)`) solo cuando
 * `ENABLE_DEMO_DATA`/`ENABLE_DEV_TOOLS` están activos (ver
 * `src/lib/config/env.ts`). Con un import dinámico dentro de una rama
 * `if (ENABLE_DEMO_DATA)` cuya condición es una constante conocida en
 * tiempo de compilación, el bundler elimina esta rama entera (y este
 * archivo) del bundle de producción: ni el email ni la contraseña de
 * demostración llegan a viajar al navegador de un usuario real.
 */

export const DEMO_PASSWORD = 'Convoca123!';

export interface DemoAccountSeed {
	id: string;
	email: string;
	role: UserRole;
	organizerId?: string;
	label: string;
}

export const DEMO_ACCOUNTS: DemoAccountSeed[] = [
	{
		id: 'user-org-1',
		email: 'organizador@convoca.demo',
		role: 'organizer',
		organizerId: 'org-1',
		label: 'Organizador — Asociación Vecinal Lavapiés'
	},
	{
		id: 'user-org-2',
		email: 'organizador2@convoca.demo',
		role: 'organizer',
		organizerId: 'org-2',
		label: 'Organizador — Marea Verde Ríos Vivos'
	},
	{
		id: 'user-mod-1',
		email: 'moderador@convoca.demo',
		role: 'moderator',
		label: 'Moderador'
	}
];
