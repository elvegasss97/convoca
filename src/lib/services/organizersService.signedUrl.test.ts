import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * `getVerificationDocumentSignedUrl` (Centro de Operaciones) llama
 * primero al RPC `log_verification_document_view` — que revalida permiso
 * de staff en el propio Postgres y RESUELVE el `storage_path` real de
 * `documentId` (ver `supabase/migrations/0053_fix_verification_document_
 * view_authoritative_path.sql`) — y usa EXACTAMENTE ese valor devuelto
 * para pedir la URL firmada a Storage. `documentId` es la única entrada:
 * la función ya no acepta ningún `storagePath` aparte, así que no hay
 * forma de que la URL abierta corresponda a un documento distinto del
 * que queda auditado (corrige el hallazgo M1 de la revisión del PR #27).
 */
const { rpcMock, createSignedUrlMock, fromStorageMock, callOrder } = vi.hoisted(() => {
	const callOrder: string[] = [];
	const rpcMock = vi.fn(
		async (
			_fn: string,
			args: { p_document_id: string }
		): Promise<{ data: string | null; error: { message: string } | null }> => {
			callOrder.push(`rpc:${args.p_document_id}`);
			return { data: `storage/path/for/${args.p_document_id}.pdf`, error: null };
		}
	);
	const createSignedUrlMock = vi.fn(
		async (
			path: string,
			ttl: number
		): Promise<{ data: { signedUrl: string } | null; error: Error | null }> => {
			callOrder.push(`storage:${path}`);
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
	it('documento válido: la URL firmada usa EXACTAMENTE el storage_path que devuelve el RPC para ese documentId', async () => {
		const url = await getVerificationDocumentSignedUrl('doc-A');
		expect(callOrder).toEqual(['rpc:doc-A', 'storage:storage/path/for/doc-A.pdf']);
		expect(createSignedUrlMock).toHaveBeenCalledWith(
			'storage/path/for/doc-A.pdf',
			expect.any(Number)
		);
		expect(url).toContain('storage/path/for/doc-A.pdf');
	});

	it('registra la visualización (vía el RPC) ANTES de pedir la URL firmada', async () => {
		await getVerificationDocumentSignedUrl('doc-1');
		expect(callOrder).toEqual(['rpc:doc-1', 'storage:storage/path/for/doc-1.pdf']);
		expect(rpcMock).toHaveBeenCalledWith('log_verification_document_view', {
			p_document_id: 'doc-1'
		});
	});

	it('es estructuralmente imposible mezclar documentId y storagePath: la función solo acepta un parámetro, cualquier segundo argumento se ignora por completo', async () => {
		// TypeScript ya rechaza en compilación pasar un segundo argumento
		// (`Expected 1 arguments, but got 2`) — el `as` de abajo solo existe
		// para poder demostrar EN TIEMPO DE EJECUCIÓN que, si alguien se
		// saltara ese aviso (p. ej. llamando la función compilada desde
		// fuera de TypeScript), el intento de "storagePath" independiente
		// se ignora por completo: la función real declarada en
		// `organizersService.ts` solo tiene un parámetro.
		const callWithExtraArg = getVerificationDocumentSignedUrl as (
			documentId: string,
			ignoredSecondArg?: string
		) => Promise<string>;
		const url = await callWithExtraArg('doc-1', 'ruta/inventada/por/el-cliente.pdf');
		// La URL usada es la resuelta por el RPC para doc-1, NUNCA la ruta
		// inventada — no hay ningún camino de código que la lea.
		expect(createSignedUrlMock).toHaveBeenCalledWith(
			'storage/path/for/doc-1.pdf',
			expect.any(Number)
		);
		expect(url).not.toContain('ruta/inventada');
	});

	it('documento inexistente / sin permiso (no-staff, o staff sin aal2): el RPC falla y nunca se llega a pedir la URL firmada', async () => {
		rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'No tienes permiso' } });
		await expect(getVerificationDocumentSignedUrl('doc-inexistente')).rejects.toThrow(
			'No tienes permiso para ver este documento.'
		);
		expect(createSignedUrlMock).not.toHaveBeenCalled();
	});

	it('si el RPC no devuelve error pero tampoco storage_path (defensivo), tampoco se llega a Storage', async () => {
		rpcMock.mockResolvedValueOnce({ data: null, error: null });
		await expect(getVerificationDocumentSignedUrl('doc-raro')).rejects.toThrow(
			'No tienes permiso para ver este documento.'
		);
		expect(createSignedUrlMock).not.toHaveBeenCalled();
	});

	it('nunca usa un archivo público: siempre pasa por el bucket privado verification-documents con TTL corto', async () => {
		await getVerificationDocumentSignedUrl('doc-1');
		expect(fromStorageMock).toHaveBeenCalledWith('verification-documents');
		const [, ttl] = createSignedUrlMock.mock.calls[0];
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(300);
	});

	it('si Storage falla al firmar, propaga un error legible', async () => {
		createSignedUrlMock.mockResolvedValueOnce({ data: null, error: new Error('boom') });
		await expect(getVerificationDocumentSignedUrl('doc-1')).rejects.toThrow(
			'No se ha podido generar el enlace al documento.'
		);
	});
});
