import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authService } from '$lib/auth/authService';
import { getOrganizerDashboard } from '$lib/services/organizersService';

/** Forzado a CSR: ver el mismo comentario en `src/routes/moderacion/+page.ts`. */
export const ssr = false;

export const load: PageLoad = async ({ url }) => {
	const session = await authService.getSession();

	if (!session || (session.user.role !== 'organizer' && session.user.role !== 'admin')) {
		redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	if (!session.user.organizerId) {
		// No debería ocurrir en el mock (todo rol organizer trae organizerId),
		// pero por robustez evitamos un panel a medio construir.
		redirect(303, '/descubrir');
	}

	const dashboard = await getOrganizerDashboard(session.user.organizerId);
	return { session, ...dashboard };
};
