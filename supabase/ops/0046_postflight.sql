-- 0046_postflight.sql
--
-- Postflight OBLIGATORIO para staging/producción, justo después de aplicar
-- supabase/migrations/0046_metadatos_historial_sanidad_ceuta.sql.
--
-- Confirma exactamente lo pedido:
--   · una única entrada 0.1 en el historial de Sanidad, con la nota y la
--     fecha exactas;
--   · published_at de Ceuta = 14 de agosto de 2026;
--   · updated_at de Ceuta sin cambios (no reseteado a "ahora" por el
--     trigger topics_set_updated_at durante este despliegue);
--   · ninguna fila adicional o duplicada en topic_versions para ninguno
--     de los dos temas.
--
-- No es una migración: no modifica nada, solo verifica y falla
-- (RAISE EXCEPTION, psql termina con código de salida distinto de cero)
-- si algo no coincide con lo esperado.
--
-- Uso:
--   psql "$STAGING_OR_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/0046_postflight.sql

do $$
declare
	v_sanidad_versions_count int;
	v_sanidad_version_label text;
	v_sanidad_note text;
	v_sanidad_published_at timestamptz;
	v_ceuta_published_at timestamptz;
	v_ceuta_updated_at timestamptz;
	v_ceuta_versions_count int;
begin
	-- ---------------------------------------------------------------
	-- 1. Historial de Sanidad: exactamente 1 fila 0.1, nota y fecha exactas.
	-- ---------------------------------------------------------------
	select count(*) into v_sanidad_versions_count
	from public.topic_versions tv join public.topics t on t.id = tv.topic_id
	where t.slug = 'plan-sanidad-2036';

	if v_sanidad_versions_count <> 1 then
		raise exception 'POSTFLIGHT FALLIDO: se esperaba exactamente 1 fila en topic_versions para plan-sanidad-2036, hay %', v_sanidad_versions_count;
	end if;

	select tv.version_label, tv.note, tv.published_at
	into v_sanidad_version_label, v_sanidad_note, v_sanidad_published_at
	from public.topic_versions tv join public.topics t on t.id = tv.topic_id
	where t.slug = 'plan-sanidad-2036';

	if v_sanidad_version_label <> '0.1' then
		raise exception 'POSTFLIGHT FALLIDO: version_label de Sanidad es "%", se esperaba "0.1"', v_sanidad_version_label;
	end if;

	if v_sanidad_note <> 'Versión inicial consolidada del Plan Sanidad 2036: diagnóstico, ocho medidas, modelo económico reproducible, calendario de implantación, riesgos, indicadores, fuentes y participación por medidas.' then
		raise exception 'POSTFLIGHT FALLIDO: la nota de la versión de Sanidad no coincide con la confirmada';
	end if;

	if v_sanidad_published_at <> timestamptz '2026-08-06T00:00:00Z' then
		raise exception 'POSTFLIGHT FALLIDO: published_at de la versión de Sanidad es %, se esperaba 2026-08-06T00:00:00Z', v_sanidad_published_at;
	end if;

	-- ---------------------------------------------------------------
	-- 2. Ceuta: published_at correcto, updated_at intacto, sin duplicados.
	-- ---------------------------------------------------------------
	select published_at, updated_at into v_ceuta_published_at, v_ceuta_updated_at
	from public.topics where slug = 'plan-ceuta-2026';

	if v_ceuta_published_at <> timestamptz '2026-08-14T00:00:00Z' then
		raise exception 'POSTFLIGHT FALLIDO: published_at de Ceuta es %, se esperaba 2026-08-14T00:00:00Z', v_ceuta_published_at;
	end if;

	-- Heurística de integridad: si el trigger topics_set_updated_at se
	-- hubiera disparado durante este despliegue (p. ej. porque no se
	-- desactivó correctamente), updated_at quedaría a segundos de "ahora".
	-- Un despliegue real nunca ocurre en el mismo segundo que la fecha
	-- histórica que se está fijando, así que esto detecta ese fallo sin
	-- necesitar guardar el valor previo en ningún sitio.
	if now() - v_ceuta_updated_at < interval '10 minutes' then
		raise exception 'POSTFLIGHT FALLIDO: updated_at de Ceuta es % (hace menos de 10 minutos) — parece que el trigger topics_set_updated_at se disparó durante este despliegue en vez de conservarse. Compara manualmente contra el valor anotado por el preflight.', v_ceuta_updated_at;
	end if;

	select count(*) into v_ceuta_versions_count
	from public.topic_versions tv join public.topics t on t.id = tv.topic_id
	where t.slug = 'plan-ceuta-2026';

	if v_ceuta_versions_count <> 1 then
		raise exception 'POSTFLIGHT FALLIDO: se esperaba exactamente 1 fila en topic_versions para plan-ceuta-2026 (la de 0045, sin duplicar), hay %', v_ceuta_versions_count;
	end if;

	raise notice 'POSTFLIGHT OK — Sanidad: 1 entrada 0.1 con la nota y fecha exactas.';
	raise notice 'POSTFLIGHT OK — Ceuta: published_at=%, updated_at=% (comparar manualmente contra lo anotado por el preflight — debe ser idéntico), 1 fila en topic_versions.',
		v_ceuta_published_at, v_ceuta_updated_at;
end $$;
