-- 0016_merge_reports_select_policies.sql
--
-- Igual que se hizo en 0011 para events: fusiona las dos políticas
-- permisivas de SELECT en reports (reports_select_own + reports_select_staff)
-- en una sola, mismo resultado por fila, sin la evaluación doble marcada
-- por el asesor de rendimiento (multiple_permissive_policies).

drop policy "reports_select_own" on public.reports;
drop policy "reports_select_staff" on public.reports;

create policy "reports_select_own_or_staff"
	on public.reports for select
	to authenticated
	using (
		reported_by_user_id = (select auth.uid())
		or (select public.is_moderator_or_admin())
	);
