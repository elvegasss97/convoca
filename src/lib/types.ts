/**
 * Tipos centrales de dominio para Convoca.
 *
 * Estos tipos están diseñados para mapear 1:1 con las futuras tablas de
 * Supabase (Postgres). Los campos `id` son strings (uuid), las fechas son
 * strings ISO-8601 y las relaciones se referencian por id, tal y como
 * las devolvería una consulta de Supabase con `select('*')`.
 */

// ---------------------------------------------------------------------------
// Enumerados
// ---------------------------------------------------------------------------

/**
 * Ciclo de vida de una convocatoria. Los estados no son estrictamente
 * secuenciales: algunos son aditivos (p. ej. `identity_verified` y
 * `organization_verified` pueden coexistir con `published`), pero se
 * modelan como un único campo `status` en el prototipo para simplificar
 * las vistas de listado y moderación. El nivel de verificación detallado
 * vive en `Event.verification`.
 */
export type EventStatus =
	| 'draft'
	| 'pending_review'
	| 'published'
	| 'identity_verified'
	| 'organization_verified'
	| 'documentation_reviewed'
	| 'modified'
	| 'cancelled'
	| 'completed'
	| 'hidden'
	| 'rejected';

export type EventCategory =
	| 'concentracion'
	| 'manifestacion'
	| 'marcha'
	| 'accion_solidaria'
	| 'asamblea'
	| 'jornada_reivindicativa'
	| 'otro';

export type EventTheme =
	| 'vivienda'
	| 'medioambiente'
	| 'derechos_laborales'
	| 'servicios_publicos'
	| 'vecinal'
	| 'igualdad'
	| 'movilidad'
	| 'cultura'
	| 'solidaridad'
	| 'salud'
	| 'educacion'
	| 'otro';

/** Nivel de verificación acumulativo mostrado en la insignia pública. */
export type VerificationLevel =
	'none' | 'identity_verified' | 'organization_verified' | 'documentation_reviewed';

export type AttendanceKind = 'going' | 'interested';

export type OrganizerKind =
	'persona' | 'colectivo' | 'asociacion' | 'sindicato' | 'plataforma' | 'otro';

/** Estado de la comunicación/notificación previa a la autoridad competente. */
export type PriorCommunicationStatus =
	'not_required' | 'planned' | 'submitted' | 'acknowledged' | 'unknown';

export type VerificationDocumentType =
	'identity' | 'organization_registration' | 'prior_communication_receipt' | 'other';

export type VerificationDocumentStatus = 'pending' | 'approved' | 'rejected';

export type ReportReason =
	| 'incitacion_violencia'
	| 'informacion_falsa'
	| 'suplantacion'
	| 'contenido_partidista_encubierto'
	| 'spam'
	| 'otro';

export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export type ModerationAction = 'approve' | 'request_changes' | 'hide' | 'reject' | 'reinstate';

// ---------------------------------------------------------------------------
// Geografía
// ---------------------------------------------------------------------------

export interface GeoPoint {
	lat: number;
	lng: number;
}

export interface MeetingPoint {
	point: GeoPoint;
	label: string;
	address: string;
	city: string;
	province: string;
}

/** Recorrido opcional representado como una secuencia de puntos. */
export interface RouteLine {
	points: GeoPoint[];
	description?: string;
}

// ---------------------------------------------------------------------------
// Organizador
// ---------------------------------------------------------------------------

/**
 * Datos públicos del organizador — visibles para cualquier persona en la
 * página de una convocatoria. La documentación de verificación
 * (`VerificationDocument`) y los datos de la cuenta (`OrganizerPrivateProfile`,
 * en `$lib/auth/types`) se modelan por separado a propósito: nunca deben
 * mezclarse con este tipo ni exponerse en las vistas públicas.
 */
export interface Organizer {
	id: string;
	displayName: string;
	kind: OrganizerKind;
	bio?: string;
	contactEmail?: string;
	website?: string;
	avatarUrl?: string;
	/** Número de convocatorias publicadas por este organizador. Estimación pública. */
	publishedEventsCount: number;
	createdAt: string;
}

/** Alias explícito: `Organizer` es, por diseño, el perfil público del organizador. */
export type OrganizerPublicProfile = Organizer;

// ---------------------------------------------------------------------------
// Convocatoria (Event)
// ---------------------------------------------------------------------------

export interface EventVerification {
	level: VerificationLevel;
	identityVerifiedAt?: string;
	organizationVerifiedAt?: string;
	documentationReviewedAt?: string;
}

/** Contadores de asistencia. Se tratan siempre como estimaciones públicas. */
export interface AttendanceCounts {
	going: number;
	interested: number;
	/** Marca explícita de que estos números son aproximados, nunca un censo. */
	isEstimate: true;
}

export interface Event {
	id: string;
	slug: string;
	title: string;
	description: string;
	objective: string;
	category: EventCategory;
	themes: EventTheme[];
	/** Etiqueta libre cuando `themes` incluye `'otro'`, escrita por quien organiza. */
	customThemeLabel?: string;
	status: EventStatus;

	startAt: string;
	endAt?: string;
	durationMinutes?: number;

	meetingPoint: MeetingPoint;
	route?: RouteLine;

	organizerId: string;
	/** Id de la cuenta de usuario que creó la convocatoria. Determina quién puede editarla. */
	createdByUserId: string;

	verification: EventVerification;
	priorCommunication: PriorCommunicationStatus;

	rules: string[];
	peacefulDeclaration: boolean;

	attendance: AttendanceCounts;

	coverImageUrl?: string;

	createdAt: string;
	updatedAt: string;

	/** Presente cuando status es 'cancelled' o 'modified', para el aviso destacado. */
	statusNote?: string;

	/** El organizador la ha archivado desde su panel (solo eventos finalizados/cancelados). */
	archived?: boolean;
}

// ---------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------

/**
 * Respuesta de asistencia de un usuario a una convocatoria. Nunca se debe
 * unir con datos identificativos en las vistas públicas: los asistentes
 * no aparecen públicamente en ningún listado.
 */
export interface AttendanceResponse {
	id: string;
	eventId: string;
	/** Id de sesión/usuario anónimo, nunca un nombre visible públicamente. */
	userId: string;
	kind: AttendanceKind;
	createdAt: string;
}

// ---------------------------------------------------------------------------
// Actualizaciones del organizador
// ---------------------------------------------------------------------------

export interface EventUpdate {
	id: string;
	eventId: string;
	authorOrganizerId: string;
	title: string;
	body: string;
	/** Si esta actualización representa un cambio relevante (hora, lugar, cancelación). */
	isCritical: boolean;
	createdAt: string;
}

// ---------------------------------------------------------------------------
// Verificación / documentación privada
// ---------------------------------------------------------------------------

/**
 * Documento de verificación. Es privado por diseño: solo visible para el
 * propio organizador y para moderación, nunca en la página pública del
 * evento.
 */
export interface VerificationDocument {
	id: string;
	organizerId: string;
	eventId?: string;
	type: VerificationDocumentType;
	fileName: string;
	status: VerificationDocumentStatus;
	submittedAt: string;
	reviewedAt?: string;
	reviewerNote?: string;
}

// ---------------------------------------------------------------------------
// Reportes y moderación
// ---------------------------------------------------------------------------

export interface Report {
	id: string;
	eventId: string;
	reason: ReportReason;
	details?: string;
	status: ReportStatus;
	createdAt: string;
	resolvedAt?: string;
}

export interface AuditLog {
	id: string;
	eventId: string;
	action: ModerationAction;
	/** Id del moderador (anónimo en el prototipo, ligado a un usuario real en producción). */
	moderatorId: string;
	note?: string;
	createdAt: string;
}

// ---------------------------------------------------------------------------
// Filtros de búsqueda (Inicio / Mapa)
// ---------------------------------------------------------------------------

export type DateFilter = 'today' | 'this_weekend' | 'next_7_days' | 'next_30_days' | 'any';
export type DistanceFilter = 1 | 5 | 10 | 25 | 50 | null;

export interface EventFiltersState {
	query: string;
	date: DateFilter;
	distanceKm: DistanceFilter;
	categories: EventCategory[];
	themes: EventTheme[];
	verifiedOnly: boolean;
}

export const DEFAULT_FILTERS: EventFiltersState = {
	query: '',
	date: 'any',
	distanceKm: null,
	categories: [],
	themes: [],
	verifiedOnly: false
};
