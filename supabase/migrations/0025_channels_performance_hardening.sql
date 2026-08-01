-- 0025_channels_performance_hardening.sql
--
-- Hallazgos del escáner de rendimiento (`get_advisors`) sobre lo añadido en
-- la fase de canales de coordinación (0021), mismo criterio que ya se
-- aplicó en 0011/0016 para events/reports:
--
--   1. auth_rls_initplan: varias políticas de event_communication_channels y
--      channel_reports llamaban a auth.uid()/is_moderator_or_admin() sin
--      envolver en `(select ...)`, forzando una re-evaluación por fila en
--      vez de una vez por consulta.
--   2. multiple_permissive_policies: event_communication_channels tenía dos
--      políticas SELECT permisivas aplicables a `authenticated`
--      (channels_select_owner_or_staff + channels_select_public), cada una
--      evaluada por separado en cada consulta.
--   3. unindexed_foreign_keys: audit_logs.channel_id y
--      channel_reports.reported_by_user_id no tenían índice.
--
-- No cambia qué fila ve o puede tocar cada quien, solo cómo se evalúa.

-- ---------------------------------------------------------------------------
-- event_communication_channels — fusiona las dos políticas SELECT en una
-- por rol (mismo patrón que events_select_anon/events_select_authenticated
-- en 0011), y envuelve auth.<fn>() en (select ...) de paso.
-- ---------------------------------------------------------------------------

drop policy "channels_select_owner_or_staff" on public.event_communication_channels;
drop policy "channels_select_public" on public.event_communication_channels;

create policy "channels_select_anon"
	on public.event_communication_channels for select
	to anon
	using (
		not is_hidden
		and exists (
			select 1 from public.events e
			where e.id = event_id
			and e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
		)
	);

create policy "channels_select_authenticated"
	on public.event_communication_channels for select
	to authenticated
	using (
		(select public.is_moderator_or_admin())
		or exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = (select auth.uid())
		)
		or (
			not is_hidden
			and exists (
				select 1 from public.events e
				where e.id = event_id
				and e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
			)
		)
	);

alter policy "channels_insert_owner" on public.event_communication_channels
	with check (
		exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = (select auth.uid())
		)
	);

alter policy "channels_update_owner_or_staff" on public.event_communication_channels
	using (
		(select public.is_moderator_or_admin())
		or exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = (select auth.uid())
		)
	)
	with check (
		(select public.is_moderator_or_admin())
		or exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = (select auth.uid())
		)
	);

alter policy "channels_delete_owner" on public.event_communication_channels
	using (
		exists (
			select 1 from public.events e
			where e.id = event_id and e.created_by_user_id = (select auth.uid())
		)
	);

-- ---------------------------------------------------------------------------
-- channel_reports
-- ---------------------------------------------------------------------------

alter policy "channel_reports_insert_authenticated" on public.channel_reports
	with check (reported_by_user_id = (select auth.uid()) or reported_by_user_id is null);

-- ---------------------------------------------------------------------------
-- Índices que faltaban en las claves foráneas añadidas en 0021
-- ---------------------------------------------------------------------------

create index audit_logs_channel_id_idx on public.audit_logs (channel_id);
create index channel_reports_reported_by_user_id_idx on public.channel_reports (reported_by_user_id);
