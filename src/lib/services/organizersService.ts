import type { Organizer, VerificationDocument } from '$lib/types';
import type { Database } from '$lib/supabase/database.types';
import { supabase } from '$lib/supabase/client';
import { listEventsByOrganizer } from './eventsService';

type OrganizerUpdatePayload = Database['public']['Tables']['organizers']['Update'];

/**
 * Capa de acceso a datos de organizadores y su documentación de
 * verificación, sobre Supabase.
 *
 * A propósito NO hay `createOrganizer`/`deleteOrganizer`: el perfil público
 * de organizador se crea automáticamente al registrarse (trigger
 * `handle_new_user`, `supabase/migrations/0007_new_user_trigger.sql`) y se
 * borra en cascada cuando se elimina la cuenta (`on delete cascade` en
 * `organizers.created_by`, ver Edge Function `delete-account`). No existe
 * ninguna política RLS de INSERT/DELETE en `organizers` para `authenticated`
 * — solo la propia cuenta puede *editar* su perfil (`organizers_update_own`).
 */

interface OrganizerRow {
	id: string;
	display_name: string;
	kind: string;
	bio: string | null;
	contact_email: string | null;
	website: string | null;
	avatar_url: string | null;
	published_events_count: number;
	created_at: string;
}

function rowToOrganizer(row: OrganizerRow): Organizer {
	return {
		id: row.id,
		displayName: row.display_name,
		kind: row.kind as Organizer['kind'],
		bio: row.bio ?? undefined,
		contactEmail: row.contact_email ?? undefined,
		website: row.website ?? undefined,
		avatarUrl: row.avatar_url ?? undefined,
		publishedEventsCount: row.published_events_count,
		createdAt: row.created_at
	};
}

const ORGANIZER_COLUMNS =
	'id, display_name, kind, bio, contact_email, website, avatar_url, published_events_count, created_at';

export async function getOrganizer(id: string): Promise<Organizer | undefined> {
	const { data } = await supabase
		.from('organizers')
		.select(ORGANIZER_COLUMNS)
		.eq('id', id)
		.maybeSingle();
	return data ? rowToOrganizer(data) : undefined;
}

export async function listOrganizers(): Promise<Organizer[]> {
	const { data, error } = await supabase.from('organizers').select(ORGANIZER_COLUMNS);
	if (error) throw error;
	return (data ?? []).map(rowToOrganizer);
}

export async function updateOrganizerProfile(
	organizerId: string,
	patch: Partial<Pick<Organizer, 'displayName' | 'bio'>>
): Promise<Organizer> {
	const row: OrganizerUpdatePayload = {};
	if (patch.displayName !== undefined) row.display_name = patch.displayName;
	if (patch.bio !== undefined) row.bio = patch.bio ?? null;

	const { data, error } = await supabase
		.from('organizers')
		.update(row)
		.eq('id', organizerId)
		.select(ORGANIZER_COLUMNS)
		.single();
	if (error) throw error;
	return rowToOrganizer(data);
}

interface VerificationDocumentRow {
	id: string;
	organizer_id: string;
	event_id: string | null;
	type: string;
	file_name: string;
	storage_path: string;
	status: string;
	submitted_at: string;
	reviewed_at: string | null;
	reviewer_note: string | null;
}

function rowToDocument(row: VerificationDocumentRow): VerificationDocument {
	return {
		id: row.id,
		organizerId: row.organizer_id,
		eventId: row.event_id ?? undefined,
		type: row.type as VerificationDocument['type'],
		fileName: row.file_name,
		storagePath: row.storage_path,
		status: row.status as VerificationDocument['status'],
		submittedAt: row.submitted_at,
		reviewedAt: row.reviewed_at ?? undefined,
		reviewerNote: row.reviewer_note ?? undefined
	};
}

const DOCUMENT_COLUMNS =
	'id, organizer_id, event_id, type, file_name, storage_path, status, submitted_at, reviewed_at, reviewer_note';

/** Documentación privada del organizador: solo para el propio organizador y moderación (RLS). */
export async function getOrganizerDocuments(organizerId: string): Promise<VerificationDocument[]> {
	const { data, error } = await supabase
		.from('verification_documents')
		.select(DOCUMENT_COLUMNS)
		.eq('organizer_id', organizerId);
	if (error) throw error;
	return (data ?? []).map(rowToDocument);
}

/** Solo devuelve resultados si quien llama es moderador/admin (RLS lo exige). */
export async function listAllDocuments(): Promise<VerificationDocument[]> {
	const { data, error } = await supabase.from('verification_documents').select(DOCUMENT_COLUMNS);
	if (error) throw error;
	return (data ?? []).map(rowToDocument);
}

export async function getPendingDocuments(): Promise<VerificationDocument[]> {
	const { data, error } = await supabase
		.from('verification_documents')
		.select(DOCUMENT_COLUMNS)
		.eq('status', 'pending');
	if (error) throw error;
	return (data ?? []).map(rowToDocument);
}

export async function reviewDocument(
	documentId: string,
	status: 'approved' | 'rejected',
	reviewerNote?: string
): Promise<VerificationDocument> {
	const { data, error } = await supabase
		.from('verification_documents')
		.update({
			status,
			reviewed_at: new Date().toISOString(),
			reviewer_note: reviewerNote ?? null
		})
		.eq('id', documentId)
		.select(DOCUMENT_COLUMNS)
		.single();
	if (error) throw error;
	return rowToDocument(data);
}

/**
 * URL firmada de corta duración para ver el archivo real de un documento
 * de verificación (Centro de Operaciones, Fase 1). El bucket
 * `verification-documents` es privado (0006, `public = false`): nunca se
 * usa `getPublicUrl` ni se hace público el bucket. `createSignedUrl`
 * respeta la misma RLS de `storage.objects` que ya existía
 * (`verification_documents_storage_select_own_or_staff`) — esta función
 * no concede ningún acceso nuevo, solo genera el enlace temporal.
 *
 * `documentId` es la ÚNICA entrada — deliberadamente NO acepta un
 * `storagePath` aparte (corrige el hallazgo M1 de la revisión del PR
 * #27, ver 0053: antes se podían mandar por separado un `documentId` y
 * un `storagePath` de documentos distintos, y la auditoría quedaba
 * asociada al documento equivocado). El RPC `SECURITY DEFINER`
 * `log_verification_document_view` (0053) resuelve él mismo, en
 * servidor, el `storage_path` real de esa fila — revalidando permiso de
 * staff (rol + aal2) y que el documento exista — y lo devuelve; ese es
 * el ÚNICO valor que se usa para firmar la URL, así que no puede
 * divergir del que queda auditado.
 */
const VERIFICATION_DOCUMENT_SIGNED_URL_TTL_SECONDS = 120;

export async function getVerificationDocumentSignedUrl(documentId: string): Promise<string> {
	const { data: storagePath, error: logError } = await supabase.rpc(
		'log_verification_document_view',
		{ p_document_id: documentId }
	);
	if (logError || !storagePath) throw new Error('No tienes permiso para ver este documento.');

	const { data, error } = await supabase.storage
		.from('verification-documents')
		.createSignedUrl(storagePath, VERIFICATION_DOCUMENT_SIGNED_URL_TTL_SECONDS);
	if (error || !data?.signedUrl) throw new Error('No se ha podido generar el enlace al documento.');
	return data.signedUrl;
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
