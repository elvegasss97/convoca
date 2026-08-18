import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isRedirect } from '@sveltejs/kit';

/**
 * Mismo caso que `src/routes/moderacion/+page.test.ts` (hallazgo B1,
 * revisión PR #27), para la guarda de `/moderacion/temas/[id]`.
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

describe('/moderacion/temas/[id] load — guarda de acceso', () => {
	it('sin sesión: redirige a /acceso-interno, nunca a /login', async () => {
		getSessionMock.mockResolvedValue(null);
		try {
			// @ts-expect-error — solo se usa `params` en el guard, no hace falta un LoadEvent completo.
			await load({ params: { id: 'nuevo' } });
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
			await load({ params: { id: 'nuevo' } });
			expect.unreachable('debería haber lanzado un redirect');
		} catch (e) {
			expect(isRedirect(e)).toBe(true);
			if (isRedirect(e)) {
				expect(e.location).toBe('/acceso-interno');
			}
		}
	});
});
