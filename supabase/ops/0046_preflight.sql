-- 0046_preflight.sql
--
-- Preflight OBLIGATORIO para staging/producción antes de aplicar
-- supabase/migrations/0046_metadatos_historial_sanidad_ceuta.sql.
--
-- A diferencia de la guarda "0/1/más de 1" de la propia migración (que
-- permite 0 filas como no-op para ser compatible con bases limpias sin
-- datos, p. ej. el check-cleanroom de CI), este script es estricto:
-- EXIGE exactamente una fila por cada slug y FALLA (RAISE EXCEPTION, psql
-- termina con código de salida distinto de cero) si falta cualquiera de
-- los dos temas. Este es el gate real que protege staging/producción.
--
-- No es una migración: no crea, modifica ni borra nada. Solo lectura.
--
-- Uso:
--   psql "$STAGING_OR_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/0046_preflight.sql
--
-- Si este script falla: NO aplicar 0046. Investigar por qué falta el
-- tema antes de continuar.

do $$
declare
	v_sanidad_count int;
	v_ceuta_count int;
	v_sanidad_published_at timestamptz;
	v_sanidad_updated_at timestamptz;
	v_ceuta_published_at timestamptz;
	v_ceuta_updated_at timestamptz;
	v_sanidad_versions_count int;
	v_ceuta_versions_count int;
begin
	select count(*) into v_sanidad_count from public.topics where slug = 'plan-sanidad-2036';
	if v_sanidad_count <> 1 then
		raise exception 'PREFLIGHT FALLIDO: se esperaba exactamente 1 tema con slug plan-sanidad-2036, se encontraron %. No aplicar 0046.', v_sanidad_count;
	end if;

	select count(*) into v_ceuta_count from public.topics where slug = 'plan-ceuta-2026';
	if v_ceuta_count <> 1 then
		raise exception 'PREFLIGHT FALLIDO: se esperaba exactamente 1 tema con slug plan-ceuta-2026, se encontraron %. No aplicar 0046.', v_ceuta_count;
	end if;

	select published_at, updated_at into v_sanidad_published_at, v_sanidad_updated_at
	from public.topics where slug = 'plan-sanidad-2036';

	select published_at, updated_at into v_ceuta_published_at, v_ceuta_updated_at
	from public.topics where slug = 'plan-ceuta-2026';

	select count(*) into v_sanidad_versions_count
	from public.topic_versions tv join public.topics t on t.id = tv.topic_id
	where t.slug = 'plan-sanidad-2036';

	select count(*) into v_ceuta_versions_count
	from public.topic_versions tv join public.topics t on t.id = tv.topic_id
	where t.slug = 'plan-ceuta-2026';

	raise notice 'PREFLIGHT OK — plan-sanidad-2036: published_at=%, updated_at=%, filas en topic_versions=%',
		v_sanidad_published_at, v_sanidad_updated_at, v_sanidad_versions_count;
	raise notice 'PREFLIGHT OK — plan-ceuta-2026: published_at=%, updated_at=%, filas en topic_versions=%',
		v_ceuta_published_at, v_ceuta_updated_at, v_ceuta_versions_count;
	raise notice 'Anota el updated_at de Ceuta de arriba (%) para comparar contra el postflight tras aplicar 0046 — debe ser idéntico.',
		v_ceuta_updated_at;
end $$;
