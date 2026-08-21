import type { RequestHandler } from './$types';
import { listPublicEvents } from '$lib/services/eventsService';
import { listPublishedConcerns } from '$lib/services/concernsService';
import { listPublishedTopics } from '$lib/services/topicsService';
import { SITE_URL } from '$lib/seo';

/**
 * Sitemap generado en cada petición a partir de las convocatorias públicas
 * reales (mismo filtro que la página de inicio: nunca incluye
 * draft/pending_review/hidden/rejected/cancelled). No se prerenderiza para
 * que una convocatoria nueva aparezca sin esperar a un rebuild.
 */
const STATIC_PATHS = [
	{ path: '/', changefreq: 'monthly', priority: '1.0' },
	{ path: '/descubrir', changefreq: 'hourly', priority: '0.9' },
	{ path: '/crear', changefreq: 'weekly', priority: '0.7' },
	{ path: '/pulso', changefreq: 'daily', priority: '0.8' },
	{ path: '/pulso/escucha', changefreq: 'daily', priority: '0.7' },
	{ path: '/pulso/soluciones', changefreq: 'daily', priority: '0.7' },
	{ path: '/pulso/gasto-publico', changefreq: 'weekly', priority: '0.7' },
	{ path: '/legal/aviso-legal', changefreq: 'yearly', priority: '0.2' },
	{ path: '/legal/privacidad', changefreq: 'yearly', priority: '0.2' },
	{ path: '/legal/terminos', changefreq: 'yearly', priority: '0.2' },
	{ path: '/legal/uso-pacifico', changefreq: 'yearly', priority: '0.2' }
];

function xmlEscape(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: RequestHandler = async () => {
	const [events, concerns, topics] = await Promise.all([
		listPublicEvents(),
		listPublishedConcerns(),
		listPublishedTopics()
	]);

	const staticEntries = STATIC_PATHS.map(
		({ path, changefreq, priority }) => `\t<url>
\t\t<loc>${xmlEscape(SITE_URL + path)}</loc>
\t\t<changefreq>${changefreq}</changefreq>
\t\t<priority>${priority}</priority>
\t</url>`
	);

	const eventEntries = events.map(
		(event) => `\t<url>
\t\t<loc>${xmlEscape(`${SITE_URL}/convocatorias/${event.slug}`)}</loc>
\t\t<lastmod>${event.updatedAt.slice(0, 10)}</lastmod>
\t\t<changefreq>daily</changefreq>
\t\t<priority>0.8</priority>
\t</url>`
	);

	const concernEntries = concerns.map(
		(concern) => `\t<url>
\t\t<loc>${xmlEscape(`${SITE_URL}/pulso/${concern.slug}`)}</loc>
\t\t<lastmod>${concern.updatedAt.slice(0, 10)}</lastmod>
\t\t<changefreq>daily</changefreq>
\t\t<priority>0.6</priority>
\t</url>`
	);

	const topicEntries = topics.map(
		(topic) => `\t<url>
\t\t<loc>${xmlEscape(`${SITE_URL}/pulso/soluciones/${topic.slug}`)}</loc>
\t\t<lastmod>${topic.updatedAt.slice(0, 10)}</lastmod>
\t\t<changefreq>weekly</changefreq>
\t\t<priority>0.6</priority>
\t</url>`
	);

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...eventEntries, ...concernEntries, ...topicEntries].join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=0, s-maxage=3600'
		}
	});
};
