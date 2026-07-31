import { browser } from '$app/environment';
import type { UserSession } from './types';
import { authService } from './authService';

/**
 * Estado de sesión reactivo, compartido por toda la app (barra de
 * navegación, guards de ruta, panel del organizador...). Se sincroniza con
 * `authService` al arrancar y ante cualquier cambio (login/logout/registro),
 * incluidos los que ocurren en otra pestaña.
 */
export const authState = $state<{ session: UserSession | null; ready: boolean }>({
	session: null,
	ready: false
});

if (browser) {
	authService.getSession().then((session) => {
		authState.session = session;
		authState.ready = true;
	});
	authService.onAuthStateChange((session) => {
		authState.session = session;
	});
}
