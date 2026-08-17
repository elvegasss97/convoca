-- 0046_metadatos_historial_sanidad_ceuta.sql
--
-- Fase pequeña de coherencia institucional y metadatos públicos, con datos
-- confirmados explícitamente por Elías Vega (no inventados):
--
--   1. Plan Sanidad 2036 (slug 'plan-sanidad-2036') no tiene ninguna fila en
--      `topic_versions` todavía, pese a que `topics.version = '0.1'` (son
--      columnas independientes: `topics.version` es el rótulo actual,
--      `topic_versions` es el historial real de publicaciones — confirmado
--      antes de escribir esta migración). Se añade la primera entrada de
--      versión 0.1 con la nota exacta confirmada, fechada el 6 de agosto de
--      2026 (misma fecha que ya muestra `topics.updated_at` de Sanidad en
--      producción — consolidación real, no una fecha nueva).
--
--   2. Plan Ceuta (slug 'plan-ceuta-2026') tiene `published_at = null` desde
--      que se creó por migración (0045) en vez de por el flujo normal del
--      panel, que sí lo rellena automáticamente. Se fija al 14 de agosto de
--      2026 — la misma fecha que ya tienen `created_at`, `updated_at` de
--      `topics` y la nota de `topic_versions` para este tema (0045:
--      "Corte de información: 14 de agosto de 2026"). Es la fecha real de
--      publicación, no un valor nuevo.
--
-- Convención de hora: T00:00:00Z (medianoche UTC), igual que la fila de
-- `topic_versions` de Ceuta ya insertada por 0045. Medianoche UTC cae
-- siempre dentro del mismo día civil en Europe/Madrid (UTC+1/+2, nunca por
-- detrás de UTC), así que el formateador de fecha del frontend
-- (`formatEventDateWithYear`, sin `timeZone` explícito — usa la zona local
-- del entorno de ejecución) muestra "6 de agosto de 2026" / "14 de agosto
-- de 2026" sin ambigüedad tanto si esa zona es UTC como si es
-- Europe/Madrid. No se inventa ninguna hora con consecuencias visibles.
--
-- `public.topics` tiene un trigger `topics_set_updated_at` (0001) que
-- sobrescribe `updated_at = now()` en CUALQUIER UPDATE, sin importar qué
-- columnas cambien. Para no tocar `updated_at` de Ceuta, esta migración
-- captura su valor real actual, desactiva el trigger solo alrededor del
-- UPDATE de esa fila y lo reactiva inmediatamente — todo dentro de la
-- misma transacción implícita del bloque `do $$ ... end $$`, así que un
-- fallo a mitad de camino revierte también la desactivación (DDL
-- transaccional de Postgres).
--
-- No modifica: contenido de los planes, presupuestos, fuentes, versión,
-- estado, participación, ni ningún otro tema. No crea ninguna política ni
-- tabla nueva.
--
-- Idempotente: cada bloque comprueba el estado real antes de escribir; una
-- segunda ejecución no duplica el historial de Sanidad ni vuelve a tocar
-- Ceuta si `published_at` ya es el valor correcto.
--
-- -----------------------------------------------------------------------
-- Guarda por tema — 0 / 1 / más de 1, cada slug de forma independiente:
--
--   · 0 encontrados  -> RAISE NOTICE y no-op para ESE bloque (no falla la
--     migración entera). Esto existe única y exclusivamente para que esta
--     migración sea aplicable sobre una base de datos limpia sin datos de
--     producción — el caso real en `check-cleanroom` (CI): reconstruye
--     las 46 migraciones sobre una base vacía, y 'plan-sanidad-2036' (a
--     diferencia de Ceuta, que sí se crea en 0045) nunca se insertó por
--     migración, solo existe en producción/staging por haberse creado
--     desde el panel. Un 0 ahí no es un error, es "esta migración no
--     tiene nada que hacer en este entorno".
--   · exactamente 1 -> aplica el cambio de ese bloque.
--   · más de 1      -> RAISE EXCEPTION. Esto sí es siempre un error real
--     (slug debería ser único por `unique` en `topics.slug`, pero se
--     comprueba explícitamente para no continuar nunca contra un tema
--     ambiguo o incorrecto).
--
-- Este no-op de 0 filas es DELIBERADAMENTE permisivo para bases de datos
-- limpias, así que NO protege staging/producción por sí solo: si por lo
-- que sea faltara Sanidad o Ceuta en un entorno real, esta migración
-- simplemente no haría nada ahí, en silencio. La protección real para
-- staging/producción está en el preflight estricto y obligatorio de
-- `supabase/ops/0046_preflight.sql`, que SÍ debe fallar (exit distinto de
-- cero) si no encuentra exactamente una fila de cada slug, y que forma
-- parte obligatoria del procedimiento de despliegue de esta migración
-- (ver el paso a paso al final de este archivo).
-- -----------------------------------------------------------------------
--
-- No se aplica en producción desde aquí — queda preparada para revisión en
-- el PR. Procedimiento de despliegue exacto:
--
--   1. `psql "$STAGING_OR_PROD_URL" -f supabase/ops/0046_preflight.sql`
--      Si falla (exactamente 1 fila por slug no se cumple): DETENERSE.
--      No aplicar la migración.
--   2. `supabase db push --linked` (aplica 0046 junto con cualquier otra
--      migración pendiente, igual que siempre).
--   3. `psql "$STAGING_OR_PROD_URL" -f supabase/ops/0046_postflight.sql`
--      Debe terminar sin ningún RAISE EXCEPTION.
--
-- Rollback exacto y limitado: `supabase/ops/0046_rollback.sql` (elimina
-- solo la fila de historial creada por esta migración y restaura
-- `published_at` de Ceuta a null — no toca ningún otro tema ni fila).
-- -----------------------------------------------------------------------

do $$
declare
	v_sanidad_id uuid;
	v_sanidad_count int;
	v_ceuta_id uuid;
	v_ceuta_count int;
	v_ceuta_updated_at timestamptz;
begin
	-- -------------------------------------------------------------------
	-- 1. Historial de Sanidad — primera entrada real de versión 0.1.
	-- -------------------------------------------------------------------
	select count(*) into v_sanidad_count from public.topics where slug = 'plan-sanidad-2036';

	if v_sanidad_count = 0 then
		raise notice 'plan-sanidad-2036: 0 temas encontrados, no-op (esperado en una base sin datos de producción).';
	elsif v_sanidad_count > 1 then
		raise exception 'Se esperaba como máximo 1 tema con slug plan-sanidad-2036, se encontraron %', v_sanidad_count;
	else
		select id into v_sanidad_id from public.topics where slug = 'plan-sanidad-2036';

		if not exists (
			select 1 from public.topic_versions
			where topic_id = v_sanidad_id and version_label = '0.1'
		) then
			insert into public.topic_versions (topic_id, version_label, note, published_at)
			values (
				v_sanidad_id,
				'0.1',
				'Versión inicial consolidada del Plan Sanidad 2036: diagnóstico, ocho medidas, modelo económico reproducible, calendario de implantación, riesgos, indicadores, fuentes y participación por medidas.',
				timestamptz '2026-08-06T00:00:00Z'
			);
		end if;
	end if;

	-- -------------------------------------------------------------------
	-- 2. Publicación de Ceuta — fija published_at sin tocar updated_at.
	-- -------------------------------------------------------------------
	select count(*) into v_ceuta_count from public.topics where slug = 'plan-ceuta-2026';

	if v_ceuta_count = 0 then
		raise notice 'plan-ceuta-2026: 0 temas encontrados, no-op (esperado en una base sin datos de producción).';
	elsif v_ceuta_count > 1 then
		raise exception 'Se esperaba como máximo 1 tema con slug plan-ceuta-2026, se encontraron %', v_ceuta_count;
	else
		select id into v_ceuta_id from public.topics where slug = 'plan-ceuta-2026';
		select updated_at into v_ceuta_updated_at from public.topics where id = v_ceuta_id;

		if (select published_at from public.topics where id = v_ceuta_id)
			is distinct from timestamptz '2026-08-14T00:00:00Z'
		then
			alter table public.topics disable trigger topics_set_updated_at;

			update public.topics
			set published_at = timestamptz '2026-08-14T00:00:00Z',
				updated_at = v_ceuta_updated_at
			where id = v_ceuta_id;

			alter table public.topics enable trigger topics_set_updated_at;
		end if;
	end if;
end $$;
