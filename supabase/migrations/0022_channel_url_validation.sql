-- 0022_channel_url_validation.sql
--
-- Espejo en base de datos de `src/lib/utils/channelUrl.ts`: la validación
-- del cliente es solo UX, esta es la que de verdad impide que una llamada
-- directa a la API de Supabase (saltándose el formulario por completo)
-- cuele un enlace `javascript:`, `data:`, con HTML, o un dominio que
-- imite a WhatsApp/Telegram. Las expresiones regulares anclan el host con
-- `(/|$)` a propósito: sin eso, `https://chat.whatsapp.com.attacker.net`
-- pasaría un simple `LIKE '%whatsapp.com%'`.

alter table public.event_communication_channels
	add constraint channels_url_https_check check (url ~ '^https://');

alter table public.event_communication_channels
	add constraint channels_url_no_html_check check (url !~ '[<>]');

alter table public.event_communication_channels
	add constraint channels_url_platform_domain_check check (
		platform not in ('whatsapp', 'telegram')
		or (
			platform = 'whatsapp'
			and (
				url ~ '^https://chat\.whatsapp\.com(/|$)'
				or url ~ '^https://([a-z0-9-]+\.)?whatsapp\.com(/|$)'
			)
		)
		or (
			platform = 'telegram'
			and (
				url ~ '^https://t\.me(/|$)'
				or url ~ '^https://telegram\.me(/|$)'
			)
		)
	);
