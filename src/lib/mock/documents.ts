import type { VerificationDocument } from '$lib/types';

/**
 * Documentación privada de verificación. Solo debe usarse en el panel del
 * organizador (apartado privado) y en el panel de moderación. Nunca en
 * páginas públicas.
 */
export const mockVerificationDocuments: VerificationDocument[] = [
	{
		id: 'doc-1',
		organizerId: 'org-1',
		eventId: 'evt-1',
		type: 'organization_registration',
		fileName: 'registro-asociacion-vecinal-lavapies.pdf',
		status: 'approved',
		submittedAt: '2026-07-18T09:00:00.000Z',
		reviewedAt: '2026-07-20T09:00:00.000Z',
		reviewerNote: 'Registro de asociación verificado en el registro municipal.'
	},
	{
		id: 'doc-2',
		organizerId: 'org-2',
		eventId: 'evt-2',
		type: 'identity',
		fileName: 'identidad-representante-rios-vivos.pdf',
		status: 'approved',
		submittedAt: '2026-07-13T09:00:00.000Z',
		reviewedAt: '2026-07-15T09:00:00.000Z'
	},
	{
		id: 'doc-3',
		organizerId: 'org-3',
		eventId: 'evt-3',
		type: 'prior_communication_receipt',
		fileName: 'justificante-comunicacion-previa-delegacion.pdf',
		status: 'approved',
		submittedAt: '2026-07-03T09:00:00.000Z',
		reviewedAt: '2026-07-05T09:00:00.000Z',
		reviewerNote: 'Justificante de registro de comunicación previa verificado.'
	},
	{
		id: 'doc-4',
		organizerId: 'org-8',
		eventId: 'evt-8',
		type: 'identity',
		fileName: 'identidad-portavoz-asamblea-sanidad.pdf',
		status: 'pending',
		submittedAt: '2026-07-28T08:30:00.000Z'
	},
	{
		id: 'doc-5',
		organizerId: 'org-12',
		eventId: 'evt-15',
		type: 'other',
		fileName: 'declaracion-caracter-pacifico.pdf',
		status: 'rejected',
		submittedAt: '2026-07-24T08:00:00.000Z',
		reviewedAt: '2026-07-25T09:00:00.000Z',
		reviewerNote:
			'La declaración aportada no acredita de forma suficiente el carácter pacífico de la acción.'
	}
];

export function getDocumentsForOrganizer(organizerId: string): VerificationDocument[] {
	return mockVerificationDocuments.filter((d) => d.organizerId === organizerId);
}

export function getPendingDocuments(): VerificationDocument[] {
	return mockVerificationDocuments.filter((d) => d.status === 'pending');
}
