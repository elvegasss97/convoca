-- 0007_new_user_trigger.sql
--
-- Qué crea (no borra nada, no toca filas existentes): un trigger sobre
-- `auth.users` que, en el mismo instante en que Supabase Auth crea la
-- cuenta (`supabase.auth.signUp(...)`), crea automáticamente:
--   1. Su fila en `public.profiles` (rol `organizer` por defecto).
--   2. Su perfil público en `public.organizers`.
--   3. Su perfil privado en `public.organizer_private_profiles`.
--
-- Por qué un trigger y no un `insert` normal desde el cliente justo después
-- del registro: Supabase, por configuración por defecto, exige confirmar
-- el correo antes de dar una sesión activa — así que justo después de
-- `signUp()` puede no existir todavía ningún `auth.uid()` autenticado con
-- el que el cliente pudiera hacer esos `insert`. El trigger, en cambio,
-- corre en el servidor con privilegios elevados (`security definer`) en el
-- mismo momento en que se crea la cuenta, sin depender de que haya sesión.
--
-- Los datos vienen de `options.data` en la llamada a `signUp(...)`
-- (`raw_user_meta_data`): `display_name`, `organizer_kind`,
-- `organization_name`, `accepted_terms`, `accepted_peaceful_use`. Si
-- `accepted_terms`/`accepted_peaceful_use` no vienen como `true` en los
-- metadatos, `accepted_terms_at`/`accepted_peaceful_use_at` quedan en
-- `null` — defensa en profundidad además de la validación que ya hace el
-- formulario de registro en el cliente.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	new_organizer_id uuid;
	meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
	insert into public.profiles (id, role)
	values (new.id, 'organizer');

	insert into public.organizers (created_by, display_name, kind)
	values (
		new.id,
		coalesce(nullif(trim(meta->>'display_name'), ''), 'Organizador sin nombre'),
		coalesce(meta->>'organizer_kind', 'otro')
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

create trigger on_auth_user_created
	after insert on auth.users
	for each row
	execute function public.handle_new_user();
