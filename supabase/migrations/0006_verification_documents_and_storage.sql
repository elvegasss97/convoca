-- 0006_verification_documents_and_storage.sql
--
-- Qué crea (no borra nada):
--   1. `public.verification_documents`: metadatos del documento (tipo,
--      estado de revisión...). El archivo en sí NO se guarda aquí.
--   2. Un bucket de Storage privado `verification-documents` (creado con
--      `public = false`) para el archivo real.
--   3. Políticas de `storage.objects` que exigen que cada archivo viva bajo
--      una carpeta con el propio uid del organizador
--      (`verification-documents/<uid>/<archivo>`), y que solo el propio
--      usuario o moderación/administración puedan leerlo. Nadie más — ni
--      siquiera con la URL exacta del objeto — puede acceder a él, porque
--      el bucket no es público y no hay política para `anon`.
--
-- Esto reemplaza la nota del prototipo mock ("los documentos de
-- verificación nunca se persisten, solo viven en memoria"): ahora si
-- persisten, pero en un almacenamiento privado con control de acceso real
-- en el servidor, no en localStorage del navegador.

create table public.verification_documents (
	id uuid primary key default gen_random_uuid(),
	organizer_id uuid not null references public.organizers (id) on delete cascade,
	event_id uuid references public.events (id) on delete set null,
	uploaded_by_user_id uuid not null references auth.users (id) on delete restrict,
	type text not null check (
		type in ('identity', 'organization_registration', 'prior_communication_receipt', 'other')
	),
	file_name text not null,
	storage_path text not null unique,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	submitted_at timestamptz not null default now(),
	reviewed_at timestamptz,
	reviewer_note text
);

comment on table public.verification_documents is
	'Metadatos de documentos de verificación. El archivo vive en el bucket privado verification-documents, en storage_path.';

alter table public.verification_documents enable row level security;

create index verification_documents_organizer_id_idx on public.verification_documents (organizer_id);

create policy "verification_documents_select_own_or_staff"
	on public.verification_documents for select
	to authenticated
	using (uploaded_by_user_id = auth.uid() or public.is_moderator_or_admin());

create policy "verification_documents_insert_own"
	on public.verification_documents for insert
	to authenticated
	with check (
		uploaded_by_user_id = auth.uid()
		and exists (
			select 1 from public.organizers o
			where o.id = organizer_id and o.created_by = auth.uid()
		)
		-- El propio uid debe ser el primer segmento de la ruta en el bucket,
		-- para que la política de storage.objects (más abajo) pueda
		-- comprobar la propiedad sin tener que consultar esta tabla.
		and storage_path like (auth.uid()::text || '/%')
	);

-- Solo moderación/administración pueden revisar (cambiar status/reviewed_at
-- /reviewer_note). El propio organizador no puede marcarse su documento
-- como aprobado.
create policy "verification_documents_update_staff"
	on public.verification_documents for update
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- Storage: bucket privado + políticas de acceso
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'verification-documents',
	'verification-documents',
	false,
	10485760, -- 10 MB (ver Fase 6: límite de tamaño de archivo)
	array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "verification_documents_storage_insert_own"
	on storage.objects for insert
	to authenticated
	with check (
		bucket_id = 'verification-documents'
		and (storage.foldername(name))[1] = auth.uid()::text
	);

create policy "verification_documents_storage_select_own_or_staff"
	on storage.objects for select
	to authenticated
	using (
		bucket_id = 'verification-documents'
		and (
			(storage.foldername(name))[1] = auth.uid()::text
			or public.is_moderator_or_admin()
		)
	);

-- Sin política de UPDATE/DELETE para nadie salvo lo que ya cubre Postgres
-- por defecto (denegado): un documento de verificación no se sobrescribe,
-- se vuelve a subir como un objeto nuevo si hace falta corregirlo.
