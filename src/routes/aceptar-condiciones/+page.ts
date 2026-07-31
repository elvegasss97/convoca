import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	authService,
	getMyOrganizerPrivateProfile,
	hasCompletedLegalAcceptance
} from '$lib/auth/authService';
import { safeRedirect } from '$lib/utils/safeRedirect';

/**
 * Paso obligatorio antes de crear la primera convocatoria (ver
 * `/crear/+page.svelte`, que redirige aquí desde `submit()` si la cuenta
 * todavía no tiene las tres aceptaciones legales vigentes). Si la cuenta
 * ya las tiene —caso normal para quienes se registraron por correo, que
 * las aceptan en el propio formulario de `/registro`— esta pantalla no
 * tiene nada que mostrar y se salta sola.
 */
export const load: PageLoad = async ({ url }) => {
	const session = await authService.getSession();
	const destination = safeRedirect(url.searchParams.get('redirect'), '/organizador');

	if (!session) {
		redirect(303, `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
	}
	if (!session.user.organizerId) {
		redirect(303, '/');
	}

	const profile = await getMyOrganizerPrivateProfile(session.user.id);
	if (hasCompletedLegalAcceptance(profile)) {
		redirect(303, destination);
	}

	return { userId: session.user.id, destination };
};
