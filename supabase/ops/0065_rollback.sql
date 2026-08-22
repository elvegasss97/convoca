-- 0065_rollback.sql
--
-- Rollback exacto y limitado de
-- supabase/migrations/0065_public_spending_citizen_explainers.sql.
--
-- Elimina únicamente las explicaciones ciudadanas, restaura las fechas de
-- publicación y los metadatos de fuente anteriores, y devuelve updated_at al
-- valor original de creación confirmado antes de aplicar 0065.
--
-- Uso:
--   psql "$STAGING_OR_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/0065_rollback.sql

begin;

drop table public.public_spending_explainer_figures;

update public.public_spending_sources
set
	title = case source_id
		when 'boe-rd-642-2026' then 'Real Decreto 642/2026, de 4 de agosto'
		when 'boe-rd-608-2026' then 'Real Decreto 608/2026, de 29 de julio'
		when 'boe-rd-638-2026' then 'Real Decreto 638/2026, de 4 de agosto'
		else title
	end,
	source_date_label = case source_id
		when 'idae-renoinn-noticia' then '7 de agosto de 2026'
		when 'boe-rd-642-2026' then '8 de agosto de 2026'
		when 'boe-rd-608-2026' then '8 de agosto de 2026'
		when 'boe-rd-638-2026' then '8 de agosto de 2026'
		else source_date_label
	end
where source_id in (
	'idae-renoinn-noticia',
	'boe-rd-642-2026',
	'boe-rd-608-2026',
	'boe-rd-638-2026'
);

alter table public.public_spending_investigations
	disable trigger public_spending_investigations_set_updated_at;

update public.public_spending_investigations
set
	published_on = case slug
		when 'renoinn-2-renovables-innovadoras-2026' then '2026-08-07'::date
		when 'subvenciones-sociales-directas-2026' then '2026-08-08'::date
		when 'empleo-reconstruccion-andalucia-extremadura-2026' then '2026-08-08'::date
		when 'renovacion-equipamiento-hosteleria-2026' then '2026-08-08'::date
		else published_on
	end,
	updated_at = created_at;

alter table public.public_spending_investigations
	enable trigger public_spending_investigations_set_updated_at;

alter table public.public_spending_investigations
	drop column citizen_intro,
	drop column funding_origin,
	drop column funding_destination,
	drop column citizen_takeaway;

commit;
