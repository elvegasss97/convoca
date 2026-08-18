-- 0052_staff_mfa_required.sql
--
-- Cierre de la Fase 1 del Centro de Operaciones: acceso propio de staff
-- (/acceso-interno, correo+contraseña, exclusivo de moderator/admin) con
-- verificación en dos pasos (TOTP) obligatoria antes de poder ejercer
-- CUALQUIER privilegio de staff — no solo antes de cargar /moderacion.
--
-- Mecanismo: Supabase Auth ya emite, en el JWT de cada sesión, el claim
-- `aal` ('aal1' tras un inicio de sesión normal; 'aal2' solo después de
-- completar un challenge de un factor MFA verificado —
-- `supabase.auth.mfa.challengeAndVerify()`). `auth.jwt()` (función nativa
-- de Supabase, ya usada indirectamente por `auth.uid()`) expone ese JWT
-- completo como jsonb.
--
-- En vez de tocar las políticas RLS de las 45+ tablas que ya dependen de
-- `public.is_moderator_or_admin()` (documentado en varias migraciones
-- como "la única puerta de autorización de staff de toda la base de
-- datos"), esta migración añade la exigencia de aal2 DENTRO de esa misma
-- función. Efecto: automáticamente, sin tocar ninguna otra migración,
-- CUALQUIER lectura o escritura que hoy dependa de is_moderator_or_admin()
-- (moderación de convocatorias, Voz abierta, documentación, audit_trail,
-- Pulso ciudadano...) exige aal2 — la comprobación de la interfaz
-- (/acceso-interno, /moderacion) es solo UX, esta es la barrera real.
--
-- Efecto colateral INTENCIONADO: una cuenta moderator/admin que todavía
-- no tenga un factor TOTP verificado pierde el bypass de staff en TODA
-- la aplicación, no solo en /moderacion, hasta completar la
-- configuración. Es la garantía que pide la Fase 1 ("aplicándolo en
-- servidor/RLS y no únicamente en la interfaz"): no hay ninguna llamada
-- directa a la API que pueda saltarse este requisito.
--
-- Sin efecto sobre cuentas `organizer` ni sobre el acceso público con
-- Google: is_moderator_or_admin() ya evaluaba `false` para ellas por el
-- primer término (rol), el nuevo término aal2 nunca llega a decidir nada
-- en ese caso. Tampoco afecta al camino de ascenso manual documentado en
-- 0001 (SQL Editor/MCP con `postgres`): esas sesiones no pasan por RLS en
-- absoluto (bypass de superusuario), is_moderator_or_admin() ni siquiera
-- interviene ahí.
--
-- Nota para quien revise el PR: is_moderator_or_admin() ya era SECURITY
-- DEFINER antes de esta migración (0001) — el commit que incluya esta
-- migración debe llevar "Security-Baseline-Override: security-definer:is_moderator_or_admin".

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		(select role in ('moderator', 'admin') from public.profiles where id = auth.uid())
		and coalesce(auth.jwt() ->> 'aal', '') = 'aal2',
		false
	);
$$;

comment on function public.is_moderator_or_admin is
	'Única puerta de autorización de staff de toda la base de datos. Desde 0052, además del rol (moderator/admin), exige que la sesión haya alcanzado nivel aal2 (segundo factor TOTP verificado, ver /acceso-interno) — no solo el rol. Sin JWT de por medio (SQL Editor/MCP con postgres) esta función no interviene: esas sesiones bypasean RLS por completo.';
