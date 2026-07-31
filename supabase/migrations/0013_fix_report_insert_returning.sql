-- 0013_fix_report_insert_returning.sql
--
-- Corrige un fallo real encontrado durante las pruebas en vivo de la Fase 14:
-- `createReport()` hace `insert(...).select().single()` (necesita
-- RETURNING para poder mostrar la confirmación en el diálogo de reporte).
-- Postgres exige que la fila insertada sea visible bajo alguna política de
-- SELECT para poder devolverla con RETURNING; como `reports` solo tenía
-- `reports_select_staff` (exclusiva de moderación), cualquier persona no
-- moderadora que reportara una convocatoria recibía un error de RLS
-- ("new row violates row-level security policy for table reports") aunque
-- su INSERT individualmente cumplía `reports_insert_authenticated`.
--
-- Corrección: se añade una política de SELECT adicional y estrecha que
-- solo deja ver a cada cuenta sus PROPIOS reportes (nunca los de otras
-- personas, y sigue sin exponerse a otros organizadores). Esto no
-- contradice "quién reportó no se expone a nadie más": solo permite que la
-- propia persona vea lo que ella misma envió.

create policy "reports_select_own"
	on public.reports for select
	to authenticated
	using (reported_by_user_id = (select auth.uid()));
