import type {
	ChannelPlatform,
	ChannelReportReason,
	ChannelType,
	ConcernCategory,
	ConcernLevel,
	ConcernProposalStatus,
	ConcernScopeType,
	ConcernStatus,
	EventCategory,
	EventStatus,
	EventTheme,
	GeneralPosition,
	HousingSituation,
	InvestmentOpinion,
	ListeningAreaType,
	ListeningEvolution,
	ListeningSurveyAreaType,
	ListeningPersonalRelation,
	ListeningSeverity,
	MeasurePosition,
	MeasurePriority,
	MeasureStance,
	MeasureState,
	MeasureUrgency,
	ModerationAction,
	NextBlockVoteRoundStatus,
	OrganizerKind,
	PacePreference,
	ParticipationRoundStatus,
	PriorCommunicationStatus,
	ReportReason,
	TopicMeasureAlternativeStatus,
	TopicStatus,
	VerificationLevel
} from '$lib/types';
import type { UserRole } from '$lib/auth/types';

export const userRoleLabels: Record<UserRole, string> = {
	organizer: 'Organizador',
	moderator: 'Moderador',
	admin: 'Administrador'
};

export const categoryLabels: Record<EventCategory, string> = {
	concentracion: 'Concentración',
	manifestacion: 'Manifestación',
	marcha: 'Marcha',
	accion_solidaria: 'Acción solidaria',
	asamblea: 'Asamblea',
	jornada_reivindicativa: 'Jornada reivindicativa',
	otro: 'Otro'
};

export const themeLabels: Record<EventTheme, string> = {
	vivienda: 'Vivienda',
	medioambiente: 'Medioambiente',
	derechos_laborales: 'Derechos laborales',
	servicios_publicos: 'Servicios públicos',
	vecinal: 'Vecinal',
	igualdad: 'Igualdad',
	movilidad: 'Movilidad',
	cultura: 'Cultura',
	solidaridad: 'Solidaridad',
	salud: 'Salud',
	educacion: 'Educación',
	otro: 'Otro'
};

/**
 * Etiqueta a mostrar para una temática: si es `'otro'` y hay una etiqueta
 * personalizada escrita por quien organiza, se muestra esa en su lugar.
 */
export function themeLabel(theme: EventTheme, customThemeLabel?: string): string {
	if (theme === 'otro' && customThemeLabel?.trim()) return customThemeLabel.trim();
	return themeLabels[theme];
}

export const statusLabels: Record<EventStatus, string> = {
	draft: 'Borrador',
	pending_review: 'En revisión',
	published: 'Publicada',
	identity_verified: 'Identidad verificada',
	organization_verified: 'Organización verificada',
	documentation_reviewed: 'Documentación revisada',
	modified: 'Modificada',
	cancelled: 'Cancelada',
	completed: 'Finalizada',
	hidden: 'Oculta',
	rejected: 'Rechazada'
};

/** Tono visual asociado a cada estado, usado por EventStatusBanner y paneles internos. */
export type StatusTone = 'neutral' | 'positive' | 'warning' | 'critical' | 'muted';

export const statusTones: Record<EventStatus, StatusTone> = {
	draft: 'neutral',
	pending_review: 'warning',
	published: 'positive',
	identity_verified: 'positive',
	organization_verified: 'positive',
	documentation_reviewed: 'positive',
	modified: 'warning',
	cancelled: 'critical',
	completed: 'muted',
	hidden: 'muted',
	rejected: 'critical'
};

export const verificationLevelLabels: Record<VerificationLevel, string> = {
	none: 'Sin verificar',
	identity_verified: 'Identidad verificada',
	organization_verified: 'Organización verificada',
	documentation_reviewed: 'Documentación revisada'
};

export const priorCommunicationLabels: Record<PriorCommunicationStatus, string> = {
	not_required: 'No requiere comunicación previa',
	planned: 'Comunicación prevista',
	submitted: 'Comunicación enviada',
	acknowledged: 'Comunicación registrada',
	unknown: 'Estado no indicado'
};

export const organizerKindLabels: Record<OrganizerKind, string> = {
	persona: 'Persona particular',
	colectivo: 'Colectivo',
	asociacion: 'Asociación',
	sindicato: 'Sindicato',
	plataforma: 'Plataforma ciudadana',
	otro: 'Otro tipo de organización'
};

export const reportReasonLabels: Record<ReportReason, string> = {
	incitacion_violencia: 'Incita a la violencia',
	informacion_falsa: 'Información falsa o engañosa',
	suplantacion: 'Suplantación de identidad',
	contenido_partidista_encubierto: 'Contenido partidista encubierto',
	spam: 'Spam o contenido repetido',
	otro: 'Otro motivo'
};

export const moderationActionLabels: Record<ModerationAction, string> = {
	approve: 'Aprobar',
	request_changes: 'Solicitar cambios',
	hide: 'Ocultar',
	reject: 'Rechazar',
	reinstate: 'Restaurar',
	hide_channel: 'Ocultar canal',
	unhide_channel: 'Restaurar canal'
};

export const channelPlatformLabels: Record<ChannelPlatform, string> = {
	whatsapp: 'WhatsApp',
	telegram: 'Telegram',
	other: 'Otro enlace oficial'
};

export const channelTypeLabels: Record<ChannelType, string> = {
	group: 'Grupo',
	channel: 'Canal',
	community: 'Comunidad',
	other: 'Otro'
};

export const channelReportReasonLabels: Record<ChannelReportReason, string> = {
	enlace_roto: 'Enlace roto',
	spam: 'Spam',
	estafa: 'Estafa',
	suplantacion: 'Suplantación',
	no_pertenece_organizador: 'No pertenece a la organización',
	contenido_violento_ilegal: 'Contenido violento o ilegal',
	otro: 'Otro motivo'
};

// ---------------------------------------------------------------------------
// Pulso ciudadano
// ---------------------------------------------------------------------------

export const concernCategoryLabels: Record<ConcernCategory, string> = {
	vivienda: 'Vivienda',
	sanidad: 'Sanidad',
	empleo: 'Empleo',
	educacion: 'Educación',
	seguridad: 'Seguridad',
	coste_vida: 'Coste de vida',
	transporte: 'Transporte',
	medioambiente: 'Medioambiente'
};

export const concernScopeTypeLabels: Record<ConcernScopeType, string> = {
	nacional: 'Toda España',
	comunidad_autonoma: 'Comunidad autónoma',
	provincia: 'Provincia',
	municipio: 'Municipio'
};

export const concernStatusLabels: Record<ConcernStatus, string> = {
	draft: 'Borrador',
	published: 'Publicada',
	archived: 'Despublicada'
};

/** Escala de respuesta de Pulso ciudadano: 1 = Nada, 5 = Es prioritario. */
export const concernLevelLabels: Record<ConcernLevel, string> = {
	1: 'Nada',
	2: 'Poco',
	3: 'Bastante',
	4: 'Mucho',
	5: 'Es prioritario'
};

export const concernLevelShortLabels: Record<ConcernLevel, string> = {
	1: 'Nada',
	2: 'Poco',
	3: 'Bastante',
	4: 'Mucho',
	5: 'Prioritario'
};

export const concernProposalStatusLabels: Record<ConcernProposalStatus, string> = {
	pending: 'Pendiente de revisión',
	approved: 'Aprobada',
	rejected: 'Rechazada'
};

// ---------------------------------------------------------------------------
// Pulso ciudadano — Temas ("Preocupaciones → Soluciones")
// ---------------------------------------------------------------------------

export const topicStatusLabels: Record<TopicStatus, string> = {
	draft: 'Borrador',
	open: 'Abierto a participación',
	reviewed: 'Revisado',
	archived: 'Archivado'
};

export const measureStanceLabels: Record<MeasureStance, string> = {
	favor: 'A favor',
	en_contra: 'En contra',
	modificaria: 'La modificaría'
};

export const measureStateLabels: Record<MeasureState, string> = {
	preparacion: 'Preparación',
	piloto: 'Piloto',
	despliegue: 'Despliegue',
	consolidacion: 'Consolidación',
	evaluacion: 'Evaluación'
};

export const measurePriorityLabels: Record<MeasurePriority, string> = {
	alta: 'Prioridad alta',
	media: 'Prioridad media',
	baja: 'Prioridad baja'
};

/** Categoría pendiente: mientras no se entregue contenido real, no se inventa una categoría. */
export const TOPIC_CATEGORY_PENDING_LABEL = 'Categoría pendiente';

export const topicMeasureAlternativeStatusLabels: Record<TopicMeasureAlternativeStatus, string> = {
	pending: 'Pendiente de revisión',
	approved: 'Aprobada',
	rejected: 'Rechazada',
	draft: 'Borrador',
	enviada: 'Enviada',
	pendiente_revision: 'Pendiente de revisión',
	necesita_cambios: 'Necesita cambios',
	publicada: 'Publicada',
	en_estudio: 'En estudio',
	incorporada_total: 'Incorporada totalmente',
	incorporada_parcial: 'Incorporada parcialmente',
	no_incorporada: 'No incorporada',
	archivada: 'Archivada'
};

// ---------------------------------------------------------------------------
// Pulso ciudadano — Participación ciudadana (rondas)
// ---------------------------------------------------------------------------

export const participationRoundStatusLabels: Record<ParticipationRoundStatus, string> = {
	draft: 'Borrador',
	open: 'Abierta',
	paused: 'Pausada',
	closed: 'Cerrada'
};

export const measurePositionLabels: Record<MeasurePosition, string> = {
	favor: 'A favor',
	con_cambios: 'La apoyaría con cambios',
	en_contra: 'En contra',
	mas_info: 'Necesito más información'
};

export const measureUrgencyLabels: Record<MeasureUrgency, string> = {
	inmediata: 'De forma inmediata',
	primeros_anos: 'Durante los primeros años',
	medio_plazo: 'A medio plazo',
	no_aplicar: 'No debería aplicarse',
	sin_opinion: 'No tengo una opinión formada'
};

export const generalPositionLabels: Record<GeneralPosition, string> = {
	favor: 'A favor',
	con_cambios: 'Lo apoyaría con cambios',
	en_contra: 'En contra',
	mas_info: 'Necesito más información'
};

/**
 * Redacción de la valoración general para propuestas con el modelo simple
 * (Sanidad): solo 3 opciones, sin "con_cambios". Reutiliza el mismo código
 * `GeneralPosition` que Vivienda, con textos propios — no toca
 * `generalPositionLabels`.
 */
export const simpleGeneralPositionLabels: Partial<Record<GeneralPosition, string>> = {
	favor: 'Apoyo el plan',
	en_contra: 'No apoyo el plan',
	mas_info: 'Necesito revisarlo mejor antes de decidir'
};

/**
 * Redacción de la valoración por medida para propuestas con el modelo
 * simple (Sanidad). Mismos códigos `MeasurePosition` que Vivienda, textos
 * propios — no toca `measurePositionLabels`.
 */
export const simpleMeasurePositionLabels: Record<MeasurePosition, string> = {
	favor: 'La apoyo como está',
	con_cambios: 'La apoyaría con cambios',
	en_contra: 'No la apoyo',
	mas_info: 'No tengo información suficiente'
};

export const investmentOpinionLabels: Record<InvestmentOpinion, string> = {
	insuficiente: 'Insuficiente',
	adecuada: 'Aproximadamente adecuada',
	excesiva: 'Excesiva',
	sin_info: 'No tengo información suficiente'
};

export const pacePreferenceLabels: Record<PacePreference, string> = {
	urgentes_primero: 'Priorizar medidas urgentes desde el principio',
	progresiva_inicial: 'Aplicación progresiva durante los primeros años',
	gradual_decada: 'Aplicación más gradual durante toda la década',
	no_apoyo: 'No apoyo su aplicación',
	sin_opinion: 'No tengo una opinión formada'
};

export const housingSituationLabels: Record<HousingSituation, string> = {
	alquiler: 'Vivo de alquiler',
	propiedad: 'Tengo una vivienda en propiedad',
	buscando: 'Estoy buscando vivienda',
	con_familiares: 'Vivo con familiares',
	vivienda_publica: 'Vivo en vivienda pública o protegida',
	otra: 'Tengo otra situación',
	prefiere_no_responder: 'Prefiero no responder'
};

/** Motivos por posición ante una medida. `otro` siempre disponible con texto libre asociado (`reasonOther`). */
export const measureReasonOptionsByPosition: Record<
	MeasurePosition,
	{ code: string; label: string }[]
> = {
	favor: [
		{ code: 'mejora_acceso', label: 'Puede mejorar el acceso a la vivienda' },
		{ code: 'bien_orientada', label: 'Está bien orientada' },
		{ code: 'viable', label: 'Me parece viable' },
		{ code: 'inversion_adecuada', label: 'Considero adecuada la inversión' },
		{ code: 'necesidad_urgente', label: 'Responde a una necesidad urgente' },
		{ code: 'otro', label: 'Otro motivo' }
	],
	con_cambios: [
		{ code: 'cambiar_presupuesto', label: 'Cambiaría el presupuesto' },
		{ code: 'cambiar_plazos', label: 'Cambiaría los plazos' },
		{ code: 'cambiar_beneficiarios', label: 'Cambiaría quién puede beneficiarse' },
		{ code: 'anadir_controles', label: 'Añadiría más controles' },
		{ code: 'cambiar_ambito_territorial', label: 'Modificaría su aplicación territorial' },
		{ code: 'cambiar_funcionamiento', label: 'Cambiaría parte de su funcionamiento' },
		{ code: 'otro', label: 'Otro cambio' }
	],
	en_contra: [
		{ code: 'coste_excesivo', label: 'Coste excesivo' },
		{ code: 'dificil_aplicar', label: 'Difícil de aplicar' },
		{ code: 'efectos_negativos', label: 'Puede generar efectos negativos' },
		{ code: 'no_justa', label: 'No me parece justa' },
		{ code: 'faltan_pruebas', label: 'Faltan pruebas o datos' },
		{ code: 'no_resuelve_problema', label: 'No resuelve el problema principal' },
		{ code: 'otro', label: 'Otro motivo' }
	],
	mas_info: [
		{ code: 'no_entiendo_funcionamiento', label: 'No entiendo suficientemente el funcionamiento' },
		{ code: 'faltan_datos', label: 'Faltan datos' },
		{ code: 'faltan_fuentes', label: 'Faltan fuentes' },
		{ code: 'costes_no_claros', label: 'No están claros los costes' },
		{ code: 'riesgos_no_claros', label: 'No están claros los riesgos' },
		{ code: 'consecuencias_no_claras', label: 'No están claras las consecuencias' },
		{ code: 'otro', label: 'Otra información' }
	]
};

// ---------------------------------------------------------------------------
// Escucha ciudadana — priorizar y profundizar en preocupaciones concretas
// ---------------------------------------------------------------------------

export const listeningSeverityLabels: Record<ListeningSeverity, string> = {
	muy_grave: 'Muy grave',
	grave: 'Grave',
	moderada: 'Moderada',
	poco_grave: 'Poco grave',
	sin_info: 'No tengo información suficiente'
};

export const listeningEvolutionLabels: Record<ListeningEvolution, string> = {
	empeorado: 'Ha empeorado',
	similar: 'Sigue parecida',
	mejorado: 'Ha mejorado',
	no_sabe: 'No lo sé'
};

export const listeningPersonalRelationLabels: Record<ListeningPersonalRelation, string> = {
	directamente: 'Me afecta directamente',
	persona_cercana: 'Afecta a una persona cercana',
	profesional: 'Lo conozco por mi profesión o actividad',
	no_afecta: 'No me afecta directamente',
	prefiere_no_responder: 'Prefiero no responder'
};

export const listeningAreaTypeLabels: Record<ListeningAreaType, string> = {
	urbano: 'Urbano',
	intermedio: 'Intermedio',
	rural: 'Rural',
	prefiere_no_responder: 'Prefiero no responder'
};

export const listeningSurveyAreaTypeLabels: Record<ListeningSurveyAreaType, string> = {
	rural: 'Rural o municipio pequeño',
	ciudad_mediana: 'Ciudad mediana',
	gran_area_urbana: 'Gran área urbana',
	prefiere_no_responder: 'Prefiero no responder'
};

export const nextBlockVoteRoundStatusLabels: Record<NextBlockVoteRoundStatus, string> = {
	scheduled: 'Próximamente',
	open: 'Abierta',
	closed: 'Cerrada'
};
