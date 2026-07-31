-- 0017_google_oauth_metadata_fallback.sql
--
-- Fase Google OAuth: handle_new_user() debe seguir funcionando igual para
-- registro con correo/contraseña (metadatos propios: display_name,
-- organizer_kind, organization_name, accepted_terms, accepted_peaceful_use)
-- Y para el nuevo alta por Google OAuth, cuyos metadatos vienen con la
-- forma que normaliza Supabase a partir del perfil de Google
-- (full_name/name, avatar_url/picture, email) — no con nuestras claves
-- propias, porque no hay formulario de registro de por medio.
--
-- El rol sigue sin depender de NINGÚN metadato en ningún caso (siempre
-- 'organizer' por defecto, línea sin cambios): un inicio de sesión de
-- Google no puede convertir a nadie en moderador ni administrador.
--
-- accepted_terms_at/accepted_peaceful_use_at quedan en NULL para altas por
-- Google (no hay checkboxes que aceptar en ese flujo): es una limitación
-- conocida, no un descuido — ver el informe de esta fase.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	new_organizer_id uuid;
	meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
	resolved_display_name text := coalesce(
		nullif(trim(meta->>'display_name'), ''),
		nullif(trim(meta->>'full_name'), ''),
		nullif(trim(meta->>'name'), ''),
		'Organizador sin nombre'
	);
	resolved_avatar_url text := coalesce(
		nullif(trim(meta->>'avatar_url'), ''),
		nullif(trim(meta->>'picture'), '')
	);
begin
	insert into public.profiles (id, role)
	values (new.id, 'organizer');

	insert into public.organizers (created_by, display_name, kind, avatar_url)
	values (
		new.id,
		resolved_display_name,
		coalesce(meta->>'organizer_kind', 'otro'),
		resolved_avatar_url
	)
	returning id into new_organizer_id;

	insert into public.organizer_private_profiles (
		organizer_id, user_id, legal_organization_name, accepted_terms_at, accepted_peaceful_use_at
	)
	values (
		new_organizer_id,
		new.id,
		nullif(trim(meta->>'organization_name'), ''),
		case when (meta->>'accepted_terms')::boolean is true then now() else null end,
		case when (meta->>'accepted_peaceful_use')::boolean is true then now() else null end
	);

	return new;
end;
$$;
