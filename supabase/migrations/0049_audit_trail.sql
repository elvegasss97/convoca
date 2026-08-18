-- 0049_audit_trail.sql
--
-- Base segura del futuro "Centro de Operaciones de CONVOCA" (Fase 1, paso
-- b de 4). Crea una tabla de auditoría GENÉRICA, distinta e independiente
-- de `public.audit_logs` (0005): esa tabla tiene `event_id` NOT NULL y
-- solo puede representar acciones sobre convocatorias/canales — no puede
-- registrar nada sobre Voz abierta, documentación, propuestas ni ningún
-- otro dominio. `audit_trail` usa un par (target_type, target_id) en vez
-- de una FK fija a una sola tabla, precisamente para servir a cualquier
-- dominio presente o futuro sin otra migración estructural.
--
-- `audit_logs` NO se toca ni se sustituye en esta migración (sigue
-- siendo la fuente de verdad de "Registro de decisiones" sobre
-- convocatorias/canales en el panel actual) — son dos tablas
-- coexistentes con propósitos distintos.
--
-- Garantía "no falsificable desde el cliente" (requisito explícito de
-- esta fase): la tabla NO tiene ninguna política RLS de INSERT/UPDATE/
-- DELETE para `authenticated` ni `anon`, y además se revoca
-- explícitamente cualquier GRANT por defecto sobre esas tres operaciones
-- (defensa en profundidad: aunque hipotéticamente faltara una política,
-- el GRANT ya lo impide). La única vía de escritura son funciones
-- `SECURITY DEFINER` (dueñas de la tabla, no sujetas a su propia RLS)
-- invocadas desde triggers atados a cambios de estado reales ya
-- protegidos por su propia RLS/trigger (ver 0050, 0051) — nunca una
-- llamada libre desde el cliente que pueda inventar una entrada. Sin
-- política de UPDATE/DELETE para nadie, ni siquiera admin: inmutable,
-- mismo criterio que `audit_logs` (0005).
--
-- `metadata` es jsonb libre PERO con una regla de producto, no solo
-- técnica: nunca debe contener contenido ciudadano (texto de una
-- aportación, nombre de un archivo con datos personales, etc.) ni
-- secretos — solo hechos mínimos sobre la transición de estado (p. ej.
-- "de qué valor a qué valor"). Esta regla se aplica en cada función que
-- escribe (0050, 0051), documentada ahí; esta migración solo deja el
-- campo listo, sin datos todavía.
--
-- `actor_type` distingue humano de agente de IA desde ya, aunque en esta
-- fase NINGÚN agente tiene acceso (decisión de producto explícita: los
-- agentes quedan fuera de esta fase por completo). Se añade la columna
-- ahora porque es aditiva y barata, y porque la auditoría de acciones de
-- un futuro agente debe poder distinguirse de un humano desde el primer
-- día en que ese acceso exista — no es una puerta de entrada para
-- agentes, ninguna función de esta fase permite `actor_type = 'agent'`.

create table public.audit_trail (
	id uuid primary key default gen_random_uuid(),
	-- Qué tipo de entidad se modificó. Catálogo cerrado, se amplía en
	-- migraciones futuras con drop/add constraint (mismo patrón que
	-- write_rate_limits.action, 0047 §3).
	target_type text not null check (target_type in ('open_voice_contribution', 'verification_document')),
	-- Id de la fila afectada en su tabla de origen. Deliberadamente SIN
	-- foreign key: target_type varía la tabla de destino, y una FK fija a
	-- una sola tabla no podría servir a los demás target_type presentes o
	-- futuros. La integridad referencial real la garantiza cada función
	-- que escribe (valida que la fila exista antes de insertar aquí).
	target_id uuid not null,
	action text not null check (
		action in ('open_voice_moderation_update', 'verification_document_review', 'verification_document_signed_url_issued')
	),
	actor_type text not null default 'human' check (actor_type in ('human', 'agent')),
	actor_id uuid not null references auth.users (id) on delete restrict,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

comment on table public.audit_trail is
	'Auditoría genérica e inmutable del Centro de Operaciones (Fase 1). Distinta de audit_logs (0005, acoplada a event_id): usa (target_type, target_id) para poder registrar cualquier dominio. Sin política ni GRANT de INSERT/UPDATE/DELETE para authenticated/anon — solo funciones SECURITY DEFINER activadas por cambios de estado reales pueden escribir. Nunca debe contener contenido ciudadano ni secretos en metadata.';
comment on column public.audit_trail.target_id is
	'Id de la fila afectada. Sin FK: la tabla de destino depende de target_type. Cada función que inserta valida su propia integridad referencial antes de escribir.';
comment on column public.audit_trail.actor_type is
	'"human" o "agent". En esta fase ninguna función permite "agent" — columna preparada para el futuro acceso de agentes de IA (fuera de esta fase), no un mecanismo de acceso en sí.';
comment on column public.audit_trail.metadata is
	'Metadatos mínimos de la transición (p. ej. estado anterior/nuevo). Nunca contenido ciudadano, datos personales ni secretos.';

alter table public.audit_trail enable row level security;

create index audit_trail_target_idx on public.audit_trail (target_type, target_id, created_at desc);
create index audit_trail_created_at_idx on public.audit_trail (created_at desc);

-- Defensa en profundidad: revoca cualquier GRANT por defecto antes de
-- conceder explícitamente solo lo necesario. Ninguna de las tres
-- operaciones de escritura se concede a authenticated/anon — ver nota de
-- cabecera sobre "no falsificable desde el cliente".
revoke all on public.audit_trail from public, anon, authenticated;
grant select on public.audit_trail to authenticated;

create policy "audit_trail_select_staff"
	on public.audit_trail for select
	to authenticated
	using (public.is_moderator_or_admin());

-- Sin políticas de INSERT/UPDATE/DELETE para nadie: ni siquiera
-- moderación/administración pueden escribir directamente vía la API,
-- exactamente igual que audit_logs (0005). Solo las funciones SECURITY
-- DEFINER de 0050/0051 (dueñas de la tabla) pueden insertar.
