-- 0014_fix_attendance_rate_limit.sql
--
-- Corrige un fallo real de diseño encontrado en las pruebas en vivo de la
-- Fase 14: el límite de frecuencia de set_attendance() contaba filas en
-- attendance_responses, pero esa tabla tiene una restricción UNIQUE
-- (event_id, dedup_token) y cada llamada hace UPSERT sobre la MISMA fila —
-- así que un mismo dispositivo podía llamar a set_attendance() sobre el
-- mismo evento tantas veces por segundo como quisiera sin que el contador
-- subiera nunca de 1. Verificado en vivo: 12 llamadas seguidas, ninguna
-- bloqueada.
--
-- Corrección: una tabla de seguimiento aparte, de solo inserción (nunca se
-- actualiza), que registra cada intento de escritura por dedup_token. El
-- límite ahora cuenta intentos reales, no filas de negocio.

create table public.attendance_rate_limits (
	id bigint generated always as identity primary key,
	dedup_token uuid not null,
	called_at timestamptz not null default now()
);

comment on table public.attendance_rate_limits is
	'Registro de intentos de set_attendance() por dedup_token, solo para limitar frecuencia. Append-only a propósito (nunca UPSERT), para que el conteo refleje intentos reales, no filas de negocio. Sin política RLS: solo la accede la función SECURITY DEFINER set_attendance().';

alter table public.attendance_rate_limits enable row level security;

create index attendance_rate_limits_token_time_idx on public.attendance_rate_limits (dedup_token, called_at);

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
	recent_attempt_count integer;
begin
	if p_response is not null and p_response not in ('going', 'interested') then
		raise exception 'Respuesta de asistencia no válida.';
	end if;

	insert into public.attendance_rate_limits (dedup_token) values (p_dedup_token);

	select count(*) into recent_attempt_count
	from public.attendance_rate_limits
	where dedup_token = p_dedup_token
	and called_at > now() - interval '1 minute';

	if recent_attempt_count > 10 then
		raise exception 'Demasiadas solicitudes. Inténtalo de nuevo en un minuto.';
	end if;

	if not exists (
		select 1 from public.events e
		where e.id = p_event_id
		and e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
	) then
		raise exception 'Esta convocatoria no admite confirmaciones de asistencia.';
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

create or replace function public.purge_old_attendance_rate_limits()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	delete from public.attendance_rate_limits where called_at < now() - interval '1 day';
end;
$$;

comment on function public.purge_old_attendance_rate_limits is
	'Borra intentos de más de 1 día (solo hacen falta los del último minuto). Ejecución programada, ver cron.job.';

revoke execute on function public.purge_old_attendance_rate_limits() from public, anon, authenticated;

select cron.schedule(
	'purge-old-attendance-rate-limits',
	'15 3 * * *',
	$$select public.purge_old_attendance_rate_limits();$$
)
where not exists (
	select 1 from cron.job where jobname = 'purge-old-attendance-rate-limits'
);
