import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeMock, rpcMock } = vi.hoisted(() => ({ invokeMock: vi.fn(), rpcMock: vi.fn() }));
vi.mock('$lib/supabase/client', () => ({ supabase: { functions: { invoke: invokeMock }, rpc: rpcMock, auth: { getSession: vi.fn(async () => ({ data: { session: null } })) }, from: vi.fn(() => { throw new Error('from() no se espera en estas pruebas de escritura'); }) } }));
import { MUNICIPAL_SUPPORT_CONSENT_VERSION, createMunicipalPetition, reportMunicipalPetition, reviewMunicipalPetitionReport, setMunicipalPetitionSupport } from './municipalService';

beforeEach(() => { vi.clearAllMocks(); });

describe('Muro municipal — invariantes del cliente de escritura', () => {
	it('crear una recogida NO envía lat/lng ni ningún punto controlable por el navegador', async () => {
		invokeMock.mockResolvedValue({ data: { id: 'petition-1' }, error: null });
		await createMunicipalPetition({ title: 'Reparar el parque infantil', requestText: 'Solicitamos reparar los elementos dañados del parque infantil.', targetName: 'Ayuntamiento', municipalityIneCode: '28079', issueId: '11111111-1111-4111-8111-111111111111' });
		expect(invokeMock).toHaveBeenCalledWith('create-municipal-petition', { body: { title: 'Reparar el parque infantil', requestText: 'Solicitamos reparar los elementos dañados del parque infantil.', targetName: 'Ayuntamiento', municipalityIneCode: '28079', issueId: '11111111-1111-4111-8111-111111111111' } });
		const body = invokeMock.mock.calls[0]?.[1]?.body as Record<string, unknown>; expect(body).not.toHaveProperty('lat'); expect(body).not.toHaveProperty('lng'); expect(body).not.toHaveProperty('point');
	});
	it('registrar un apoyo envía consentimiento explícito y la versión vigente', async () => { rpcMock.mockResolvedValue({ data: true, error: null }); await setMunicipalPetitionSupport('petition-1', true, true); expect(rpcMock).toHaveBeenCalledWith('set_municipal_petition_support', { p_petition_id: 'petition-1', p_supported: true, p_explicit_consent: true, p_consent_version: MUNICIPAL_SUPPORT_CONSENT_VERSION }); });
	it('retirar un apoyo no inventa ni conserva un consentimiento nuevo', async () => { rpcMock.mockResolvedValue({ data: false, error: null }); await setMunicipalPetitionSupport('petition-1', false); expect(rpcMock).toHaveBeenCalledWith('set_municipal_petition_support', { p_petition_id: 'petition-1', p_supported: false, p_explicit_consent: false, p_consent_version: null }); });
	it('reportar una recogida pasa solo id, motivo y detalle normalizado', async () => { rpcMock.mockResolvedValue({ data: 'report-1', error: null }); await reportMunicipalPetition('petition-1', 'personal_data', '  Incluye un teléfono  '); expect(rpcMock).toHaveBeenCalledWith('report_municipal_petition', { p_petition_id: 'petition-1', p_reason: 'personal_data', p_details: 'Incluye un teléfono' }); });
	it('la acción de moderación usa la RPC auditada, no updates directos', async () => { rpcMock.mockResolvedValue({ data: true, error: null }); await reviewMunicipalPetitionReport('report-1', 'hide_petition'); expect(rpcMock).toHaveBeenCalledWith('review_municipal_petition_report', { p_report_id: 'report-1', p_action: 'hide_petition' }); });
});
