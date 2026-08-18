import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * `getVerificationDocumentSignedUrl` (Centro de Operaciones, Fase 1) llama
 * primero al RPC `log_verification_document_view` (registra la
 * visualización y revalida permiso de staff en el propio Postgres, ver
 * `supabase/migrations/0051_verification_documents_secure_viewer.sql`) y
 * SOLO SI eso funciona pide la URL firmada a Storage. Este test comprueba
 * ese orden y que nunca se usa un archivo público (`getPublicUrl`).
 */
const { rpcMock, createSignedUrlMock, fromStorageMock, callOrder } = vi.hoisted(() => {
	const callOrder: string[] = [];
	const rpcMock = vi.fn(
		async (fn: string): Promise<{ data: null; error: { message: string } | null }> => {
			callOrder.push(`rpc:${fn}`);
			return { data: null, error: null };
		}
	);
	const createSignedUrlMock = vi.fn(
		async (
			path: string,
			ttl: number
		): Promise<{ data: { signedUrl: string } | null; error: Error | null }> => {
			callOrder.push('storage:createSignedUrl');
			return { data: { signedUrl: `https://signed.example/${path}?ttl=${ttl}` }, error: null };
		}
	);
	const fromStorageMock = vi.fn((bucket: string) => {
		if (bucket !== 'verification-documents') throw new Error(`bucket ${bucket} inesperado`);
		return { createSignedUrl: createSignedUrlMock };
	});
	return { rpcMock, createSignedUrlMock, fromStorageMock, callOrder };
});

vi.mock('$lib/supabase/client', () => ({
	supabase: {
		rpc: rpcMock,
		storage: { from: fromStorageMock },
		from: vi.fn(() => {
			throw new Error('from() no debería usarse en este test');
		})
	}
}));

import { getVerificationDocumentSignedUrl } from './organizersService';

beforeEach(() => {
	callOrder.length = 0;
	rpcMock.mockClear();
	createSignedUrlMock.mockClear();
});

describe('getVerificationDocumentSignedUrl', () => {
	it('registra la visualización ANTES de pedir la URL firmada', async () => {
		await getVerificationDocumentSignedUrl('doc-1', '22222222-2222-2222-2222-222222222222/doc.pdf');
		expect(callOrder).toEqual(['rpc:log_verification_document_view', 'storage:createSignedUrl']);
		expect(rpcMock).toHaveBeenCalledWith('log_verification_document_view', {
			p_document_id: 'doc-1'
		});
	});

	it('nunca usa un archivo público: siempre pasa por el bucket privado verification-documents con TTL corto', async () => {
		await getVerificationDocumentSignedUrl('doc-1', 'path/al/archivo.pdf');
		expect(fromStorageMock).toHaveBeenCalledWith('verification-documents');
		const [, ttl] = createSignedUrlMock.mock.calls[0];
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(300);
	});

	it('si el registro de auditoría falla (no es staff), NUNCA llega a pedir la URL firmada', async () => {
		rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'No tienes permiso' } });
		await expect(getVerificationDocumentSignedUrl('doc-1', 'path/al/archivo.pdf')).rejects.toThrow(
			'No tienes permiso para ver este documento.'
		);
		expect(createSignedUrlMock).not.toHaveBeenCalled();
	});

	it('si Storage falla al firmar, propaga un error legible', async () => {
		createSignedUrlMock.mockResolvedValueOnce({ data: null, error: new Error('boom') });
		await expect(getVerificationDocumentSignedUrl('doc-1', 'path/al/archivo.pdf')).rejects.toThrow(
			'No se ha podido generar el enlace al documento.'
		);
	});

	it('devuelve la URL firmada en caso de éxito', async () => {
		const url = await getVerificationDocumentSignedUrl('doc-1', 'ruta/archivo.pdf');
		expect(url).toContain('ruta/archivo.pdf');
	});
});
