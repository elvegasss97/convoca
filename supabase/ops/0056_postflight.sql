-- 0056_postflight.sql
--
-- Solo lectura. Ejecutar justo después de aplicar 0056 y desplegar la Edge
-- Function. Verifica invariantes de esquema/permisos; las pruebas de flujo
-- con cuentas reales siguen siendo obligatorias (docs/MUNICIPAL_HARDENING_0056.md).

DO $$
DECLARE
	v_created_by_nullable text;
	v_support_consent_nullable text;
	v_support_consented_at_nullable text;
	v_supports_without_consent bigint;
	v_fk_delete char;
	v_rls_map boolean;
	v_rls_reports boolean;
	v_issue_location_trigger boolean;
BEGIN
	SELECT is_nullable INTO v_created_by_nullable
	FROM information_schema.columns
	WHERE table_schema = 'public' AND table_name = 'municipal_petitions' AND column_name = 'created_by';
	IF v_created_by_nullable <> 'YES' THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: municipal_petitions.created_by sigue siendo NOT NULL.';
	END IF;

	SELECT c.confdeltype INTO v_fk_delete
	FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE n.nspname = 'public' AND t.relname = 'municipal_petitions'
	  AND c.conname = 'municipal_petitions_created_by_fkey';
	IF v_fk_delete IS DISTINCT FROM 'n' THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: FK created_by no usa ON DELETE SET NULL (confdeltype=%).', v_fk_delete;
	END IF;

	SELECT is_nullable INTO v_support_consent_nullable
	FROM information_schema.columns
	WHERE table_schema = 'public' AND table_name = 'municipal_petition_supports' AND column_name = 'consent_version';
	SELECT is_nullable INTO v_support_consented_at_nullable
	FROM information_schema.columns
	WHERE table_schema = 'public' AND table_name = 'municipal_petition_supports' AND column_name = 'consented_at';
	IF v_support_consent_nullable <> 'NO' OR v_support_consented_at_nullable <> 'NO' THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: columnas de consentimiento no son NOT NULL.';
	END IF;

	SELECT count(*) INTO v_supports_without_consent
	FROM public.municipal_petition_supports
	WHERE consent_version IS NULL OR consented_at IS NULL;
	IF v_supports_without_consent <> 0 THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: hay % apoyos activos sin evidencia de consentimiento.', v_supports_without_consent;
	END IF;

	IF to_regprocedure('public.create_municipal_petition(text,text,text,text,double precision,double precision,uuid)') IS NOT NULL THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: la RPC pública antigua con lat/lng sigue existiendo.';
	END IF;
	IF to_regprocedure('public.create_municipal_petition_server(uuid,text,text,text,text,uuid)') IS NULL THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: falta create_municipal_petition_server.';
	END IF;
	IF to_regprocedure('public.guard_municipal_map_resolution_server(uuid)') IS NULL THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: falta guard_municipal_map_resolution_server.';
	END IF;
	IF to_regprocedure('public.report_municipal_petition(uuid,text,text)') IS NULL
		OR to_regprocedure('public.review_municipal_petition_report(uuid,text)') IS NULL THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: faltan RPCs de reportes/moderación.';
	END IF;

	IF has_function_privilege('anon', 'public.create_municipal_petition_server(uuid,text,text,text,text,uuid)', 'EXECUTE')
		OR has_function_privilege('authenticated', 'public.create_municipal_petition_server(uuid,text,text,text,text,uuid)', 'EXECUTE') THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: la RPC interna de creación es ejecutable por cliente.';
	END IF;
	IF NOT has_function_privilege('service_role', 'public.create_municipal_petition_server(uuid,text,text,text,text,uuid)', 'EXECUTE') THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: service_role no puede ejecutar la RPC interna.';
	END IF;
	IF has_function_privilege('anon', 'public.guard_municipal_map_resolution_server(uuid)', 'EXECUTE')
		OR has_function_privilege('authenticated', 'public.guard_municipal_map_resolution_server(uuid)', 'EXECUTE') THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: el guard geográfico es ejecutable por cliente.';
	END IF;
	IF NOT has_function_privilege('service_role', 'public.guard_municipal_map_resolution_server(uuid)', 'EXECUTE') THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: service_role no puede ejecutar el guard geográfico.';
	END IF;
	IF has_function_privilege('anon', 'public.set_municipal_petition_support(uuid,boolean,boolean,text)', 'EXECUTE')
		OR has_function_privilege('anon', 'public.report_municipal_petition(uuid,text,text)', 'EXECUTE')
		OR has_function_privilege('anon', 'public.review_municipal_petition_report(uuid,text)', 'EXECUTE') THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: anon conserva EXECUTE en alguna RPC de escritura.';
	END IF;

	SELECT relrowsecurity INTO v_rls_map FROM pg_class WHERE oid = 'public.municipal_map_points'::regclass;
	SELECT relrowsecurity INTO v_rls_reports FROM pg_class WHERE oid = 'public.municipal_petition_reports'::regclass;
	IF v_rls_map IS NOT TRUE OR v_rls_reports IS NOT TRUE THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: RLS no está habilitada en las tablas nuevas.';
	END IF;

	SELECT exists (
		SELECT 1
		FROM pg_trigger tg
		JOIN pg_class t ON t.oid = tg.tgrelid
		JOIN pg_namespace n ON n.oid = t.relnamespace
		WHERE n.nspname = 'public'
		  AND t.relname = 'municipal_issues'
		  AND tg.tgname = 'municipal_issues_public_location_guard'
		  AND NOT tg.tgisinternal
	) INTO v_issue_location_trigger;
	IF v_issue_location_trigger IS NOT TRUE THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: falta el trigger de ubicación canónica para problemas públicos.';
	END IF;

	IF has_column_privilege('anon', 'public.municipal_map_points', 'municipality_ine_code', 'SELECT') THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: anon puede leer municipal_map_points.';
	END IF;
	IF has_column_privilege('authenticated', 'public.municipal_petition_reports', 'reporter_id', 'SELECT')
		OR has_column_privilege('authenticated', 'public.municipal_petition_reports', 'reviewed_by', 'SELECT') THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: columnas identificativas de reportes son legibles por authenticated.';
	END IF;
	IF NOT has_column_privilege('authenticated', 'public.municipal_petition_reports', 'id', 'SELECT') THEN
		RAISE EXCEPTION 'POSTFLIGHT 0056: moderación no tiene grant de lectura sobre columnas seguras de reportes.';
	END IF;

	RAISE NOTICE 'POSTFLIGHT 0056 OK — integridad territorial, consentimiento, RLS y permisos base verificados.';
END $$;
