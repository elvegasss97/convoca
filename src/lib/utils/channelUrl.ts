import type { ChannelPlatform } from '$lib/types';

/**
 * Validación de URLs de canales de coordinación (WhatsApp/Telegram/otro).
 * Se usa en el formulario (`/crear`, `EditEventDialog`) para dar feedback
 * inmediato, y sus mismas reglas se replican en una restricción de base de
 * datos (`supabase/migrations/0021_communication_channels.sql`,
 * `channels_url_scheme_check` y `channels_url_platform_domain_check`) para
 * que una llamada directa a la API de Supabase, saltándose por completo
 * este cliente, no pueda colar un enlace inválido. Esta es la única
 * comprobación "de servidor" posible en una app sin backend propio: nunca
 * se resuelve/sigue la URL desde ningún servidor de Convoca.
 */

export const CHANNEL_URL_MAX_LENGTH = 500;

const WHATSAPP_HOSTS = ['chat.whatsapp.com', 'whatsapp.com'];
const TELEGRAM_HOSTS = ['t.me', 'telegram.me'];

function hostMatches(hostname: string, allowed: string[]): boolean {
	const host = hostname.toLowerCase();
	return allowed.some((a) => host === a || host.endsWith(`.${a}`));
}

export interface ChannelUrlValidation {
	valid: boolean;
	error?: string;
}

/**
 * Comprueba forma (no contenido): esquema, longitud, ausencia de HTML, y —
 * si la plataforma es whatsapp/telegram— que el dominio sea uno real de esa
 * plataforma (comparación exacta de host, nunca `includes()`: un `includes`
 * dejaría pasar dominios como "chat.whatsapp.com.attacker.net").
 */
export function validateChannelUrl(
	rawUrl: string,
	platform: ChannelPlatform
): ChannelUrlValidation {
	const url = rawUrl.trim();

	if (!url) return { valid: false, error: 'Añade un enlace.' };
	if (url.length > CHANNEL_URL_MAX_LENGTH) {
		return {
			valid: false,
			error: `El enlace no puede superar los ${CHANNEL_URL_MAX_LENGTH} caracteres.`
		};
	}
	// Cualquier etiqueta HTML (o el simple hecho de contener `<`/`>`) se
	// rechaza directamente: un enlace nunca debería necesitar esos caracteres.
	if (/[<>]/.test(url)) {
		return { valid: false, error: 'El enlace no puede contener HTML.' };
	}

	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return { valid: false, error: 'Ese enlace no es una URL válida.' };
	}

	// Solo https — descarta http, javascript:, data:, vbscript:, file: y
	// cualquier otro esquema. No hay excepción posible aquí.
	if (parsed.protocol !== 'https:') {
		return { valid: false, error: 'El enlace debe empezar por https://.' };
	}

	if (platform === 'whatsapp' && !hostMatches(parsed.hostname, WHATSAPP_HOSTS)) {
		return {
			valid: false,
			error: 'Ese enlace no es un dominio real de WhatsApp (chat.whatsapp.com).'
		};
	}
	if (platform === 'telegram' && !hostMatches(parsed.hostname, TELEGRAM_HOSTS)) {
		return { valid: false, error: 'Ese enlace no es un dominio real de Telegram (t.me).' };
	}

	return { valid: true };
}
