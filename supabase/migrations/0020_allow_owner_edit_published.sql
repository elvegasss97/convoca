-- 0020_allow_owner_edit_published.sql
--
-- Bug real encontrado en staging: `EditEventDialog.svelte` envía
-- `status: 'modified'` al editar el contenido de una convocatoria ya
-- `published` (para que moderación sepa que el contenido cambió tras la
-- aprobación, sin ocultarla — 'modified' no está en la lista de estados
-- que `events_select_public` excluye, así que sigue siendo visible).
--
-- `enforce_event_update_rules()` (0003_events.sql) nunca permitía esa
-- transición para quien no es moderador/admin: solo dejaba
-- `draft -> pending_review` o `-> cancelled`. El resultado real,
-- verificado en vivo: el propio dueño de una convocatoria publicada no
-- podía editar ni el título ni la descripción — el UPDATE siempre lo
-- rechazaba la base de datos. No es un problema de RLS (la política ya
-- permitía el UPDATE al dueño), es este trigger el que bloqueaba la
-- transición de estado que el cliente intenta en el mismo UPDATE.

create or replace function public.enforce_event_update_rules()
returns trigger
language plpgsql
as $$
declare
	is_staff boolean := public.is_moderator_or_admin();
begin
	if new.organizer_id is distinct from old.organizer_id
		or new.created_by_user_id is distinct from old.created_by_user_id then
		raise exception 'No se puede reasignar una convocatoria a otro organizador o cuenta.';
	end if;

	if not is_staff then
		if new.verification is distinct from old.verification then
			raise exception 'Solo moderación puede cambiar el nivel de verificación.';
		end if;

		if new.status is distinct from old.status then
			if not (
				(old.status = 'draft' and new.status = 'pending_review')
				or (old.status = 'published' and new.status = 'modified')
				or new.status = 'cancelled'
			) then
				raise exception 'No tienes permiso para cambiar el estado de moderación de esta convocatoria.';
			end if;
		end if;
	end if;

	return new;
end;
$$;
