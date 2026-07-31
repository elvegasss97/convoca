import type { Organizer } from '$lib/types';

export const mockOrganizers: Organizer[] = [
	{
		id: 'org-1',
		displayName: 'Asociación Vecinal Lavapiés',
		kind: 'asociacion',
		bio: 'Asociación de vecinos y vecinas del barrio de Lavapiés, activa desde 1987.',
		contactEmail: 'contacto@vecinoslavapies.example',
		website: 'https://vecinoslavapies.example',
		publishedEventsCount: 14,
		createdAt: '2021-03-02T10:00:00.000Z'
	},
	{
		id: 'org-2',
		displayName: 'Marea Verde Ríos Vivos',
		kind: 'colectivo',
		bio: 'Colectivo ciudadano por la defensa de los ríos y espacios naturales.',
		contactEmail: 'hola@riosvivos.example',
		publishedEventsCount: 9,
		createdAt: '2022-05-14T10:00:00.000Z'
	},
	{
		id: 'org-3',
		displayName: 'Sindicato de Limpieza y Servicios',
		kind: 'sindicato',
		bio: 'Sección sindical del sector de limpieza y mantenimiento de edificios públicos.',
		contactEmail: 'prensa@sindicatolimpieza.example',
		publishedEventsCount: 6,
		createdAt: '2020-11-20T10:00:00.000Z'
	},
	{
		id: 'org-4',
		displayName: 'Plataforma por la Vivienda Digna Valencia',
		kind: 'colectivo',
		bio: 'Plataforma ciudadana que acompaña a familias afectadas por desahucios.',
		contactEmail: 'info@viviendadignavlc.example',
		publishedEventsCount: 11,
		createdAt: '2021-09-08T10:00:00.000Z'
	},
	{
		id: 'org-5',
		displayName: 'Banco de Alimentos Solidario Sevilla',
		kind: 'asociacion',
		bio: 'Red de voluntariado para la recogida y reparto de alimentos.',
		contactEmail: 'voluntariado@bassevilla.example',
		website: 'https://bassevilla.example',
		publishedEventsCount: 22,
		createdAt: '2019-01-15T10:00:00.000Z'
	},
	{
		id: 'org-6',
		displayName: 'Laura Etxeberria',
		kind: 'persona',
		bio: 'Vecina de Bilbao, organiza encuentros vecinales sobre movilidad y espacio público.',
		publishedEventsCount: 3,
		createdAt: '2023-02-10T10:00:00.000Z'
	},
	{
		id: 'org-7',
		displayName: 'Colectivo Ciclista Zaragoza Rueda',
		kind: 'colectivo',
		bio: 'Grupo ciclista que promueve la movilidad segura y sostenible en la ciudad.',
		contactEmail: 'contacto@zaragozarueda.example',
		publishedEventsCount: 17,
		createdAt: '2020-06-01T10:00:00.000Z'
	},
	{
		id: 'org-8',
		displayName: 'Asamblea Sanidad Pública Málaga',
		kind: 'colectivo',
		bio: 'Asamblea abierta de profesionales y usuarios en defensa de la sanidad pública.',
		contactEmail: 'asamblea@sanidadmalaga.example',
		publishedEventsCount: 8,
		createdAt: '2022-01-22T10:00:00.000Z'
	},
	{
		id: 'org-9',
		displayName: 'Ateneo Cultural Vigo Norte',
		kind: 'asociacion',
		bio: 'Espacio comunitario de cultura popular y actividades vecinales.',
		contactEmail: 'ateneo@vigonorte.example',
		publishedEventsCount: 5,
		createdAt: '2021-11-30T10:00:00.000Z'
	},
	{
		id: 'org-10',
		displayName: 'Red Feminista Granada',
		kind: 'colectivo',
		bio: 'Red de colectivos feministas de Granada y su área metropolitana.',
		contactEmail: 'red@feministagranada.example',
		publishedEventsCount: 12,
		createdAt: '2020-03-08T10:00:00.000Z'
	},
	{
		id: 'org-11',
		displayName: 'Plataforma Educación Pública Alicante',
		kind: 'colectivo',
		bio: 'Familias, docentes y estudiantes por una educación pública de calidad.',
		contactEmail: 'contacto@educacionalicante.example',
		publishedEventsCount: 7,
		createdAt: '2022-09-12T10:00:00.000Z'
	},
	{
		id: 'org-12',
		displayName: 'Ismael Redondo',
		kind: 'persona',
		bio: 'Organizador independiente, convocatorias puntuales de limpieza de playas y montes.',
		publishedEventsCount: 2,
		createdAt: '2024-04-04T10:00:00.000Z'
	}
];

export function getOrganizerById(id: string): Organizer | undefined {
	return mockOrganizers.find((o) => o.id === id);
}
