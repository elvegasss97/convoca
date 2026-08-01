-- 0024_pin_search_path_trigger_functions.sql
--
-- Hallazgo del escáner de seguridad (`get_advisors`) tras esta fase:
-- `enforce_channel_update_rules` (nueva, 0021) y `enforce_event_update_rules`
-- (preexistente, 0003 — hueco de antes de esta fase, corregido de paso) no
-- fijaban `search_path`, a diferencia del resto de funciones del proyecto
-- (p. ej. `handle_new_user`). Sin `search_path` fijo, una función es
-- vulnerable en teoría a "search path hijacking" si alguna vez existiera un
-- esquema adicional con un objeto del mismo nombre resuelto antes que
-- `public`. Ninguna de las dos es `security definer`, así que el riesgo
-- real aquí es bajo, pero fijarlo es gratis y es la convención ya
-- establecida en el resto de funciones del esquema.

create or replace function public.enforce_channel_update_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	is_owner boolean;
begin
	select exists(
		select 1 from public.events e
		where e.id = new.event_id and e.created_by_user_id = auth.uid()
	) into is_owner;

	if not is_owner and not public.is_moderator_or_admin() then
		raise exception 'No tienes permiso para modificar este canal.';
	end if;

	if not is_owner then
		if new.url is distinct from old.url
			or new.label is distinct from old.label
			or new.platform is distinct from old.platform
			or new.channel_type is distinct from old.channel_type
			or new.event_id is distinct from old.event_id then
			raise exception 'Moderación solo puede ocultar o restaurar el canal, no editar su contenido.';
		end if;
	end if;

	return new;
end;
$$;

create or replace function public.enforce_event_update_rules()
returns trigger
language plpgsql
set search_path = public
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
