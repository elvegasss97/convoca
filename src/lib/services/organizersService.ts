import type { Organizer, OrganizerKind, VerificationDocument } from '$lib/types';
import { mockOrganizers } from '$lib/mock/organizers';
import { mockVerificationDocuments } from '$lib/mock/documents';
import { loadPersisted, savePersisted } from '$lib/utils/persistedArray';
import { randomId } from '$lib/utils/id';
import { listEventsByOrganizer } from './eventsService';

const ORGANIZERS_KEY = 'organizers';
const organizers: Organizer[] = loadPersisted(ORGANIZERS_KEY, mockOrganizers);

function persistOrganizers(): void {
	savePersisted(ORGANIZERS_KEY, organizers);
}

/**
 * La documentación de verificación NUNCA se persiste en localStorage (a
 * diferencia de convocatorias, actualizaciones o el perfil público del
 * organizador): es el dato más sensible del prototipo, así que solo vive en
 * memoria y se pierde al recargar la página. En producción esto sería un
 * archivo en Supabase Storage con acceso restringido por RLS, nunca datos
 * de cliente.
 */
const documents: VerificationDocument[] = [...mockVerificationDocuments];

function delay<T>(value: T): Promise<T> {
	return Promise.resolve(value);
}

export async function getOrganizer(id: string): Promise<Organizer | undefined> {
	return delay(organizers.find((o) => o.id === id));
}

export async function listOrganizers(): Promise<Organizer[]> {
	return delay(organizers);
}

export interface NewOrganizerInput {
	displayName: string;
	kind: OrganizerKind;
	bio?: string;
	contactEmail?: string;
}

/** Crea el perfil público de organizador asociado a una cuenta nueva (ver `$lib/auth`). */
export async function createOrganizer(input: NewOrganizerInput): Promise<Organizer> {
	const organizer: Organizer = {
		...input,
		id: `org-${randomId().slice(0, 8)}`,
		publishedEventsCount: 0,
		createdAt: new Date().toISOString()
	};
	organizers.push(organizer);
	persistOrganizers();
	return delay(organizer);
}

export async function updateOrganizerProfile(
	organizerId: string,
	patch: Partial<Pick<Organizer, 'displayName' | 'bio'>>
): Promise<Organizer> {
	const index = organizers.findIndex((o) => o.id === organizerId);
	if (index === -1) throw new Error(`Organizador no encontrado: ${organizerId}`);
	const updated = { ...organizers[index], ...patch };
	organizers[index] = updated;
	persistOrganizers();
	return delay(updated);
}

export async function deleteOrganizer(organizerId: string): Promise<void> {
	const index = organizers.findIndex((o) => o.id === organizerId);
	if (index === -1) return;
	organizers.splice(index, 1);
	persistOrganizers();
}

/** Documentación privada del organizador: solo para el propio organizador y moderación. */
export async function getOrganizerDocuments(organizerId: string): Promise<VerificationDocument[]> {
	return delay(documents.filter((d) => d.organizerId === organizerId));
}

export async function listAllDocuments(): Promise<VerificationDocument[]> {
	return delay(documents);
}

export async function getPendingDocuments(): Promise<VerificationDocument[]> {
	return delay(documents.filter((d) => d.status === 'pending'));
}

export async function reviewDocument(
	documentId: string,
	status: 'approved' | 'rejected',
	reviewerNote?: string
): Promise<VerificationDocument> {
	const index = documents.findIndex((d) => d.id === documentId);
	if (index === -1) throw new Error(`Documento no encontrado: ${documentId}`);
	const updated: VerificationDocument = {
		...documents[index],
		status,
		reviewedAt: new Date().toISOString(),
		reviewerNote
	};
	documents[index] = updated;
	return delay(updated);
}

/** Agregado usado por el panel del organizador. */
export async function getOrganizerDashboard(organizerId: string) {
	const [organizer, events, orgDocuments] = await Promise.all([
		getOrganizer(organizerId),
		listEventsByOrganizer(organizerId),
		getOrganizerDocuments(organizerId)
	]);

	const estimatedAttendance = events.reduce(
		(sum, e) => sum + e.attendance.going + e.attendance.interested,
		0
	);

	return { organizer, events, documents: orgDocuments, estimatedAttendance };
}
