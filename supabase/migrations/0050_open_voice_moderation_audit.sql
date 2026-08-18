-- 0050_open_voice_moderation_audit.sql
--
-- Fase 1 del Centro de Operaciones, paso c de 4: cola de moderación de
-- Voz abierta. La política RLS y el trigger de `open_voice_contributions`
-- (0047) YA permiten a moderación/administración leer cualquier fila y
-- cambiar `status`/`moderation_status` libremente (todo lo demás —
-- contenido, ámbito, autor, retirada en nombre de otra cuenta — ya está
-- bloqueado por `enforce_open_voice_contribution_update`, sin cambios
-- aquí). Lo único que falta para que esa capacidad quede auditada es
-- este trigger: registra en `audit_trail` (0049) cada cambio de
-- `moderation_status` hecho por un cliente autenticado.
--
-- Deliberadamente NO audita cambios de `status` ('recibida' /
-- 'analisis_conjunto' / 'posible_propuesta'): ese campo pertenece al
-- recorrido futuro descrito al final de 0047 ("hoy no lo pone ningún
-- proceso automático"), fuera del alcance de esta fase — ninguna función
-- de servicio de esta fase lo expone para cambiarlo.
--
-- No se audita la retirada de la propia cuenta (`withdrawn_at`): no es
-- una acción de moderación, es autoservicio del ciudadano sobre su
-- propio contenido — fuera del ámbito del Centro de Operaciones.

create or replace function public.log_open_voice_moderation_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	-- Sin auth.uid() (SQL Editor/MCP con postgres) no hay actor humano al
	-- que atribuir la entrada: se omite el registro, igual que el resto de
	-- operaciones manuales de administración de esta base de datos no
	-- quedan auditadas (documentado también para el cambio de rol, 0048).
	if auth.uid() is not null then
		insert into public.audit_trail (target_type, target_id, action, actor_type, actor_id, metadata)
		values (
			'open_voice_contribution',
			new.id,
			'open_voice_moderation_update',
			'human',
			auth.uid(),
			jsonb_build_object(
				'from_moderation_status', old.moderation_status,
				'to_moderation_status', new.moderation_status
			)
		);
	end if;
	return new;
end;
$$;

comment on function public.log_open_voice_moderation_update is
	'Registra en audit_trail cada cambio de moderation_status de open_voice_contributions hecho por un cliente autenticado. Solo estados (pending/approved/flagged/rejected), nunca el contenido de la aportación.';

revoke execute on function public.log_open_voice_moderation_update() from public, anon, authenticated;

create trigger open_voice_contributions_log_moderation_update
	after update on public.open_voice_contributions
	for each row
	when (new.moderation_status is distinct from old.moderation_status)
	execute function public.log_open_voice_moderation_update();
