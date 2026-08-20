-- 0057_municipal_performance_rls_cleanup.sql
--
-- Cierra únicamente hallazgos de rendimiento del módulo municipal observados
-- por los advisors de Supabase después de aplicar 0056 en staging.
-- No cambia el modelo de autorización ni la visibilidad pública.

-- Índices de FK: mejoran borrado/anonimización de cuentas y joins territoriales.
create index if not exists municipal_issues_created_by_idx
  on public.municipal_issues (created_by)
  where created_by is not null;

create index if not exists municipal_issues_municipality_ine_code_idx
  on public.municipal_issues (municipality_ine_code)
  where municipality_ine_code is not null;

create index if not exists municipal_petitions_issue_id_idx
  on public.municipal_petitions (issue_id)
  where issue_id is not null;

create index if not exists municipal_petitions_municipality_ine_code_idx
  on public.municipal_petitions (municipality_ine_code);

create index if not exists municipal_petition_reports_reporter_id_idx
  on public.municipal_petition_reports (reporter_id)
  where reporter_id is not null;

create index if not exists municipal_petition_reports_reviewed_by_idx
  on public.municipal_petition_reports (reviewed_by)
  where reviewed_by is not null;

-- Evita reevaluar auth.uid() para cada fila sin cambiar qué filas puede ver
-- cada persona autenticada.
drop policy if exists "municipal_petition_supports_select_own"
  on public.municipal_petition_supports;
create policy "municipal_petition_supports_select_own"
  on public.municipal_petition_supports for select
  to authenticated
  using (user_id = (select auth.uid()));

-- 0054 creó policies FOR ALL de staff además de SELECT público/staff. FOR ALL
-- también participa en SELECT y obliga a evaluar dos policies permisivas para
-- cada lectura. Se conserva exactamente la misma autorización separando las
-- escrituras por operación.

drop policy if exists "municipal_issues_write_staff" on public.municipal_issues;
create policy "municipal_issues_insert_staff"
  on public.municipal_issues for insert to authenticated
  with check (public.is_moderator_or_admin());
create policy "municipal_issues_update_staff"
  on public.municipal_issues for update to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());
create policy "municipal_issues_delete_staff"
  on public.municipal_issues for delete to authenticated
  using (public.is_moderator_or_admin());

drop policy if exists "municipal_issue_sources_write_staff" on public.municipal_issue_sources;
create policy "municipal_issue_sources_insert_staff"
  on public.municipal_issue_sources for insert to authenticated
  with check (public.is_moderator_or_admin());
create policy "municipal_issue_sources_update_staff"
  on public.municipal_issue_sources for update to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());
create policy "municipal_issue_sources_delete_staff"
  on public.municipal_issue_sources for delete to authenticated
  using (public.is_moderator_or_admin());

drop policy if exists "municipal_issue_suggestions_write_staff" on public.municipal_issue_suggestions;
create policy "municipal_issue_suggestions_insert_staff"
  on public.municipal_issue_suggestions for insert to authenticated
  with check (public.is_moderator_or_admin());
create policy "municipal_issue_suggestions_update_staff"
  on public.municipal_issue_suggestions for update to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());
create policy "municipal_issue_suggestions_delete_staff"
  on public.municipal_issue_suggestions for delete to authenticated
  using (public.is_moderator_or_admin());
