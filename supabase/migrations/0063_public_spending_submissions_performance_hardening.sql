-- 0063_public_spending_submissions_performance_hardening.sql
--
-- Ajustes recomendados por el linter de Supabase tras validar el buzón en
-- staging: cubrir la clave foránea de revisión y resolver auth.uid() una vez
-- por consulta dentro de la política de inserción.

create index public_spending_submissions_reviewed_by_idx
	on public.public_spending_submissions (reviewed_by)
	where reviewed_by is not null;

drop policy "public_spending_submissions_insert_own"
	on public.public_spending_submissions;

create policy "public_spending_submissions_insert_own"
	on public.public_spending_submissions for insert
	to authenticated
	with check (submitter_user_id = (select auth.uid()));
