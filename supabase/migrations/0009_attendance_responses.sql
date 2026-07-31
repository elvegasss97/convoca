-- 0009_attendance_responses.sql
--
-- Fase 5 — confirmaciones anónimas de asistencia ("Voy" / "Me interesa").
--
-- Diseño (privacidad ante todo, ver sección 11 del encargo):
--   - NO hay `user_id` ni ninguna columna que identifique a la persona.
--     Nunca se guarda quién asiste, ni siquiera para el organizador.
--   - No se exige cuenta: cualquier visitante (anon) puede confirmar.
--   - `dedup_token` es un UUID aleatorio generado y guardado por el propio
--     navegador (p. ej. en localStorage), no vinculado a ninguna identidad.
--     Es una "capacidad" anónima: solo sirve para (a) que el mismo
--     dispositivo no cuente dos veces en el mismo evento y (b) poder
--     cambiar/retirar su propia respuesta más tarde sin necesitar login.
--   - La tabla NO tiene ninguna política RLS de INSERT/UPDATE/DELETE para
--     `anon`/`authenticated`: toda escritura pasa obligatoriamente por la
--     función `public.set_attendance(...)` (más abajo), que valida las
--     reglas de negocio (evento visible públicamente, valor de respuesta
--     válido, límite de frecuencia) antes de tocar la tabla. Tampoco hay
--     política de SELECT: nadie puede listar respuestas individuales, ni
--     siquiera el organizador — solo se exponen contadores agregados via
--     la función `public.get_attendance_counts(...)`.
--   - Los contadores son ESTIMACIONES por diseño (un dispositivo = un
--     voto aproximado, no una identidad verificada).

create table public.attendance_responses (
	id uuid primary key default gen_random_uuid(),
	event_id uuid not null references public.events (id) on delete cascade,
	response text not null check (response in ('going', 'interested')),
	dedup_token uuid not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (event_id, dedup_token)
);

comment on table public.attendance_responses is
	'Confirmaciones anónimas de asistencia. Sin user_id, sin política de SELECT ni de escritura directa: toda mutación pasa por set_attendance(). dedup_token es un identificador de dispositivo generado por el cliente, no una identidad.';

alter table public.attendance_responses enable row level security;

create index attendance_responses_event_id_idx on public.attendance_responses (event_id);
create index attendance_responses_dedup_token_idx on public.attendance_responses (dedup_token);

-- Sin ninguna política para anon/authenticated: select/insert/update/delete
-- quedan denegados por defecto para todo el mundo salvo la función
-- SECURITY DEFINER de abajo (que sí puede escribir, igual que
-- refresh_organizer_published_count en 0003_events.sql).

-- ---------------------------------------------------------------------------
-- set_attendance(): único punto de escritura. Valida reglas de negocio y
-- aplica un límite de frecuencia básico por dedup_token (defensa razonable
-- sin necesitar identidad ni IP; un límite adicional por IP, si hiciera
-- falta, viviría en una Edge Function o en el API gateway, fuera del
-- alcance de SQL puro).
-- ---------------------------------------------------------------------------

create or replace function public.set_attendance(
	p_event_id uuid,
	p_dedup_token uuid,
	p_response text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	recent_activity_count integer;
begin
	if p_response is not null and p_response not in ('going', 'interested') then
		raise exception 'Respuesta de asistencia no válida.';
	end if;

	if not exists (
		select 1 from public.events e
		where e.id = p_event_id
		and e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
	) then
		raise exception 'Esta convocatoria no admite confirmaciones de asistencia.';
	end if;

	select count(*) into recent_activity_count
	from public.attendance_responses
	where dedup_token = p_dedup_token
	and updated_at > now() - interval '1 minute';

	if recent_activity_count >= 10 then
		raise exception 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.';
	end if;

	if p_response is null then
		delete from public.attendance_responses
		where event_id = p_event_id and dedup_token = p_dedup_token;
		return;
	end if;

	insert into public.attendance_responses (event_id, dedup_token, response)
	values (p_event_id, p_dedup_token, p_response)
	on conflict (event_id, dedup_token)
	do update set response = excluded.response, updated_at = now();
end;
$$;

comment on function public.set_attendance is
	'Único punto de escritura de attendance_responses. p_response = null retira la confirmación. SECURITY DEFINER: la tabla no concede insert/update/delete directo a nadie.';

revoke execute on function public.set_attendance(uuid, uuid, text) from public;
grant execute on function public.set_attendance(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Anonimización/purga posterior al evento (sección 11: preparar
-- eliminación posterior al evento). No se expone a anon/authenticated;
-- pensada para ejecutarse periódicamente (ver programación con pg_cron
-- más abajo) o a mano por un administrador.
-- ---------------------------------------------------------------------------

create or replace function public.purge_old_attendance_responses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	delete from public.attendance_responses ar
	using public.events e
	where ar.event_id = e.id
	and e.start_at < now() - interval '90 days'
	and e.status in ('completed', 'cancelled');
end;
$$;

comment on function public.purge_old_attendance_responses is
	'Borra confirmaciones de asistencia de eventos completados/cancelados hace más de 90 días. Solo pensada para ejecución programada (pg_cron) o manual de administración, nunca desde el cliente.';

revoke execute on function public.purge_old_attendance_responses() from public;

create extension if not exists pg_cron;

select cron.schedule(
	'purge-old-attendance-responses',
	'0 3 * * *',
	$$select public.purge_old_attendance_responses();$$
)
where not exists (
	select 1 from cron.job where jobname = 'purge-old-attendance-responses'
);
