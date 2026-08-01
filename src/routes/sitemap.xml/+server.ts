import type { RequestHandler } from './$types';
import { listPublicEvents } from '$lib/services/eventsService';
import { SITE_URL } from '$lib/seo';

/**
 * Sitemap generado en cada petición a partir de las convocatorias públicas
 * reales (mismo filtro que la página de inicio: nunca incluye
 * draft/pending_review/hidden/rejected/cancelled). No se prerenderiza para
 * que una convocatoria nueva aparezca sin esperar a un rebuild.
 */
const STATIC_PATHS = [
	{ path: '/', changefreq: 'hourly', priority: '1.0' },
	{ path: '/crear', changefreq: 'weekly', priority: '0.7' },
	{ path: '/legal/aviso-legal', changefreq: 'yearly', priority: '0.2' },
	{ path: '/legal/privacidad', changefreq: 'yearly', priority: '0.2' },
	{ path: '/legal/terminos', changefreq: 'yearly', priority: '0.2' },
	{ path: '/legal/uso-pacifico', changefreq: 'yearly', priority: '0.2' }
];

function xmlEscape(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: RequestHandler = async () => {
	const events = await listPublicEvents();

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

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...eventEntries].join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=0, s-maxage=3600'
		}
	});
};
