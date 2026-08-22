-- 0069_allow_municipal_seat_map_source.sql
--
-- Ya estaba aplicada en producción, registrada allí bajo la versión
-- 20260821072614 (nombre "allow_municipal_seat_map_source"), pero nunca se
-- había versionado en el repositorio -- se recupera aquí tal cual (SQL
-- leído directamente de supabase_migrations.schema_migrations en
-- producción) para que el historial de git coincida con la base real.
-- Requiere reconciliar el tracking en producción (supabase migration
-- repair) para que quede registrada bajo 0069 en vez de bajo el timestamp
-- original -- no vuelve a ejecutar el DDL, que ya está aplicado.
--
-- Amplía el catálogo de proveedores válidos de municipal_map_points para
-- admitir 'municipal_seat' además de 'cartociudad_cnig'. Ningún código
-- actual de main escribe ese valor todavía (municipal_issues.location_precision
-- usa 'municipal_seat' como etiqueta propia, sin relación con esta columna),
-- así que ampliar la restricción es un no-op seguro sobre el uso presente.

alter table public.municipal_map_points
	drop constraint if exists municipal_map_points_source_provider_check;

alter table public.municipal_map_points
	add constraint municipal_map_points_source_provider_check
	check (source_provider in ('cartociudad_cnig', 'municipal_seat'));
