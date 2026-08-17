-- 0046_rollback.sql
--
-- Rollback exacto y limitado de
-- supabase/migrations/0046_metadatos_historial_sanidad_ceuta.sql.
--
-- Elimina ÚNICAMENTE la fila de historial creada para Sanidad y restaura
-- `published_at` de Ceuta a null (su valor real anterior, confirmado por
-- lectura antes de escribir 0046). No toca `updated_at` de Ceuta, ninguna
-- otra fila de topic_versions, ni ningún otro tema.
--
-- Uso:
--   psql "$STAGING_OR_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/0046_rollback.sql

do $$
declare
	v_ceuta_id uuid;
	v_ceuta_updated_at timestamptz;
begin
	delete from public.topic_versions
	where topic_id = (select id from public.topics where slug = 'plan-sanidad-2036')
		and version_label = '0.1'
		and note = 'Versión inicial consolidada del Plan Sanidad 2036: diagnóstico, ocho medidas, modelo económico reproducible, calendario de implantación, riesgos, indicadores, fuentes y participación por medidas.'
		and published_at = timestamptz '2026-08-06T00:00:00Z';

	select id, updated_at into v_ceuta_id, v_ceuta_updated_at
	from public.topics where slug = 'plan-ceuta-2026';

	if v_ceuta_id is not null then
		alter table public.topics disable trigger topics_set_updated_at;

		update public.topics
		set published_at = null,
			updated_at = v_ceuta_updated_at
		where id = v_ceuta_id
			and published_at = timestamptz '2026-08-14T00:00:00Z';

		alter table public.topics enable trigger topics_set_updated_at;
	end if;

	raise notice 'Rollback de 0046 completado (o no había nada que revertir).';
end $$;
