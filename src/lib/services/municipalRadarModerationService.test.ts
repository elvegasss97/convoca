import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeMock, fromMock } = vi.hoisted(() => ({
	invokeMock: vi.fn(),
	fromMock: vi.fn()
}));

vi.mock('$lib/supabase/client', () => ({
	supabase: {
		functions: { invoke: invokeMock },
		from: fromMock
	}
}));

import { reviewDetectedMunicipalIssue } from './municipalRadarModerationService';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('Radar municipal — decisiones humanas', () => {
	it('publicar pasa exclusivamente por review-municipal-issue', async () => {
		invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
		await reviewDetectedMunicipalIssue('11111111-1111-4111-8111-111111111111', 'publish');
		expect(invokeMock).toHaveBeenCalledWith('review-municipal-issue', {
			body: {
				issueId: '11111111-1111-4111-8111-111111111111',
				action: 'publish'
			}
		});
		expect(fromMock).not.toHaveBeenCalled();
	});

	it('descartar usa el mismo flujo auditado y no borra directamente', async () => {
		invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
		await reviewDetectedMunicipalIssue('22222222-2222-4222-8222-222222222222', 'dismiss');
		expect(invokeMock).toHaveBeenCalledWith('review-municipal-issue', {
			body: {
				issueId: '22222222-2222-4222-8222-222222222222',
				action: 'dismiss'
			}
		});
		expect(fromMock).not.toHaveBeenCalled();
	});
});
