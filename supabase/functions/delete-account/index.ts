import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Autoeliminación de cuenta: la ÚNICA operación de este proyecto que
// necesita la service_role key (para poder llamar a auth.admin.deleteUser).
// Esa clave vive exclusivamente en las variables de entorno del runtime de
// esta función (inyectadas automáticamente por Supabase) y nunca llega al
// navegador. `verify_jwt: true` (fijado al desplegar) hace que la propia
// plataforma rechace la petición si no trae un JWT válido antes de que este
// código se ejecute; además comprobamos el usuario nosotros mismos como
// defensa en profundidad.
//
// `auth.admin.deleteUser` borra la fila de auth.users, lo que dispara en
// cascada el borrado de profiles/organizers/organizer_private_profiles
// (FKs `on delete cascade`). Las convocatorias (`events.created_by_user_id`)
// usan `on delete restrict` a propósito: si la cuenta tiene alguna
// convocatoria creada (borrador o publicada), el borrado falla con una
// violación de clave foránea y devolvemos un mensaje claro en vez de dejar
// contenido público huérfano o borrarlo silenciosamente.

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
	const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

	const adminClient = createClient(supabaseUrl, serviceRoleKey);
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
					? 'No puedes eliminar tu cuenta porque tiene convocatorias creadas. Cancélalas o contacta con moderación.'
					: 'No se ha podido eliminar la cuenta.'
			}),
			{ status: 409, headers: { 'Content-Type': 'application/json' } }
		);
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
});
