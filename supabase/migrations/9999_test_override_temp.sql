-- Migración de PRUEBA TEMPORAL — demuestra en vivo, en GitHub Actions
-- real, que el mecanismo de override corregido (seguridad/35) funciona
-- desde un pull_request. Se elimina en un commit posterior de este mismo
-- PR, antes de dejarlo listo para revisión. No forma parte del esquema
-- real de la aplicación.
create or replace function public.test_definer_inseguro()
returns boolean
language sql
security definer
set search_path = public
as $$ select true; $$;
