import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Autoeliminación de cuenta: la ÚNICA operación de este proyecto que
// necesita una clave con privilegio elevado (para poder llamar a
// auth.admin.deleteUser). Usa la Secret API Key nombrada "delete_account"
// del sistema Publishable + Secret Keys de Supabase, leída de
// SUPABASE_SECRET_KEYS (JSON inyectado por el runtime, `{ "<nombre>":
// "<clave>", ... }` por cada Secret Key configurada en el proyecto) — ya
// no depende de la clave legacy de rol elevado retirada tras un
// incidente de exposición (ver seguridad/). El valor nunca se loguea ni
// llega al navegador; si el nombre no existe en SUPABASE_SECRET_KEYS se
// falla cerrado con un 500 genérico, sin exponer nada sobre el motivo
// exacto.
//
// `auth.admin.deleteUser` borra la fila de auth.users, lo que dispara en
// cascada el borrado de profiles/organizers/organizer_private_profiles
// (FKs `on delete cascade`). Hay 3 FK `on delete restrict` reales que
// pueden bloquear el borrado a propósito, en vez de dejar contenido
// público huérfano o borrarlo silenciosamente: `events.created_by_user_id`
// (convocatorias creadas), `audit_logs.moderator_id` (acciones de
// moderación registradas) y `verification_documents.uploaded_by_user_id`
// (documentos de verificación subidos). GoTrue no reenvía cuál de las 3
// fue — se detectan todas con el mismo regex genérico y se devuelve un
// mensaje que las cubre a las tres, no solo a la primera.

const DELETE_ACCOUNT_SECRET_KEY_NAME = 'delete_account';

/**
 * Extrae la Secret API Key nombrada "delete_account" de SUPABASE_SECRET_KEYS
 * sin loguear en ningún caso el JSON crudo, la clave concreta ni el motivo
 * exacto de fallo (evita filtrar forma/tamaño del valor en logs de error).
 */
function resolveDeleteAccountSecretKey(): string | undefined {
	const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return undefined;
		const value = (parsed as Record<string, unknown>)[DELETE_ACCOUNT_SECRET_KEY_NAME];
		return typeof value === 'string' && value.length > 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

Deno.serve(async (req: Request) => {
	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Método no permitido' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const authHeader = req.headers.get('Authorization');
	if (!authHeader) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
	const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

	const callerClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: authHeader } }
	});
	const { data: userData, error: userError } = await callerClient.auth.getUser();
	if (userError || !userData.user) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Resuelto justo antes de usarse, tras confirmar que hay una persona
	// autenticada real: si falta la Secret Key configurada, es un error de
	// configuración del servidor, no del usuario que llama — 500 genérico,
	// nunca se detalla el motivo exacto.
	const secretKey = resolveDeleteAccountSecretKey();
	if (!secretKey) {
		return new Response(JSON.stringify({ error: 'No se ha podido procesar la solicitud.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const adminClient = createClient(supabaseUrl, secretKey);
	const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);

	if (deleteError) {
		// GoTrue no reenvía el texto crudo del error de Postgres al cliente:
		// lo envuelve como "Database error deleting user" (verificado en vivo
		// contra el proyecto real). Se comprueba ese envoltorio además del
		// texto crudo por si versiones futuras de GoTrue cambian el mensaje.
		const isForeignKeyViolation =
			/foreign key|violates|restrict|database error deleting user/i.test(deleteError.message);
		return new Response(
			JSON.stringify({
				error: isForeignKeyViolation
					? 'No puedes eliminar tu cuenta todavía: tiene contenido asociado que debe resolverse antes (convocatorias creadas, acciones de moderación registradas o documentos de verificación subidos). Contacta con moderación si necesitas ayuda.'
					: 'No se ha podido eliminar la cuenta.'
			}),
			{ status: 409, headers: { 'Content-Type': 'application/json' } }
		);
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
});
