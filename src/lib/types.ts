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

export type ModerationAction =
	| 'approve'
	| 'request_changes'
	| 'hide'
	| 'reject'
	| 'reinstate'
	| 'hide_channel'
	| 'unhide_channel';

export type ChannelPlatform = 'whatsapp' | 'telegram' | 'other';
export type ChannelType = 'group' | 'channel' | 'community' | 'other';

export type ChannelReportReason =
	| 'enlace_roto'
	| 'spam'
	| 'estafa'
	| 'suplantacion'
	| 'no_pertenece_organizador'
	| 'contenido_violento_ilegal'
	| 'otro';

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
// Canales de coordinación (WhatsApp / Telegram / otro)
// ---------------------------------------------------------------------------

/**
 * Enlace opcional de coordinación de una convocatoria. Público solo cuando
 * `!isHidden` y la convocatoria está en un estado público (ver
 * `channels_select_public` en `supabase/migrations/0021_communication_channels.sql`).
 * Convoca nunca registra quién abre o pulsa uno de estos enlaces.
 */
export interface CommunicationChannel {
	id: string;
	eventId: string;
	platform: ChannelPlatform;
	channelType: ChannelType;
	label?: string;
	url: string;
	isHidden: boolean;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------

/**
 * Fila de `attendance_responses` en Supabase. No hay `userId`: la tabla no
 * tiene ninguna columna de identidad (ver
 * `supabase/migrations/0009_attendance_responses.sql`). `dedupToken` es un
 * identificador de dispositivo generado por el propio navegador, nunca una
 * cuenta ni una persona, y la tabla no tiene política de SELECT para nadie
 * — solo se leen contadores agregados (`AttendanceCounts`), nunca filas
 * individuales.
 */
export interface AttendanceResponse {
	id: string;
	eventId: string;
	dedupToken: string;
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
	/** Presente solo en acciones `hide_channel`/`unhide_channel`. */
	channelId?: string;
}

/** Reporte de un canal de coordinación. Nunca público, ni para quien reporta ni para el organizador. */
export interface ChannelReport {
	id: string;
	channelId: string;
	reason: ChannelReportReason;
	details?: string;
	status: ReportStatus;
	createdAt: string;
	resolvedAt?: string;
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

// ---------------------------------------------------------------------------
// Pulso ciudadano
// ---------------------------------------------------------------------------

export type ConcernCategory =
	| 'vivienda'
	| 'sanidad'
	| 'empleo'
	| 'educacion'
	| 'seguridad'
	| 'coste_vida'
	| 'transporte'
	| 'medioambiente';

export type ConcernScopeType = 'nacional' | 'comunidad_autonoma' | 'provincia' | 'municipio';

export interface ConcernScope {
	type: ConcernScopeType;
	/** Nombre de la comunidad/provincia/municipio. undefined cuando type es 'nacional'. */
	value?: string;
}

export type ConcernStatus = 'draft' | 'published' | 'archived';

/** Nivel de respuesta de la escala de Pulso ciudadano (1 = Nada, 5 = Es prioritario). */
export type ConcernLevel = 1 | 2 | 3 | 4 | 5;

export interface Concern {
	id: string;
	slug: string;
	category: ConcernCategory;
	question: string;
	description: string;
	/** "Quién publica". Siempre "Convoca" por ahora — ver comentario en la migración. */
	publisherLabel: string;
	scope: ConcernScope;
	status: ConcernStatus;
	startsAt: string;
	/** undefined = permanece activa, sin fecha de cierre. */
	closesAt?: string;
	createdBy?: string;
	createdAt: string;
	updatedAt: string;
}

/** Distribución de respuestas por nivel (siempre las 5 claves presentes, aunque el conteo sea 0). */
export type ConcernLevelCounts = Record<ConcernLevel, number>;

export interface ConcernResults {
	concernId: string;
	counts: ConcernLevelCounts;
	totalResponses: number;
	/** Media aritmética de los niveles (1-5). undefined si totalResponses es 0 (evita dividir entre cero). */
	averageLevel?: number;
}

/** Estado de la propia cuenta frente a una preocupación concreta. */
export interface MyConcernResponse {
	concernId: string;
	level: ConcernLevel;
}

export type ConcernProposalStatus = 'pending' | 'approved' | 'rejected';

export interface ConcernProposal {
	id: string;
	proposerUserId: string;
	title: string;
	proposedQuestion: string;
	category: ConcernCategory;
	description: string;
	scope: ConcernScope;
	reason: string;
	status: ConcernProposalStatus;
	reviewerNote?: string;
	reviewedBy?: string;
	reviewedAt?: string;
	resultingConcernId?: string;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Pulso ciudadano — Temas ("Preocupaciones → Soluciones")
// ---------------------------------------------------------------------------

export type TopicStatus = 'draft' | 'open' | 'reviewed' | 'archived';

export interface TopicSource {
	id: string;
	topicId: string;
	label: string;
	url?: string;
	note?: string;
	sortOrder: number;
	createdAt: string;
}

export interface TopicDataPoint {
	id: string;
	topicId: string;
	label: string;
	value: string;
	/** Explicación breve de la cifra, distinta del valor mostrado en la tarjeta. */
	explanation?: string;
	/** Ámbito temporal de la cifra (p. ej. "2022-2024"). */
	timeScope?: string;
	sourceId?: string;
	sortOrder: number;
	createdAt: string;
}

/** Línea presupuestaria del desglose económico estructurado (sección "Coste"). */
export interface TopicBudgetLine {
	id: string;
	topicId: string;
	name: string;
	minAmount: number;
	maxAmount: number;
	description?: string;
	note?: string;
	/** Token de color del proyecto, p. ej. "brand-700" — nunca un hex suelto. */
	colorToken: string;
	sortOrder: number;
}

/** Escenario de inversión (mínimo/central/máximo) del desglose económico. */
export interface TopicBudgetScenario {
	id: string;
	topicId: string;
	key: 'min' | 'central' | 'max';
	label: string;
	/** Inversión media anual del escenario, en millones de euros. */
	total: number;
	description?: string;
	sortOrder: number;
}

/** Distribución anual de la inversión (2027-2036 en Vivienda) para la barra temporal. */
export interface TopicBudgetTimelineEntry {
	id: string;
	topicId: string;
	year: number;
	minAmount: number;
	maxAmount: number;
	note?: string;
	/** true cuando la cifra es la media de un tramo plurianual repartida a partes iguales, no un dato distinto por año. */
	isPeriodAverage: boolean;
}

export interface Topic {
	id: string;
	slug: string;
	title: string;
	summary: string;
	/** undefined = "categoría pendiente", un estado legítimo mientras no haya contenido real. Reutiliza las categorías de Pulso. */
	category?: ConcernCategory;
	coverImageUrl?: string;
	status: TopicStatus;
	/** Nombre del documento/plan (p. ej. "Plan Vivienda 2036"), distinto del título corto del tema. */
	documentTitle?: string;
	problemIntro: string;
	/** Desglose económico largo (líneas presupuestarias, escenarios, distribución temporal). Se muestra expandible, igual que problemIntro. */
	budgetNarrative?: string;
	/** Reglas para evitar doble contabilización en el desglose económico (p. ej. "una transferencia del Estado a una comunidad se cuenta una sola vez"). */
	budgetDoubleCountRules: string[];
	/** Reglas de comprobación (evaluación anual/bienal/intermedia/final, condiciones para ampliar/modificar/suspender una medida). Se muestra en su propio acordeón. */
	evaluationRules?: string;
	/** Cifra de inversión en formato ya legible (p. ej. "10.000–12.000 M€/año"). Nunca calculada aquí. */
	investmentRange?: string;
	/** Esfuerzo relativo ya formateado (p. ej. "0,6 % del PIB"). */
	investmentGdpPercent?: string;
	/** Objetivo de referencia del plan (p. ej. "Parque público cercano al 5 % en 2036"). */
	referenceGoal?: string;
	/** Quién puede hacer qué: competencia estatal, acuerdo con comunidades, ejecución autonómica, objetivo sujeto a memoria económica. */
	governanceNarrative?: string;
	/** Aviso público específico del tema (p. ej. "no es una ley aprobada..."). Distinto del aviso genérico ya mostrado en la ficha. */
	publicNotice?: string;
	/** "Qué podría salir mal" a nivel de todo el tema. */
	risksOverview: string[];
	/** "Cómo sabríamos si funciona" a nivel de todo el tema. */
	successIndicators: string[];
	version: string;
	publishedAt?: string;
	createdBy?: string;
	createdAt: string;
	updatedAt: string;
}

export interface TopicMeasureAxis {
	id: string;
	topicId: string;
	title: string;
	sortOrder: number;
	createdAt: string;
}

export type MeasureStance = 'favor' | 'en_contra' | 'modificaria';
export type MeasurePriority = 'alta' | 'media' | 'baja';

export interface TopicMeasure {
	id: string;
	topicId: string;
	axisId?: string;
	title: string;
	/** Resumen breve para la tarjeta colapsada, distinto de la explicación completa. */
	summary?: string;
	/** Problema concreto que esta medida intenta resolver. */
	problemAddressed?: string;
	explanation: string;
	/** "Funcionamiento": cómo se llevaría a la práctica. */
	howItWorks?: string;
	responsibleScope?: string;
	estimatedCost?: string;
	/** Límite inferior de estimatedCost en millones de euros, para gráficos. Aditivo: estimatedCost sigue siendo el texto mostrado en tarjetas y mapa. */
	estimatedCostMin?: number;
	/** Límite superior de estimatedCost en millones de euros, para gráficos. */
	estimatedCostMax?: number;
	timeframe?: string;
	argumentsFor?: string;
	risks?: string;
	/** "Indicadores para medirla", propios de esta medida. */
	indicators: string[];
	/** Salvaguarda: qué no contará como éxito de esta medida. */
	safeguard?: string;
	sortOrder: number;
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
}

export type MeasureStanceCounts = Record<MeasureStance, number>;

export interface MeasureResults {
	measureId: string;
	counts: MeasureStanceCounts;
	totalResponses: number;
}

export interface MyMeasureResponse {
	measureId: string;
	stance: MeasureStance;
	priority?: MeasurePriority;
}

/**
 * `pending`/`approved`/`rejected` = flujo simple ya existente (alternativa
 * rápida o modificación general, sin ronda). El resto = "propuesta
 * desarrollada" dentro de una ronda de participación.
 */
export type TopicMeasureAlternativeStatus =
	| 'pending'
	| 'approved'
	| 'rejected'
	| 'draft'
	| 'enviada'
	| 'pendiente_revision'
	| 'necesita_cambios'
	| 'publicada'
	| 'en_estudio'
	| 'incorporada_total'
	| 'incorporada_parcial'
	| 'no_incorporada'
	| 'archivada';

export interface TopicMeasureAlternative {
	id: string;
	topicId: string;
	/** undefined = alternativa general sobre el tema completo, no ligada a una medida concreta. */
	measureId?: string;
	/** undefined = flujo simple ya existente. Presente = "propuesta desarrollada" ligada a una ronda. */
	roundId?: string;
	proposerUserId: string;
	title: string;
	description: string;
	status: TopicMeasureAlternativeStatus;
	/** "Parte de la medida que modificaría" (propuesta desarrollada). */
	measurePart?: string;
	/** "Motivo" del cambio propuesto (propuesta desarrollada). */
	reason?: string;
	expectedEffect?: string;
	acknowledgedRisks?: string;
	sourceUrl?: string;
	/** Respuesta editorial pública de Convoca, cuando exista. */
	editorialResponse?: string;
	/** Versión del tema con la que se relaciona la decisión editorial. */
	linkedVersionLabel?: string;
	reviewerNote?: string;
	reviewedBy?: string;
	reviewedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface TopicTimelinePhase {
	id: string;
	topicId: string;
	title: string;
	description: string;
	/** Sub-elementos de la fase (p. ej. las actuaciones de "Primeros 100 días"), para mostrarlos por separado. */
	items: string[];
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * Riesgo general de un tema (no de una medida concreta), con 4 partes.
 * Los campos opcionales quedan sin rellenar mientras no se proporcione ese
 * contenido: nunca se inventan.
 */
/**
 * Compromiso comprobable de un tema (p. ej. los cinco compromisos de Plan
 * Sanidad 2036): puente entre el diagnóstico y las medidas concretas.
 * Compromiso propuesto para el horizonte del plan, nunca un resultado ya
 * alcanzado.
 */
export interface TopicCommitment {
	id: string;
	topicId: string;
	title: string;
	description: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface TopicRisk {
	id: string;
	topicId: string;
	title: string;
	/** "En qué consiste" el riesgo. */
	description?: string;
	/** "Qué señales" permitirían detectarlo. */
	signals?: string;
	/** "Cómo reducirlo". */
	mitigation?: string;
	/** "Qué decisión debería tomarse" si el riesgo ocurre. */
	decisionTrigger?: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface TopicVersion {
	id: string;
	topicId: string;
	versionLabel: string;
	note?: string;
	publishedBy?: string;
	publishedAt: string;
}

// ---------------------------------------------------------------------------
// Participación ciudadana (rondas)
// ---------------------------------------------------------------------------

export type ParticipationRoundStatus = 'draft' | 'open' | 'paused' | 'closed';

export interface ParticipationRound {
	id: string;
	topicId: string;
	versionLabel: string;
	status: ParticipationRoundStatus;
	opensAt?: string;
	closesAt?: string;
	createdBy?: string;
	createdAt: string;
	updatedAt: string;
}

export type MeasurePosition = 'favor' | 'con_cambios' | 'en_contra' | 'mas_info';
export type MeasureUrgency =
	'inmediata' | 'primeros_anos' | 'medio_plazo' | 'no_aplicar' | 'sin_opinion';

export interface MeasureParticipationResponse {
	id: string;
	roundId: string;
	measureId: string;
	userId: string;
	position: MeasurePosition;
	reasonCode?: string;
	reasonOther?: string;
	comment?: string;
	urgency?: MeasureUrgency;
	quickChange?: string;
	createdAt: string;
	updatedAt: string;
}

export type GeneralPosition = 'favor' | 'con_cambios' | 'en_contra' | 'mas_info';
export type InvestmentOpinion = 'insuficiente' | 'adecuada' | 'excesiva' | 'sin_info';
export type PacePreference =
	'urgentes_primero' | 'progresiva_inicial' | 'gradual_decada' | 'no_apoyo' | 'sin_opinion';

export interface GeneralParticipationResponse {
	id: string;
	roundId: string;
	userId: string;
	generalPosition: GeneralPosition;
	/** Ausente en propuestas que, como Sanidad, no incluyen esta pregunta específica de Vivienda. */
	investmentOpinion?: InvestmentOpinion;
	/** Ausente en propuestas que, como Sanidad, no incluyen esta pregunta específica de Vivienda. */
	pacePreference?: PacePreference;
	unaddressedProblem?: string;
	measuresConsideredCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface ResponsePriority {
	id: string;
	roundId: string;
	userId: string;
	measureId: string;
	rank: 1 | 2 | 3;
	createdAt: string;
}

export type HousingSituation =
	| 'alquiler'
	| 'propiedad'
	| 'buscando'
	| 'con_familiares'
	| 'vivienda_publica'
	| 'otra'
	| 'prefiere_no_responder';

export interface ParticipantContext {
	id: string;
	roundId: string;
	userId: string;
	community?: string;
	housingSituation?: HousingSituation;
	createdAt: string;
	updatedAt: string;
}

export type MeasurePositionCounts = Record<MeasurePosition, number>;
export type MeasureUrgencyCounts = Partial<Record<MeasureUrgency, number>>;
export type MeasureReasonCounts = Record<string, number>;

export interface MeasureParticipationResults {
	measureId: string;
	positionCounts: MeasurePositionCounts;
	urgencyCounts: MeasureUrgencyCounts;
	reasonCounts: MeasureReasonCounts;
	totalResponses: number;
}

export interface PriorityResult {
	measureId: string;
	timesTop3: number;
	avgRank: number;
}

export interface GeneralParticipationResults {
	generalPosition: Partial<Record<GeneralPosition, number>>;
	investmentOpinion: Partial<Record<InvestmentOpinion, number>>;
	pacePreference: Partial<Record<PacePreference, number>>;
}

export interface ParticipationSummary {
	uniqueParticipants: number;
	totalMeasureResponses: number;
	totalGeneralResponses: number;
	proposalsReceived: number;
	proposalsPublished: number;
	lastUpdatedAt?: string;
}

// ---------------------------------------------------------------------------
// Escucha ciudadana (priorizar y profundizar en preocupaciones concretas)
// ---------------------------------------------------------------------------

export type ListeningRoundStatus = 'draft' | 'open' | 'paused' | 'closed';

export interface ListeningRound {
	id: string;
	category: ConcernCategory;
	versionLabel: string;
	status: ListeningRoundStatus;
	opensAt?: string;
	closesAt?: string;
	createdBy?: string;
	createdAt: string;
	updatedAt: string;
}

export type ListeningSeverity = 'muy_grave' | 'grave' | 'moderada' | 'poco_grave' | 'sin_info';
export type ListeningEvolution = 'empeorado' | 'similar' | 'mejorado' | 'no_sabe';
export type ListeningPersonalRelation =
	'directamente' | 'persona_cercana' | 'profesional' | 'no_afecta' | 'prefiere_no_responder';

/**
 * Selección/prioridad y profundización de un usuario sobre una preocupación
 * concreta (`optionCode`) dentro de una ronda. `rank` ausente = actualmente
 * deseleccionada (su profundización, si existía, se conserva).
 */
export interface ListeningResponse {
	id: string;
	roundId: string;
	userId: string;
	optionCode: string;
	rank?: 1 | 2 | 3;
	severity?: ListeningSeverity;
	evolution?: ListeningEvolution;
	personalRelation?: ListeningPersonalRelation;
	causeCode?: string;
	causeOther?: string;
	comment?: string;
	createdAt: string;
	updatedAt: string;
}

export type ListeningAreaType = 'urbano' | 'intermedio' | 'rural' | 'prefiere_no_responder';

export interface ListeningContext {
	id: string;
	roundId: string;
	userId: string;
	community?: string;
	areaType?: ListeningAreaType;
	housingSituation?: HousingSituation;
	createdAt: string;
	updatedAt: string;
}

export interface ListeningCompletion {
	roundId: string;
	userId: string;
	completedAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Escucha ciudadana de una sola tirada (p. ej. Escucha abierta sobre
// sanidad): una respuesta por usuario y ronda, distinta del modelo de
// priorizar + profundizar de ListeningResponse.
// ---------------------------------------------------------------------------

export type ListeningSurveyAreaType =
	'rural' | 'ciudad_mediana' | 'gran_area_urbana' | 'prefiere_no_responder';

export interface ListeningSurveyResponse {
	id: string;
	roundId: string;
	userId: string;
	problems: string[];
	otherProblemText?: string;
	mainCause?: string;
	prioritizedMeasureIds: string[];
	commitmentMostUrgentId?: string;
	commitmentMostDifficultId?: string;
	missingImprovement?: string;
	community?: string;
	areaType?: ListeningSurveyAreaType;
	createdAt: string;
	updatedAt: string;
}

export interface ListeningSurveyCountRow {
	dimension:
		| 'problem'
		| 'main_cause'
		| 'prioritized_measure'
		| 'commitment_most_urgent'
		| 'commitment_most_difficult';
	code: string;
	responseCount: number;
}

export interface ListeningSurveyTerritoryRow {
	community: string;
	responseCount: number;
}

// ---------------------------------------------------------------------------
// "Tú eliges el próximo bloque" — votación de una opción entre 5 fijas
// ---------------------------------------------------------------------------

/** Fijas en esta fase — ver comentario en 0038_proximo_bloque.sql. */
export type NextBlockVoteOptionCode =
	| 'empleo_salarios'
	| 'educacion'
	| 'pensiones_cuidados'
	| 'coste_vida'
	| 'inmigracion_integracion_convivencia';

export type NextBlockVoteRoundStatus = 'scheduled' | 'open' | 'closed';

export interface NextBlockVoteRound {
	id: string;
	versionLabel: string;
	status: NextBlockVoteRoundStatus;
	opensAt?: string;
	closesAt?: string;
	createdBy?: string;
	createdAt: string;
	updatedAt: string;
}

export interface NextBlockVote {
	id: string;
	roundId: string;
	userId: string;
	optionCode: NextBlockVoteOptionCode;
	createdAt: string;
	updatedAt: string;
}

/** Recuento por opción. Solo se puede obtener con la ronda cerrada — ver get_next_block_vote_results(). */
export interface NextBlockVoteResultRow {
	optionCode: NextBlockVoteOptionCode;
	voteCount: number;
}
