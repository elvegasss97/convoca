import type { Event, Organizer, Topic } from '$lib/types';

/**
 * Dominio público real de Convoca. Todas las URLs canónicas, OG y JSON-LD
 * se construyen a partir de esta constante — nunca de `location.origin`,
 * para que las URLs generadas en el servidor (SSR) sean siempre absolutas
 * y correctas sin depender de cabeceras de host reenviadas.
 */
export const SITE_URL = 'https://convoca.cloud';
export const SITE_NAME = 'Convoca';
export const DEFAULT_DESCRIPTION =
	'Convoca es la plataforma ciudadana independiente para descubrir, crear y difundir manifestaciones, concentraciones, recogidas de firmas y acciones vecinales cerca de ti.';
export const DEFAULT_OG_IMAGE = '/og/default.png';

export function absoluteUrl(path: string): string {
	return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Recorta una descripción larga a un tamaño razonable para meta/OG sin cortar palabras a mitad. */
export function truncate(text: string, maxLength = 160): string {
	const trimmed = text.trim().replace(/\s+/g, ' ');
	if (trimmed.length <= maxLength) return trimmed;
	const cut = trimmed.slice(0, maxLength - 1);
	const lastSpace = cut.lastIndexOf(' ');
	return `${cut.slice(0, lastSpace > 40 ? lastSpace : cut.length)}…`;
}

export function organizationJsonLd() {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: SITE_NAME,
		url: SITE_URL,
		description: DEFAULT_DESCRIPTION,
		logo: absoluteUrl('/icons/icon-512.png')
	};
}

export function websiteJsonLd() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_NAME,
		url: SITE_URL,
		description: DEFAULT_DESCRIPTION
	};
}

/** Cancelada aparte; el resto de estados del ciclo de vida son "programado" a efectos de Schema.org. */
function schemaEventStatus(status: Event['status']): string {
	return status === 'cancelled'
		? 'https://schema.org/EventCancelled'
		: 'https://schema.org/EventScheduled';
}

/**
 * Datos estructurados Schema.org/Event para una convocatoria individual.
 * `organizer` usa el nombre público del organizador, nunca datos privados
 * (email, teléfono) que no formen parte de su perfil público.
 */
export function eventJsonLd(event: Event, organizer: Organizer | null, path: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Event',
		name: event.title,
		description: truncate(event.description, 500),
		startDate: event.startAt,
		...(event.endAt ? { endDate: event.endAt } : {}),
		eventStatus: schemaEventStatus(event.status),
		eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
		location: {
			'@type': 'Place',
			name: event.meetingPoint.label,
			address: `${event.meetingPoint.address}, ${event.meetingPoint.city}`,
			geo: {
				'@type': 'GeoCoordinates',
				latitude: event.meetingPoint.point.lat,
				longitude: event.meetingPoint.point.lng
			}
		},
		...(organizer
			? {
					organizer: {
						'@type': organizer.kind === 'persona' ? 'Person' : 'Organization',
						name: organizer.displayName
					}
				}
			: {}),
		url: absoluteUrl(path),
		image: [absoluteUrl(eventOgImagePath(event))]
	};
}

export function eventOgImagePath(event: Event): string {
	return event.coverImageUrl ?? `/og/convocatorias/${event.slug}`;
}

export function topicOgImagePath(topic: Topic): string {
	return topic.coverImageUrl ?? `/og/planes/${topic.slug}`;
}
