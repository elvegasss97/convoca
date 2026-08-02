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
	ModerationAction,
	OrganizerKind,
	PriorCommunicationStatus,
	ReportReason,
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
