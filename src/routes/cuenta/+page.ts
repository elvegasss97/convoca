import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authService, getMyOrganizerPrivateProfile } from '$lib/auth/authService';
import { getOrganizer } from '$lib/services/organizersService';

/** Forzado a CSR: ver el mismo comentario en `src/routes/moderacion/+page.ts`. */
export const ssr = false;

export const load: PageLoad = async ({ url }) => {
	const session = await authService.getSession();
	if (!session) {
		redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	const [organizer, privateProfile] = await Promise.all([
		session.user.organizerId ? getOrganizer(session.user.organizerId) : Promise.resolve(undefined),
		getMyOrganizerPrivateProfile(session.user.id)
	]);

	return { session, organizer, privateProfile };
};
