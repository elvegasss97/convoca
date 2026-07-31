-- 0019_legal_acceptance_metadata.sql
--
-- handle_new_user() (0007, extendida en 0017) debe rellenar también las
-- columnas nuevas de 0018 para el alta por correo/contraseña, que ya
-- recoge las tres aceptaciones (términos, privacidad, uso pacífico) en el
-- propio formulario de /registro — si no se hiciera aquí, a esas cuentas
-- también les tocaría pasar por /aceptar-condiciones justo después de
-- registrarse, pese a haber aceptado ya en el mismo formulario.
--
-- Las altas por Google siguen sin metadatos `accepted_*` (no hay
-- checkboxes en ese flujo, ver 0017): para ellas todo esto queda en NULL,
-- exactamente igual que antes, y es la gate en /crear (Fase 2 de la
-- migración a producción) la que las manda a /aceptar-condiciones antes de
-- poder publicar su primera convocatoria.
--
-- La versión guardada es la que el cliente envía en los metadatos
-- (`legal_terms_version`, etc., ver `src/lib/legal/versions.ts` y
-- `signUp()`/`acceptLegalTerms()` en `authService.ts`) — nunca se asume
-- aquí, así queda registrado exactamente qué versión del texto vio y
-- aceptó la persona.

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
	terms_accepted boolean := (meta->>'accepted_terms')::boolean is true;
	privacy_accepted boolean := (meta->>'accepted_privacy')::boolean is true;
	peaceful_use_accepted boolean := (meta->>'accepted_peaceful_use')::boolean is true;
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
		organizer_id, user_id, legal_organization_name,
		accepted_terms_at, accepted_privacy_at, accepted_peaceful_use_at,
		accepted_terms_version, accepted_privacy_version, accepted_peaceful_use_version
	)
	values (
		new_organizer_id,
		new.id,
		nullif(trim(meta->>'organization_name'), ''),
		case when terms_accepted then now() else null end,
		case when privacy_accepted then now() else null end,
		case when peaceful_use_accepted then now() else null end,
		case when terms_accepted then nullif(trim(meta->>'legal_terms_version'), '') else null end,
		case when privacy_accepted then nullif(trim(meta->>'legal_privacy_version'), '') else null end,
		case when peaceful_use_accepted then nullif(trim(meta->>'legal_peaceful_use_version'), '') else null end
	);

	return new;
end;
$$;
