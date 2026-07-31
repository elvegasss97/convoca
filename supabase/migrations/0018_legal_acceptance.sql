-- 0018_legal_acceptance.sql
--
-- Cierra un hueco real: las altas por Google (0017) dejan
-- `accepted_terms_at`/`accepted_peaceful_use_at` en NULL para siempre,
-- porque ese flujo no tiene formulario donde marcar checkboxes. Antes de
-- esta migración no existía tampoco ninguna aceptación de política de
-- privacidad (ni en el alta por correo ni por Google).
--
-- Se añade una columna de aceptación + versión por cada documento legal
-- (términos, privacidad, uso pacífico) en vez de una única fecha global:
-- si el texto de un documento cambia, solo ese documento debe volver a
-- aceptarse, sin invalidar los otros dos. La versión que se guarda es la
-- que compara `src/lib/legal/versions.ts` en el cliente para decidir si
-- hace falta volver a pedir la aceptación.
--
-- No se borra ni se reescribe ningún dato existente: todas las columnas
-- nuevas son nullable y las cuentas ya creadas (con o sin aceptación
-- previa de términos/uso pacífico) simplemente tendrán las nuevas en NULL
-- hasta que pasen por la pantalla de aceptación.

alter table public.organizer_private_profiles
	add column accepted_privacy_at timestamptz,
	add column accepted_terms_version text,
	add column accepted_privacy_version text,
	add column accepted_peaceful_use_version text;

comment on column public.organizer_private_profiles.accepted_privacy_at is
	'Fecha de aceptación de la política de privacidad. NULL = pendiente (nunca se marca automáticamente).';
comment on column public.organizer_private_profiles.accepted_terms_version is
	'Versión del texto de condiciones de uso que se aceptó (ver src/lib/legal/versions.ts). Si el texto cambia de versión, se vuelve a pedir aceptación aunque accepted_terms_at ya tuviera fecha.';
comment on column public.organizer_private_profiles.accepted_privacy_version is
	'Versión del texto de política de privacidad que se aceptó.';
comment on column public.organizer_private_profiles.accepted_peaceful_use_version is
	'Versión del texto de la declaración de uso pacífico que se aceptó.';
