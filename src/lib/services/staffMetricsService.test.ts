import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, selectMock } = vi.hoisted(() => ({
	fromMock: vi.fn(),
	selectMock: vi.fn()
}));

vi.mock('$lib/supabase/client', () => ({
	supabase: {
		from: fromMock
	}
}));

import { getRegisteredUserCount } from './staffMetricsService';

beforeEach(() => {
	vi.clearAllMocks();
	fromMock.mockReturnValue({ select: selectMock });
	selectMock.mockResolvedValue({ count: 12, error: null });
});

describe('getRegisteredUserCount', () => {
	it('cuenta perfiles sin descargar filas ni datos personales', async () => {
		await expect(getRegisteredUserCount()).resolves.toBe(12);
		expect(fromMock).toHaveBeenCalledWith('profiles');
		expect(selectMock).toHaveBeenCalledWith('id', { count: 'exact', head: true });
	});

	it('devuelve cero cuando PostgREST no devuelve count', async () => {
		selectMock.mockResolvedValue({ count: null, error: null });
		await expect(getRegisteredUserCount()).resolves.toBe(0);
	});

	it('propaga errores de Supabase', async () => {
		const error = new Error('fallo de conteo');
		selectMock.mockResolvedValue({ count: null, error });
		await expect(getRegisteredUserCount()).rejects.toBe(error);
	});
});
