-- 0056_preflight.sql
--
-- Solo lectura. Ejecutar en staging/producción ANTES de aplicar
-- 0056_municipal_integrity_privacy_hardening.sql.
--
-- OJO: 0056 elimina los apoyos municipales creados antes del nuevo aviso de
-- consentimiento específico. Este preflight muestra cuántas filas se
-- perderán para que el operador lo confirme conscientemente antes del push.

DO $$
DECLARE
	v_petitions bigint;
	v_supports bigint;
	v_open_petitions bigint;
BEGIN
	IF to_regclass('public.municipal_petitions') IS NULL
		OR to_regclass('public.municipal_petition_supports') IS NULL
		OR to_regclass('public.municipal_issues') IS NULL THEN
		RAISE EXCEPTION 'PREFLIGHT 0056: falta alguna tabla de 0054. No aplicar 0056.';
	END IF;

	IF to_regprocedure('public.create_municipal_petition(text,text,text,text,double precision,double precision,uuid)') IS NULL THEN
		RAISE EXCEPTION 'PREFLIGHT 0056: no existe la RPC de creación esperada de 0054/0055. Revisar historial.';
	END IF;

	IF to_regprocedure('public.set_municipal_petition_support(uuid,boolean)') IS NULL THEN
		RAISE EXCEPTION 'PREFLIGHT 0056: no existe la RPC de apoyos esperada de 0054/0055. Revisar historial.';
	END IF;

	SELECT count(*) INTO v_petitions FROM public.municipal_petitions;
	SELECT count(*) INTO v_open_petitions FROM public.municipal_petitions WHERE status = 'open';
	SELECT count(*) INTO v_supports FROM public.municipal_petition_supports;

	RAISE NOTICE 'PREFLIGHT 0056 OK — peticiones municipales=% (abiertas=%), apoyos pre-0056=%',
		v_petitions, v_open_petitions, v_supports;
	RAISE NOTICE 'IMPORTANTE: los % apoyos pre-0056 serán eliminados porque la UI anterior no recogía consentimiento específico. No continuar si este reset no está aprobado.',
		v_supports;
END $$;
