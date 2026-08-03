import { error } from '@sveltejs/kit';
import { ImageResponse } from '@vercel/og';
import type { RequestHandler } from './$types';
import { getEvent } from '$lib/services/eventsService';
import { formatEventDate, formatEventWeekday } from '$lib/utils/date';
import { categoryLabels } from '$lib/labels';

/**
 * Imagen social (1200×630) generada al vuelo para la previsualización al
 * compartir una convocatoria concreta (WhatsApp/Telegram/X/Facebook/Discord).
 * Sin fuente local en formato compatible con satori (los .woff2 variables de
 * @fontsource-variable no lo son), así que las fuentes estáticas se cargan
 * una única vez por instancia de servidor desde Google Fonts (solo bytes de
 * tipografía, sin datos de la convocatoria ni de quien la ve) y se
 * mantienen en caché en memoria para las siguientes peticiones.
 */

let fontsPromise: Promise<{ boldDisplay: ArrayBuffer; mediumBody: ArrayBuffer }> | null = null;

async function loadFonts() {
	if (!fontsPromise) {
		fontsPromise = Promise.all([
			fetchGoogleFont('Space+Grotesk:wght@700', 700),
			fetchGoogleFont('Inter:wght@500', 500)
		]).then(([boldDisplay, mediumBody]) => ({ boldDisplay, mediumBody }));
	}
	return fontsPromise;
}

async function fetchGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
	const cssUrl = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(
		'ConvocatoriasciudadnasCERCADETIabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789áéíóúñÁÉÍÓÚÑ ,.·—'
	)}`;
	const css = await fetch(cssUrl, {
		headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
	}).then((r) => r.text());
	const match = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/);
	const fontUrl = match?.[1];
	if (!fontUrl) throw new Error(`No se pudo resolver la fuente ${family} (${weight})`);
	return fetch(fontUrl).then((r) => r.arrayBuffer());
}

export const GET: RequestHandler = async ({ params, fetch }) => {
	const event = await getEvent(params.slug);
	if (!event) error(404, 'Convocatoria no encontrada');

	try {
		const fonts = await loadFonts();

		return new ImageResponse(
			{
				type: 'div',
				props: {
					style: {
						height: '100%',
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						padding: '80px 96px',
						background: 'linear-gradient(135deg, #14403b 0%, #176056 55%, #1a786a 100%)',
						fontFamily: 'Inter'
					},
					children: [
						{
							type: 'div',
							props: {
								style: {
									display: 'flex',
									alignItems: 'center',
									gap: 16,
									marginBottom: 40
								},
								children: [
									{
										type: 'div',
										props: {
											style: {
												display: 'flex',
												width: 56,
												height: 56,
												borderRadius: 16,
												background: '#FF7101',
												alignItems: 'center',
												justifyContent: 'center',
												fontSize: 28,
												color: 'white',
												fontWeight: 700,
												fontFamily: 'Space Grotesk'
											},
											children: 'C'
										}
									},
									{
										type: 'div',
										props: {
											style: {
												fontSize: 30,
												color: 'white',
												fontWeight: 700,
												fontFamily: 'Space Grotesk'
											},
											children: 'Convoca'
										}
									}
								]
							}
						},
						{
							type: 'div',
							props: {
								style: {
									fontSize: 20,
									fontWeight: 500,
									color: '#f0ac68',
									textTransform: 'uppercase',
									letterSpacing: 2,
									marginBottom: 16
								},
								children: categoryLabels[event.category] ?? 'Convocatoria'
							}
						},
						{
							type: 'div',
							props: {
								style: {
									fontSize: 56,
									fontWeight: 700,
									color: 'white',
									lineHeight: 1.15,
									fontFamily: 'Space Grotesk',
									display: '-webkit-box',
									maxWidth: 950
								},
								children: event.title
							}
						},
						{
							type: 'div',
							props: {
								style: {
									marginTop: 32,
									fontSize: 28,
									fontWeight: 500,
									color: 'rgba(255,255,255,0.92)'
								},
								children: `${capitalize(formatEventWeekday(event.startAt))}, ${formatEventDate(event.startAt)} · ${event.meetingPoint.city}`
							}
						}
					]
				}
			},
			{
				width: 1200,
				height: 630,
				fonts: [
					{ name: 'Space Grotesk', data: fonts.boldDisplay, weight: 700, style: 'normal' },
					{ name: 'Inter', data: fonts.mediumBody, weight: 500, style: 'normal' }
				],
				headers: {
					'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
				}
			}
		);
	} catch {
		// Sin red o fuente no disponible: mejor la imagen genérica de Convoca que un 500.
		const fallback = await fetch('/og/default.png');
		return new Response(fallback.body, {
			headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' }
		});
	}
};

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
