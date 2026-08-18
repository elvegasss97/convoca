-- 0053_fix_verification_document_view_authoritative_path.sql
--
-- Corrige el hallazgo medio (M1) de la revisión final del PR #27:
-- `log_verification_document_view(p_document_id)` (0051) solo validaba
-- que `p_document_id` existiera, pero el `storage_path` real usado para
-- firmar la URL lo mandaba el CLIENTE por separado
-- (`getVerificationDocumentSignedUrl(documentId, storagePath)`,
-- `src/lib/services/organizersService.ts`) — sin comprobar que ambos
-- valores pertenecieran a la misma fila. Un actor YA autenticado como
-- staff (sin necesitar privilegios nuevos, ya tiene acceso a cualquier
-- documento vía RLS) podía llamar la función con un `p_document_id` y
-- pedir luego una URL firmada de un `storage_path` distinto: la entrada
-- de `audit_trail` quedaba asociada al documento equivocado.
--
-- Corrección: `documentId` pasa a ser la ÚNICA fuente de verdad. La
-- función ahora RESUELVE ella misma el `storage_path` real de esa fila
-- (con las mismas comprobaciones de siempre: sesión con `auth.uid()`,
-- `is_moderator_or_admin()` — rol + aal2 desde 0052 — y que el documento
-- exista) y lo DEVUELVE, en vez de limitarse a registrar la auditoría. El
-- cliente ya no puede aportar ningún `storage_path` propio: usa
-- exactamente el valor que esta función resuelve y devuelve, para la
-- URL firmada y para lo que queda auditado — nunca pueden divergir
-- porque son el mismo valor.
--
-- El tipo de retorno cambia de `void` a `text` (el storage_path
-- validado): Postgres no permite cambiar el tipo de retorno con
-- `CREATE OR REPLACE FUNCTION`, así que hace falta un `DROP FUNCTION`
-- explícito antes de recrearla — un `DROP FUNCTION` no arrastra ningún
-- dato (la función no tiene estado), y no hay ningún trigger ni otra
-- función que dependa de ella (solo se invoca como RPC directa desde el
-- cliente), así que es seguro.
--
-- No se toca: exigencia de aal2 (via is_moderator_or_admin(), 0052),
-- RLS de `verification_documents`/`storage.objects` (0006, sin cambios),
-- bucket privado (sin cambios), inmutabilidad de `audit_trail` (0049,
-- sigue sin política de UPDATE/DELETE para nadie). No se usa
-- `service_role` en ningún momento — la función sigue siendo
-- `SECURITY DEFINER` exactamente igual que antes, invocada por el
-- cliente con su propio JWT de `authenticated`.
--
-- Nota para quien revise el PR: redefine una función SECURITY DEFINER ya
-- existente — el commit debe llevar
-- "Security-Baseline-Override: security-definer:log_verification_document_view".

drop function if exists public.log_verification_document_view(uuid);

create function public.log_verification_document_view(p_document_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	v_storage_path text;
begin
	if auth.uid() is null or not public.is_moderator_or_admin() then
		raise exception 'No tienes permiso para ver este documento.';
	end if;

	select storage_path into v_storage_path
	from public.verification_documents
	where id = p_document_id;

	if v_storage_path is null then
		raise exception 'Documento no encontrado.';
	end if;

	insert into public.audit_trail (target_type, target_id, action, actor_type, actor_id, metadata)
	values ('verification_document', p_document_id, 'verification_document_signed_url_issued', 'human', auth.uid(), '{}'::jsonb);

	return v_storage_path;
end;
$$;

comment on function public.log_verification_document_view is
	'Registra en audit_trail que moderación/administración ha visto un documento de verificación Y devuelve el storage_path REAL de esa fila (resuelto aquí, nunca aportado por el cliente) — la única fuente de verdad de qué archivo se firma es el propio p_document_id validado en esta función. Ver 0053 para el hallazgo que corrige.';

revoke execute on function public.log_verification_document_view(uuid) from public, anon;
grant execute on function public.log_verification_document_view(uuid) to authenticated;
