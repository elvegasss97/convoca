-- 0011_performance_hardening.sql
--
-- Corrige los hallazgos WARN/INFO de los asesores de RENDIMIENTO tras
-- 0001-0010. Ningún cambio de comportamiento, solo:
--   1. auth_rls_initplan: envolver auth.uid()/is_moderator_or_admin() en
--      "(select ...)" dentro de las políticas para que Postgres las evalúe
--      una vez por sentencia, no una vez por fila.
--   2. multiple_permissive_policies: en events, unir las dos políticas de
--      SELECT que aplicaban a "authenticated" (events_select_public +
--      events_select_own_or_staff) en una sola por rol, sin cambiar qué
--      filas ve cada quien.
--   3. unindexed_foreign_keys: añadir el índice que faltaba en varias
--      claves foráneas.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter policy "profiles_select_own_or_staff" on public.profiles
	using (id = (select auth.uid()) or (select public.is_moderator_or_admin()));

alter policy "profiles_update_own" on public.profiles
	using (id = (select auth.uid()))
	with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- organizers
-- ---------------------------------------------------------------------------
alter policy "organizers_update_own" on public.organizers
	using (created_by = (select auth.uid()))
	with check (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- organizer_private_profiles
-- ---------------------------------------------------------------------------
alter policy "organizer_private_profiles_select_own_or_staff" on public.organizer_private_profiles
	using (user_id = (select auth.uid()) or (select public.is_moderator_or_admin()));

alter policy "organizer_private_profiles_update_own" on public.organizer_private_profiles
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- events — fusiona las dos políticas de SELECT que se solapaban para
-- "authenticated" en una sola por rol.
-- ---------------------------------------------------------------------------
drop policy "events_select_public" on public.events;
drop policy "events_select_own_or_staff" on public.events;

create policy "events_select_anon"
	on public.events for select
	to anon
	using (status not in ('draft', 'pending_review', 'hidden', 'rejected'));

create policy "events_select_authenticated"
	on public.events for select
	to authenticated
	using (
		status not in ('draft', 'pending_review', 'hidden', 'rejected')
		or created_by_user_id = (select auth.uid())
		or (select public.is_moderator_or_admin())
	);

alter policy "events_insert_own" on public.events
	with check (
		created_by_user_id = (select auth.uid())
		and exists (
			select 1 from public.organizers o
			where o.id = organizer_id and o.created_by = (select auth.uid())
		)
	);

alter policy "events_update_own_or_staff" on public.events
	using (
		created_by_user_id = (select auth.uid())
		or (select public.is_moderator_or_admin())
	)
	with check (
		created_by_user_id = (select auth.uid())
		or (select public.is_moderator_or_admin())
	);

-- ---------------------------------------------------------------------------
-- event_updates
-- ---------------------------------------------------------------------------
alter policy "event_updates_select_visible" on public.event_updates
	using (
		exists (
			select 1 from public.events e
			where e.id = event_id
			and (
				e.status not in ('draft', 'pending_review', 'hidden', 'rejected')
				or e.created_by_user_id = (select auth.uid())
				or (select public.is_moderator_or_admin())
			)
		)
	);

alter policy "event_updates_insert_own" on public.event_updates
	with check (
		exists (
			select 1 from public.events e
			join public.organizers o on o.id = e.organizer_id
			where e.id = event_id
			and e.created_by_user_id = (select auth.uid())
			and o.id = author_organizer_id
			and o.created_by = (select auth.uid())
		)
	);

-- ---------------------------------------------------------------------------
-- reports / audit_logs
-- ---------------------------------------------------------------------------
alter policy "reports_insert_authenticated" on public.reports
	with check (reported_by_user_id = (select auth.uid()) or reported_by_user_id is null);

alter policy "audit_logs_insert_staff" on public.audit_logs
	with check ((select public.is_moderator_or_admin()) and moderator_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- verification_documents
-- ---------------------------------------------------------------------------
alter policy "verification_documents_select_own_or_staff" on public.verification_documents
	using (uploaded_by_user_id = (select auth.uid()) or (select public.is_moderator_or_admin()));

alter policy "verification_documents_insert_own" on public.verification_documents
	with check (
		uploaded_by_user_id = (select auth.uid())
		and exists (
			select 1 from public.organizers o
			where o.id = organizer_id and o.created_by = (select auth.uid())
		)
		and storage_path like ((select auth.uid())::text || '/%')
	);

-- ---------------------------------------------------------------------------
-- Índices en claves foráneas sin cobertura
-- ---------------------------------------------------------------------------
create index audit_logs_moderator_id_idx on public.audit_logs (moderator_id);
create index event_updates_author_organizer_id_idx on public.event_updates (author_organizer_id);
create index organizers_created_by_idx on public.organizers (created_by);
create index reports_reported_by_user_id_idx on public.reports (reported_by_user_id);
create index verification_documents_event_id_idx on public.verification_documents (event_id);
create index verification_documents_uploaded_by_user_id_idx on public.verification_documents (uploaded_by_user_id);
