-- 0055_fix_municipal_petition_anon_execute_grant.sql
--
-- Corrige un hallazgo real, confirmado empíricamente contra staging tras
-- aplicar 0054: `revoke all on function ... from public` NO retira el
-- EXECUTE que este proyecto concede por defecto a `anon`/`authenticated`
-- en cada función nueva de `public` (privilegios por defecto del propio
-- proyecto Supabase, no de esta migración) — hace falta revocar de `anon`
-- explícitamente, aparte de `public`. Mismo patrón que ya se estableció
-- para este caso concreto en 0042_security_hardening_review3.sql
-- (set_concern_listening_priorities y funciones hermanas), que 0054 no
-- replicó para create_municipal_petition/set_municipal_petition_support.
--
-- Verificado en vivo contra staging antes de esta migración: una llamada
-- anónima (apikey/Authorization = anon key, sin sesión) a ambas RPC SÍ
-- llegaba a ejecutar el cuerpo de la función y solo se detenía en el
-- `raise exception` de `auth.uid() is null` — la comprobación interna
-- funcionaba y ninguna petición/apoyo llegó a crearse, pero el GRANT no
-- ofrecía la segunda capa de defensa prevista. Esta migración no cambia
-- ningún comportamiento observable para un cliente autenticado ni anónimo
-- que ya se comportaba como se esperaba (la función seguía rechazando a
-- anon igualmente) — solo cierra la capa de permisos que faltaba.
--
-- get_municipal_petition_counts y get_municipal_radar_summary no se tocan:
-- esas sí están pensadas para anon por diseño (agregados públicos) y ya
-- estaban concedidas explícitamente a anon en 0054.

revoke all on function public.create_municipal_petition(text, text, text, text, double precision, double precision, uuid) from anon;
revoke all on function public.set_municipal_petition_support(uuid, boolean) from anon;
