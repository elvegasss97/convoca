import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isRedirect } from '@sveltejs/kit';

/**
 * Cubre solo la guarda de acceso de `/moderacion` (hallazgo B1, revisión
 * PR #27): el estado "not-staff" (sin sesión, o sesión con un rol que no
 * es moderator/admin) debe redirigir explícitamente a `/acceso-interno`
 * — antes redirigía a `/login`, la pantalla de Google para ciudadanía,
 * que nunca concede acceso aquí y dejaba a quien llegara sin sesión de
 * staff en un callejón sin salida real.
 *
 * `$lib/supabase/client` se mockea para que las consultas de datos del
 * resto de `load()` (que solo se ejecutan tras pasar la guarda) fallen
 * ruidosamente si alguna vez llegaran a invocarse en estos casos — no
 * deben, porque `redirect()` corta la ejecución antes.
 */
const { getSessionMock, currentStaffAccessStepMock } = vi.hoisted(() => ({
	getSessionMock: vi.fn(async () => null as { user: { id: string; role: string } } | null),
	currentStaffAccessStepMock: vi.fn(async () => 'proceed' as string)
}));

vi.mock('$lib/auth/authService', () => ({
	authService: { getSession: getSessionMock }
}));
vi.mock('$lib/auth/staffAuthService', () => ({
	currentStaffAccessStep: currentStaffAccessStepMock
}));
vi.mock('$lib/supabase/client', () => ({
	supabase: {
		from: vi.fn(() => {
			throw new Error('no debería consultarse datos: la guarda debe redirigir antes');
		}),
		rpc: vi.fn(() => {
			throw new Error('no debería consultarse datos: la guarda debe redirigir antes');
		})
	}
}));

import { load } from './+page';

beforeEach(() => {
	vi.clearAllMocks();
	getSessionMock.mockResolvedValue(null);
});

describe('/moderacion load — guarda de acceso', () => {
	it('sin sesión: redirige a /acceso-interno, nunca a /login', async () => {
		getSessionMock.mockResolvedValue(null);
		try {
			// @ts-expect-error — el load real no usa el LoadEvent completo tras quitar `url` (B1).
			await load();
			expect.unreachable('debería haber lanzado un redirect');
		} catch (e) {
			expect(isRedirect(e)).toBe(true);
			if (isRedirect(e)) {
				expect(e.status).toBe(303);
				expect(e.location).toBe('/acceso-interno');
			}
		}
	});

	it('sesión con rol no-staff (organizer): redirige a /acceso-interno, nunca a /login', async () => {
		getSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'organizer' } });
		try {
			// @ts-expect-error — ver el test anterior.
			await load();
			expect.unreachable('debería haber lanzado un redirect');
		} catch (e) {
			expect(isRedirect(e)).toBe(true);
			if (isRedirect(e)) {
				expect(e.location).toBe('/acceso-interno');
			}
		}
	});
});
