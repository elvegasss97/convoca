-- 0051_verification_documents_secure_viewer.sql
--
-- Fase 1 del Centro de Operaciones, paso d de 4: visor seguro de
-- documentos de verificación. El archivo YA vive en un bucket privado
-- (`verification-documents`, 0006, `public = false`) y la política
-- `verification_documents_storage_select_own_or_staff` (0006) YA permite
-- a moderación/administración leerlo — esta migración no toca RLS de
-- storage ni crea ningún acceso nuevo: solo añade auditoría.
--
-- La URL firmada en sí se genera en el cliente con
-- `supabase.storage.from('verification-documents').createSignedUrl(path,
-- expiresIn)` (SDK oficial), que respeta esa misma política — nunca un
-- archivo público. "Corta duración" se fija en el servicio de la app
-- (src/lib/services/organizersService.ts), no aquí: Postgres no
-- interviene en la firma del objeto de Storage.
--
-- Dos piezas:
--   1. Trigger de auditoría sobre la revisión ya existente (aprobar/
--      rechazar un documento, `verification_documents_update_staff`,
--      0006) — acción que hoy no dejaba ningún rastro (hallazgo de la
--      auditoría de solo lectura previa a esta fase).
--   2. RPC `log_verification_document_view`: como abrir un documento no
--      cambia ninguna fila (es una lectura de Storage, no un UPDATE), no
--      hay ningún evento de base de datos al que enganchar un trigger —
--      el propio servicio de la app la llama justo después de obtener la
--      URL firmada. Revalida permiso de staff y la existencia del
--      documento por su cuenta (nunca confía en que el cliente ya
--      comprobó nada), e ignora cualquier "actor" que intentara mandar el
--      cliente: siempre usa auth.uid(). Límite conocido y aceptado para
--      esta fase: si el cliente obtiene la URL firmada y nunca llega a
--      llamar a esta función (red caída, pestaña cerrada a tiempo), la
--      visualización no queda registrada — no hay forma de cerrar ese
--      hueco sin mover la propia firma del objeto a una función de
--      servidor, fuera de alcance de esta fase.

create or replace function public.log_verification_document_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is not null then
		insert into public.audit_trail (target_type, target_id, action, actor_type, actor_id, metadata)
		values (
			'verification_document',
			new.id,
			'verification_document_review',
			'human',
			auth.uid(),
			jsonb_build_object('from_status', old.status, 'to_status', new.status)
		);
	end if;
	return new;
end;
$$;

comment on function public.log_verification_document_review is
	'Registra en audit_trail cada cambio de status de verification_documents (aprobar/rechazar) hecho por un cliente autenticado.';

revoke execute on function public.log_verification_document_review() from public, anon, authenticated;

create trigger verification_documents_log_review
	after update on public.verification_documents
	for each row
	when (new.status is distinct from old.status)
	execute function public.log_verification_document_review();

create or replace function public.log_verification_document_view(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is null or not public.is_moderator_or_admin() then
		raise exception 'No tienes permiso para ver este documento.';
	end if;
	if not exists (select 1 from public.verification_documents where id = p_document_id) then
		raise exception 'Documento no encontrado.';
	end if;

	insert into public.audit_trail (target_type, target_id, action, actor_type, actor_id, metadata)
	values ('verification_document', p_document_id, 'verification_document_signed_url_issued', 'human', auth.uid(), '{}'::jsonb);
end;
$$;

comment on function public.log_verification_document_view is
	'Registra en audit_trail que moderación/administración ha generado una URL firmada para ver un documento de verificación. No genera la URL en sí (eso lo hace el SDK de Storage en el cliente, ya autorizado por RLS existente) — solo deja constancia de la visualización.';

revoke execute on function public.log_verification_document_view(uuid) from public, anon;
grant execute on function public.log_verification_document_view(uuid) to authenticated;
