import type { Event } from '$lib/types';

/**
 * Datos ficticios de convocatorias repartidas por varias ciudades españolas
 * y temáticas diversas (vecinal, vivienda, medioambiente, servicios públicos,
 * derechos laborales, solidaridad, igualdad, movilidad, cultura, salud,
 * educación) a propósito, para que la demo no gire en torno a un único
 * asunto político. Cubre todos los `EventStatus` definidos en los tipos.
 */
export const mockEvents: Event[] = [
	{
		id: 'evt-1',
		slug: 'concentracion-vecinal-lavapies-limpieza',
		title: 'Concentración vecinal por la limpieza del barrio',
		description:
			'Los vecinos y vecinas de Lavapiés nos concentramos para pedir al ayuntamiento una mejora del servicio de limpieza y recogida de residuos en el barrio.',
		objective:
			'Trasladar de forma pacífica la demanda de mejora del servicio de limpieza municipal.',
		category: 'concentracion',
		themes: ['vecinal', 'servicios_publicos'],
		status: 'published',
		startAt: '2026-08-05T18:30:00.000Z',
		durationMinutes: 90,
		meetingPoint: {
			point: { lat: 40.4088, lng: -3.7017 },
			label: 'Plaza de Lavapiés',
			address: 'Plaza de Lavapiés, s/n',
			city: 'Madrid',
			province: 'Madrid'
		},
		organizerId: 'org-1',
		createdByUserId: 'user-org-1',
		verification: {
			level: 'organization_verified',
			organizationVerifiedAt: '2026-07-20T09:00:00.000Z'
		},
		priorCommunication: 'submitted',
		rules: [
			'Concentración pacífica y sin obstaculizar el tráfico peatonal.',
			'Se ruega no dejar residuos en el lugar.',
			'Respeto a todas las personas asistentes.'
		],
		peacefulDeclaration: true,
		attendance: { going: 84, interested: 156, isEstimate: true },
		createdAt: '2026-07-10T08:00:00.000Z',
		updatedAt: '2026-07-20T09:00:00.000Z'
	},
	{
		id: 'evt-2',
		slug: 'marcha-rios-vivos-turia',
		title: 'Marcha por la protección del río Túria',
		description:
			'Marcha pacífica a lo largo del cauce del Túria para reclamar medidas contra la contaminación y en defensa del ecosistema fluvial.',
		objective: 'Visibilizar el estado del río y exigir un plan de protección ambiental.',
		category: 'marcha',
		themes: ['medioambiente'],
		status: 'identity_verified',
		startAt: '2026-08-09T09:00:00.000Z',
		durationMinutes: 120,
		meetingPoint: {
			point: { lat: 39.4756, lng: -0.3796 },
			label: 'Puente de Serranos',
			address: 'Puente de Serranos',
			city: 'Valencia',
			province: 'Valencia'
		},
		route: {
			description:
				'Recorrido por el cauce del antiguo río Túria hasta la Ciudad de las Artes y las Ciencias.',
			points: [
				{ lat: 39.4756, lng: -0.3796 },
				{ lat: 39.4667, lng: -0.3617 },
				{ lat: 39.4544, lng: -0.3517 }
			]
		},
		organizerId: 'org-2',
		createdByUserId: 'user-org-2',
		verification: { level: 'identity_verified', identityVerifiedAt: '2026-07-15T09:00:00.000Z' },
		priorCommunication: 'acknowledged',
		rules: [
			'Marcha pacífica, sin cortar accesos de emergencia.',
			'No se permite pintura ni pancartas con mensajes partidistas.'
		],
		peacefulDeclaration: true,
		attendance: { going: 210, interested: 430, isEstimate: true },
		createdAt: '2026-06-28T08:00:00.000Z',
		updatedAt: '2026-07-15T09:00:00.000Z'
	},
	{
		id: 'evt-3',
		slug: 'concentracion-limpieza-servicios-publicos-madrid',
		title: 'Concentración del sector de limpieza por mejoras salariales',
		description:
			'El sindicato de limpieza convoca una concentración pacífica frente al edificio administrativo para reclamar la mejora de condiciones laborales.',
		objective: 'Reclamar la actualización del convenio colectivo del sector.',
		category: 'concentracion',
		themes: ['derechos_laborales'],
		status: 'documentation_reviewed',
		startAt: '2026-08-04T17:00:00.000Z',
		durationMinutes: 60,
		meetingPoint: {
			point: { lat: 40.4183, lng: -3.7003 },
			label: 'Puerta del Sol',
			address: 'Puerta del Sol, s/n',
			city: 'Madrid',
			province: 'Madrid'
		},
		organizerId: 'org-3',
		createdByUserId: 'user-org-3',
		verification: {
			level: 'documentation_reviewed',
			identityVerifiedAt: '2026-07-01T09:00:00.000Z',
			organizationVerifiedAt: '2026-07-02T09:00:00.000Z',
			documentationReviewedAt: '2026-07-05T09:00:00.000Z'
		},
		priorCommunication: 'acknowledged',
		rules: [
			'Concentración estática, sin marcha.',
			'Uso de megafonía limitado al horario autorizado.'
		],
		peacefulDeclaration: true,
		attendance: { going: 63, interested: 90, isEstimate: true },
		createdAt: '2026-06-15T08:00:00.000Z',
		updatedAt: '2026-07-05T09:00:00.000Z'
	},
	{
		id: 'evt-4',
		slug: 'concentracion-vivienda-digna-valencia',
		title: 'Concentración contra un desahucio en Ruzafa',
		description:
			'Concentración pacífica de apoyo a una familia con orden de desahucio, solicitando una salida habitacional digna.',
		objective: 'Pedir la paralización del desahucio hasta encontrar una alternativa habitacional.',
		category: 'concentracion',
		themes: ['vivienda'],
		status: 'modified',
		statusNote: 'La hora de inicio se ha adelantado 30 minutos a petición de la familia afectada.',
		startAt: '2026-08-03T08:00:00.000Z',
		durationMinutes: 60,
		meetingPoint: {
			point: { lat: 39.4589, lng: -0.3707 },
			label: 'Calle Cuba (portal del inmueble)',
			address: 'Calle Cuba, 24',
			city: 'Valencia',
			province: 'Valencia'
		},
		organizerId: 'org-4',
		createdByUserId: 'user-org-4',
		verification: {
			level: 'organization_verified',
			organizationVerifiedAt: '2026-07-18T09:00:00.000Z'
		},
		priorCommunication: 'submitted',
		rules: [
			'Concentración pacífica y respetuosa.',
			'No acercarse a la comitiva judicial ni obstaculizar su labor.'
		],
		peacefulDeclaration: true,
		attendance: { going: 45, interested: 120, isEstimate: true },
		createdAt: '2026-07-25T08:00:00.000Z',
		updatedAt: '2026-07-29T12:00:00.000Z'
	},
	{
		id: 'evt-5',
		slug: 'jornada-solidaria-banco-alimentos-sevilla',
		title: 'Jornada solidaria de recogida de alimentos',
		description:
			'Recogida de alimentos no perecederos en varios supermercados del centro de Sevilla, con reparto posterior a familias en situación vulnerable.',
		objective: 'Recoger y distribuir alimentos entre familias necesitadas de la ciudad.',
		category: 'accion_solidaria',
		themes: ['solidaridad'],
		status: 'organization_verified',
		startAt: '2026-08-08T09:00:00.000Z',
		durationMinutes: 240,
		meetingPoint: {
			point: { lat: 37.3891, lng: -5.9845 },
			label: 'Plaza Nueva',
			address: 'Plaza Nueva, s/n',
			city: 'Sevilla',
			province: 'Sevilla'
		},
		organizerId: 'org-5',
		createdByUserId: 'user-org-5',
		verification: {
			level: 'organization_verified',
			organizationVerifiedAt: '2026-07-12T09:00:00.000Z'
		},
		priorCommunication: 'not_required',
		rules: [
			'Actividad abierta a cualquier persona voluntaria.',
			'Se ruega puntualidad para la organización de turnos.'
		],
		peacefulDeclaration: true,
		attendance: { going: 132, interested: 88, isEstimate: true },
		createdAt: '2026-06-20T08:00:00.000Z',
		updatedAt: '2026-07-12T09:00:00.000Z'
	},
	{
		id: 'evt-6',
		slug: 'encuentro-vecinal-movilidad-bilbao',
		title: 'Encuentro vecinal por calles más seguras',
		description:
			'Reunión y concentración informativa en el barrio de Deusto para pedir pasos de peatones y reducción de velocidad en calles escolares.',
		objective:
			'Recoger firmas y visibilizar la necesidad de calmar el tráfico junto a los colegios.',
		category: 'asamblea',
		themes: ['vecinal', 'movilidad'],
		status: 'published',
		startAt: '2026-08-12T17:30:00.000Z',
		durationMinutes: 75,
		meetingPoint: {
			point: { lat: 43.2717, lng: -2.9491 },
			label: 'Plaza del Ayuntamiento de Deusto',
			address: 'Plaza del Ayuntamiento',
			city: 'Bilbao',
			province: 'Bizkaia'
		},
		organizerId: 'org-6',
		createdByUserId: 'user-org-6',
		verification: { level: 'none' },
		priorCommunication: 'planned',
		rules: ['Encuentro pacífico y familiar.', 'Actividad pensada para todas las edades.'],
		peacefulDeclaration: true,
		attendance: { going: 28, interested: 54, isEstimate: true },
		createdAt: '2026-07-22T08:00:00.000Z',
		updatedAt: '2026-07-22T08:00:00.000Z'
	},
	{
		id: 'evt-7',
		slug: 'marcha-ciclista-zaragoza-carril-bici',
		title: 'Marcha ciclista por más carriles bici',
		description:
			'Marcha ciclista pacífica por el centro de Zaragoza para pedir la ampliación de la red de carriles bici seguros.',
		objective: 'Reclamar un plan municipal de infraestructura ciclista.',
		category: 'marcha',
		themes: ['movilidad', 'medioambiente'],
		status: 'published',
		startAt: '2026-08-15T10:00:00.000Z',
		durationMinutes: 90,
		meetingPoint: {
			point: { lat: 41.6488, lng: -0.8891 },
			label: 'Plaza del Pilar',
			address: 'Plaza del Pilar, s/n',
			city: 'Zaragoza',
			province: 'Zaragoza'
		},
		route: {
			description:
				'Recorrido circular por el centro de la ciudad, carriles habilitados y calles de bajo tráfico.',
			points: [
				{ lat: 41.6488, lng: -0.8891 },
				{ lat: 41.6461, lng: -0.8955 },
				{ lat: 41.6395, lng: -0.8894 }
			]
		},
		organizerId: 'org-7',
		createdByUserId: 'user-org-7',
		verification: {
			level: 'organization_verified',
			organizationVerifiedAt: '2026-07-08T09:00:00.000Z'
		},
		priorCommunication: 'acknowledged',
		rules: [
			'Uso obligatorio de casco recomendado.',
			'Respetar semáforos y señalización en todo momento.'
		],
		peacefulDeclaration: true,
		attendance: { going: 175, interested: 260, isEstimate: true },
		createdAt: '2026-06-10T08:00:00.000Z',
		updatedAt: '2026-07-08T09:00:00.000Z'
	},
	{
		id: 'evt-8',
		slug: 'concentracion-sanidad-publica-malaga',
		title: 'Concentración por el refuerzo de la sanidad pública',
		description:
			'Profesionales sanitarios y vecinos se concentran ante el centro de salud para pedir el refuerzo de plantilla en verano.',
		objective: 'Exigir la cobertura completa de las bajas y vacaciones del personal sanitario.',
		category: 'concentracion',
		themes: ['salud', 'servicios_publicos'],
		status: 'pending_review',
		startAt: '2026-08-06T19:00:00.000Z',
		durationMinutes: 60,
		meetingPoint: {
			point: { lat: 36.7213, lng: -4.4214 },
			label: 'Centro de Salud Ciudad Jardín',
			address: 'Avenida de Ciudad Jardín, 3',
			city: 'Málaga',
			province: 'Málaga'
		},
		organizerId: 'org-8',
		createdByUserId: 'user-org-8',
		verification: { level: 'none' },
		priorCommunication: 'planned',
		rules: ['Concentración pacífica sin interrumpir el acceso al centro de salud.'],
		peacefulDeclaration: true,
		attendance: { going: 12, interested: 40, isEstimate: true },
		createdAt: '2026-07-28T08:00:00.000Z',
		updatedAt: '2026-07-28T08:00:00.000Z'
	},
	{
		id: 'evt-9',
		slug: 'fiesta-comunitaria-ateneo-vigo',
		title: 'Fiesta comunitaria de puertas abiertas',
		description:
			'Jornada de puertas abiertas del Ateneo con música, talleres y actividades para todas las edades.',
		objective: 'Fortalecer los lazos comunitarios del barrio a través de la cultura popular.',
		category: 'otro',
		themes: ['cultura', 'vecinal'],
		status: 'draft',
		startAt: '2026-08-22T16:00:00.000Z',
		durationMinutes: 300,
		meetingPoint: {
			point: { lat: 42.2406, lng: -8.7207 },
			label: 'Ateneo Cultural Vigo Norte',
			address: 'Rúa do Aragón, 12',
			city: 'Vigo',
			province: 'Pontevedra'
		},
		organizerId: 'org-9',
		createdByUserId: 'user-org-9',
		verification: { level: 'none' },
		priorCommunication: 'not_required',
		rules: ['Actividad familiar y abierta a todos los públicos.'],
		peacefulDeclaration: true,
		attendance: { going: 0, interested: 6, isEstimate: true },
		createdAt: '2026-07-30T08:00:00.000Z',
		updatedAt: '2026-07-30T08:00:00.000Z'
	},
	{
		id: 'evt-10',
		slug: 'manifestacion-feminista-granada-25n-ensayo',
		title: 'Concentración por la igualdad en el trabajo',
		description:
			'Concentración pacífica para visibilizar la brecha salarial y pedir medidas efectivas de igualdad en las empresas de la ciudad.',
		objective: 'Sensibilizar sobre la brecha salarial de género y reclamar planes de igualdad.',
		category: 'concentracion',
		themes: ['igualdad', 'derechos_laborales'],
		status: 'published',
		startAt: '2026-08-18T18:00:00.000Z',
		durationMinutes: 90,
		meetingPoint: {
			point: { lat: 37.1773, lng: -3.5986 },
			label: 'Plaza del Carmen',
			address: 'Plaza del Carmen, s/n',
			city: 'Granada',
			province: 'Granada'
		},
		organizerId: 'org-10',
		createdByUserId: 'user-org-10',
		verification: { level: 'identity_verified', identityVerifiedAt: '2026-07-19T09:00:00.000Z' },
		priorCommunication: 'submitted',
		rules: [
			'Concentración pacífica.',
			'Espacio libre de comentarios discriminatorios o agresivos.'
		],
		peacefulDeclaration: true,
		attendance: { going: 96, interested: 210, isEstimate: true },
		createdAt: '2026-07-02T08:00:00.000Z',
		updatedAt: '2026-07-19T09:00:00.000Z'
	},
	{
		id: 'evt-11',
		slug: 'concentracion-educacion-publica-alicante',
		title: 'Concentración por la reducción de ratios en las aulas',
		description:
			'Familias, docentes y estudiantes se concentran para pedir la reducción del número de alumnos por aula en centros públicos.',
		objective: 'Exigir a la administración educativa la reducción de ratios para el próximo curso.',
		category: 'concentracion',
		themes: ['educacion', 'servicios_publicos'],
		status: 'published',
		startAt: '2026-09-02T09:30:00.000Z',
		durationMinutes: 60,
		meetingPoint: {
			point: { lat: 38.3452, lng: -0.481 },
			label: 'Delegación Territorial de Educación',
			address: 'Avenida de Aguilera, 1',
			city: 'Alicante',
			province: 'Alicante'
		},
		organizerId: 'org-11',
		createdByUserId: 'user-org-11',
		verification: {
			level: 'organization_verified',
			organizationVerifiedAt: '2026-07-21T09:00:00.000Z'
		},
		priorCommunication: 'submitted',
		rules: ['Concentración pacífica y familiar.', 'Se recomienda protección solar por el horario.'],
		peacefulDeclaration: true,
		attendance: { going: 58, interested: 140, isEstimate: true },
		createdAt: '2026-07-05T08:00:00.000Z',
		updatedAt: '2026-07-21T09:00:00.000Z'
	},
	{
		id: 'evt-12',
		slug: 'limpieza-monte-ismael-madrid',
		title: 'Limpieza voluntaria del Monte de El Pardo',
		description:
			'Jornada de recogida de residuos en una zona del Monte de El Pardo, organizada de forma independiente.',
		objective: 'Retirar residuos y sensibilizar sobre el cuidado del entorno natural.',
		category: 'accion_solidaria',
		themes: ['medioambiente'],
		status: 'completed',
		startAt: '2026-06-14T09:00:00.000Z',
		durationMinutes: 180,
		meetingPoint: {
			point: { lat: 40.5091, lng: -3.7767 },
			label: 'Puerta de Madrid, Monte de El Pardo',
			address: 'Puerta de Madrid',
			city: 'Madrid',
			province: 'Madrid'
		},
		organizerId: 'org-12',
		createdByUserId: 'user-org-12',
		verification: { level: 'identity_verified', identityVerifiedAt: '2026-06-01T09:00:00.000Z' },
		priorCommunication: 'not_required',
		rules: [
			'Traer guantes y bolsas propias si es posible.',
			'Respetar la fauna y flora del entorno.'
		],
		peacefulDeclaration: true,
		attendance: { going: 34, interested: 20, isEstimate: true },
		createdAt: '2026-05-20T08:00:00.000Z',
		updatedAt: '2026-06-15T10:00:00.000Z'
	},
	{
		id: 'evt-13',
		slug: 'concentracion-vivienda-cancelada-valencia',
		title: 'Concentración por el precio del alquiler',
		description:
			'Concentración pacífica frente al ayuntamiento para pedir medidas de contención del precio del alquiler.',
		objective: 'Solicitar la aprobación de medidas locales de regulación del alquiler.',
		category: 'concentracion',
		themes: ['vivienda'],
		status: 'cancelled',
		statusNote:
			'Convocatoria cancelada por la organización tras alcanzar un acuerdo de reunión con el ayuntamiento. Se convocará una nueva fecha si no hay avances.',
		startAt: '2026-07-29T18:00:00.000Z',
		durationMinutes: 60,
		meetingPoint: {
			point: { lat: 39.4699, lng: -0.3763 },
			label: 'Plaza del Ayuntamiento',
			address: 'Plaza del Ayuntamiento, s/n',
			city: 'Valencia',
			province: 'Valencia'
		},
		organizerId: 'org-4',
		createdByUserId: 'user-org-4',
		verification: {
			level: 'organization_verified',
			organizationVerifiedAt: '2026-07-01T09:00:00.000Z'
		},
		priorCommunication: 'acknowledged',
		rules: ['Concentración pacífica y ordenada.'],
		peacefulDeclaration: true,
		attendance: { going: 40, interested: 95, isEstimate: true },
		createdAt: '2026-06-25T08:00:00.000Z',
		updatedAt: '2026-07-27T11:00:00.000Z'
	},
	{
		id: 'evt-14',
		slug: 'concentracion-oculta-revision-madrid',
		title: 'Concentración pendiente de revisión de contenido',
		description:
			'Convocatoria ocultada temporalmente mientras moderación revisa un reporte recibido sobre el contenido publicado.',
		objective: 'Pendiente de confirmación tras revisión.',
		category: 'concentracion',
		themes: ['vecinal'],
		status: 'hidden',
		statusNote:
			'Convocatoria oculta temporalmente mientras se revisa un reporte. No visible en el listado público.',
		startAt: '2026-08-14T18:00:00.000Z',
		durationMinutes: 60,
		meetingPoint: {
			point: { lat: 40.42, lng: -3.6976 },
			label: 'Plaza de Cibeles',
			address: 'Plaza de Cibeles, s/n',
			city: 'Madrid',
			province: 'Madrid'
		},
		organizerId: 'org-1',
		createdByUserId: 'user-org-1',
		verification: { level: 'none' },
		priorCommunication: 'unknown',
		rules: ['Concentración pacífica.'],
		peacefulDeclaration: true,
		attendance: { going: 5, interested: 18, isEstimate: true },
		createdAt: '2026-07-26T08:00:00.000Z',
		updatedAt: '2026-07-29T09:00:00.000Z'
	},
	{
		id: 'evt-15',
		slug: 'convocatoria-rechazada-murcia',
		title: 'Convocatoria rechazada por incumplir normas de la plataforma',
		description:
			'Solicitud de convocatoria que no supera la revisión de moderación por no acreditar el carácter pacífico declarado.',
		objective: 'No publicada.',
		category: 'otro',
		themes: ['vecinal'],
		status: 'rejected',
		statusNote:
			'Rechazada por moderación: el contenido enviado no permitía verificar el carácter pacífico de la convocatoria.',
		startAt: '2026-08-20T18:00:00.000Z',
		durationMinutes: 60,
		meetingPoint: {
			point: { lat: 37.9922, lng: -1.1307 },
			label: 'Plaza Circular',
			address: 'Plaza Circular, s/n',
			city: 'Murcia',
			province: 'Murcia'
		},
		organizerId: 'org-12',
		createdByUserId: 'user-org-12',
		verification: { level: 'none' },
		priorCommunication: 'unknown',
		rules: [],
		peacefulDeclaration: false,
		attendance: { going: 0, interested: 0, isEstimate: true },
		createdAt: '2026-07-24T08:00:00.000Z',
		updatedAt: '2026-07-25T09:00:00.000Z'
	},
	{
		id: 'evt-16',
		slug: 'asamblea-vecinal-valladolid-parque',
		title: 'Asamblea vecinal por un nuevo parque público',
		description:
			'Asamblea abierta en la plaza del barrio para debatir la propuesta vecinal de un nuevo parque en el solar municipal.',
		objective: 'Consensuar una propuesta vecinal conjunta para presentar al ayuntamiento.',
		category: 'asamblea',
		themes: ['vecinal', 'medioambiente'],
		status: 'published',
		startAt: '2026-08-11T19:00:00.000Z',
		durationMinutes: 90,
		meetingPoint: {
			point: { lat: 41.6523, lng: -4.7245 },
			label: 'Plaza Mayor',
			address: 'Plaza Mayor, s/n',
			city: 'Valladolid',
			province: 'Valladolid'
		},
		organizerId: 'org-6',
		createdByUserId: 'user-org-6',
		verification: { level: 'none' },
		priorCommunication: 'not_required',
		rules: ['Asamblea abierta, turno de palabra ordenado.'],
		peacefulDeclaration: true,
		attendance: { going: 22, interested: 41, isEstimate: true },
		createdAt: '2026-07-18T08:00:00.000Z',
		updatedAt: '2026-07-18T08:00:00.000Z'
	},
	{
		id: 'evt-17',
		slug: 'jornada-reivindicativa-transporte-barcelona',
		title: 'Jornada reivindicativa por el transporte público metropolitano',
		description:
			'Jornada de sensibilización y concentración para pedir la ampliación de líneas de bus nocturno en el área metropolitana.',
		objective: 'Reclamar la ampliación del servicio nocturno de transporte público.',
		category: 'jornada_reivindicativa',
		themes: ['movilidad', 'servicios_publicos'],
		status: 'published',
		startAt: '2026-08-21T20:00:00.000Z',
		durationMinutes: 90,
		meetingPoint: {
			point: { lat: 41.3874, lng: 2.1686 },
			label: 'Plaça de Catalunya',
			address: 'Plaça de Catalunya, s/n',
			city: 'Barcelona',
			province: 'Barcelona'
		},
		organizerId: 'org-7',
		createdByUserId: 'user-org-7',
		verification: {
			level: 'organization_verified',
			organizationVerifiedAt: '2026-07-14T09:00:00.000Z'
		},
		priorCommunication: 'submitted',
		rules: ['Concentración pacífica, sin ocupar carriles de circulación.'],
		peacefulDeclaration: true,
		attendance: { going: 140, interested: 300, isEstimate: true },
		createdAt: '2026-06-30T08:00:00.000Z',
		updatedAt: '2026-07-14T09:00:00.000Z'
	},
	{
		id: 'evt-18',
		slug: 'recogida-solidaria-material-escolar-sevilla',
		title: 'Recogida solidaria de material escolar',
		description:
			'Punto de recogida de mochilas y material escolar para familias con dificultades económicas antes del inicio de curso.',
		objective: 'Garantizar que ningún niño o niña empiece el curso sin material escolar.',
		category: 'accion_solidaria',
		themes: ['solidaridad', 'educacion'],
		status: 'completed',
		startAt: '2026-07-05T09:00:00.000Z',
		durationMinutes: 300,
		meetingPoint: {
			point: { lat: 37.3828, lng: -5.9731 },
			label: 'Casa de la Cultura',
			address: 'Calle Cultura, 4',
			city: 'Sevilla',
			province: 'Sevilla'
		},
		organizerId: 'org-5',
		createdByUserId: 'user-org-5',
		verification: {
			level: 'documentation_reviewed',
			organizationVerifiedAt: '2026-06-01T09:00:00.000Z',
			documentationReviewedAt: '2026-06-03T09:00:00.000Z'
		},
		priorCommunication: 'not_required',
		rules: ['Actividad abierta a toda la ciudadanía.'],
		peacefulDeclaration: true,
		attendance: { going: 88, interested: 30, isEstimate: true },
		createdAt: '2026-06-01T08:00:00.000Z',
		updatedAt: '2026-07-06T10:00:00.000Z'
	}
];

export function getEventById(id: string): Event | undefined {
	return mockEvents.find((e) => e.id === id);
}

export function getEventBySlug(slug: string): Event | undefined {
	return mockEvents.find((e) => e.slug === slug);
}

/** Convocatorias visibles en superficies públicas (Inicio, Mapa). */
export function getPublicEvents(): Event[] {
	const hiddenStates = new Set(['draft', 'pending_review', 'hidden', 'rejected']);
	return mockEvents.filter((e) => !hiddenStates.has(e.status));
}
