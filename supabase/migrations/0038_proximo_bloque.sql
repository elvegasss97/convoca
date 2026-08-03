-- 0038_proximo_bloque.sql
--
-- "Tú eliges el próximo bloque": votación ciudadana de una sola opción
-- entre 5 fijas, para decidir qué problema debe abordar Convoca después de
-- Vivienda y Sanidad. Ganar NO da un plan cerrado automáticamente: abre una
-- escucha ciudadana, igual que ya ocurrió con Sanidad.
--
-- No reutiliza `concern_listening_rounds` (ligada a `category` de
-- `ConcernCategory`, un vocabulario que no incluye dos de las cinco
-- opciones de este voto — p. ej. "pensiones y cuidados"). Tampoco reutiliza
-- `participation_rounds` (ligada a un `topic_id` real): esta votación no
-- tiene todavía tema ni contenido, es anterior a que exista ninguno. Por
-- eso es una tabla hermana, independiente, con el mismo patrón de
-- seguridad ya validado en 0026/0031/0032/0037:
--   - Ronda con estado y fechas, escritura solo para moderación/admin
--     (misma política `_write_staff` que `participation_rounds`).
--   - Único punto de escritura del voto: función `SECURITY DEFINER` con
--     `auth.uid()` interno + `UNIQUE(round_id, user_id)` + upsert — cambiar
--     de opinión actualiza la fila, nunca duplica ni permite votar en
--     nombre de otra cuenta.
--   - Resultados por opción NUNCA se calculan mientras la ronda no esté
--     `closed`: a diferencia de las escuchas (que agregan sin restricción
--     de estado), aquí el encargo exige explícitamente que ni siquiera una
--     llamada directa a la función pueda adelantar quién va ganando. El
--     total sí es siempre público (es el único dato que debe mostrarse
--     mientras está abierta).
--
-- Todo aditivo y reversible: no toca ninguna fila ni tabla existente.
-- Reversión limpia si hiciera falta:
--   drop function if exists public.get_next_block_vote_results(uuid);
--   drop function if exists public.get_next_block_vote_total(uuid);
--   drop function if exists public.set_next_block_vote(uuid, text);
--   drop table if exists public.next_block_votes;
--   drop table if exists public.next_block_vote_rounds;

-- ---------------------------------------------------------------------------
-- 1. next_block_vote_rounds
-- ---------------------------------------------------------------------------

create table public.next_block_vote_rounds (
	id uuid primary key default gen_random_uuid(),
	version_label text not null,
	-- 3 estados = exactamente los 3 estados que la interfaz debe distinguir
	-- ("Próximamente" / "Abierta" / "Cerrada"). A diferencia de
	-- `concern_listening_rounds` no hay `draft` ni `paused`: no hace falta
	-- un estado oculto para staff porque esta ronda no tiene contenido
	-- sensible que preparar de antemano, solo fechas y las 5 opciones fijas.
	status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed')),
	opens_at timestamptz,
	closes_at timestamptz,
	created_by uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint next_block_vote_rounds_closes_after_opens check (
		opens_at is null or closes_at is null or closes_at > opens_at
	)
);

comment on table public.next_block_vote_rounds is
	'Ronda de la votación "Tú eliges el próximo bloque". Siempre visible públicamente (no hay estado oculto tipo draft): antes de abrir, se muestra como "Próximamente".';

alter table public.next_block_vote_rounds enable row level security;

create trigger next_block_vote_rounds_set_updated_at
	before update on public.next_block_vote_rounds
	for each row
	execute function public.set_updated_at();

-- Pública siempre (a diferencia de concern_listening_rounds/participation_rounds,
-- no hay estado 'draft' que ocultar): cualquiera puede ver que la votación
-- existe y en qué estado está.
create policy "next_block_vote_rounds_select_public"
	on public.next_block_vote_rounds for select
	to anon, authenticated
	using (true);

create policy "next_block_vote_rounds_write_staff"
	on public.next_block_vote_rounds for all
	to authenticated
	using (public.is_moderator_or_admin())
	with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 2. next_block_votes
-- ---------------------------------------------------------------------------

create table public.next_block_votes (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.next_block_vote_rounds (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	-- Las 5 opciones del encargo, fijas en esta fase ("No añadas nuevas
	-- opciones sin preguntarme"): igual que los problemas/causas de la
	-- escucha de sanidad, el vocabulario vive en el CHECK del servidor, no
	-- en una tabla aparte que alguien pudiera alterar.
	option_code text not null check (
		option_code in (
			'empleo_salarios', 'educacion', 'pensiones_cuidados', 'coste_vida',
			'inmigracion_integracion_convivencia'
		)
	),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- Restricción real de unicidad: una cuenta solo puede tener un voto
	-- activo por ronda. Cambiar de opción actualiza esta misma fila.
	unique (round_id, user_id)
);

comment on table public.next_block_votes is
	'Un voto activo por cuenta y ronda de "Tú eliges el próximo bloque". Nunca público a nivel individual ni por conteo mientras la ronda no esté cerrada — ver get_next_block_vote_results().';

alter table public.next_block_votes enable row level security;

create index next_block_votes_round_id_idx on public.next_block_votes (round_id);

create trigger next_block_votes_set_updated_at
	before update on public.next_block_votes
	for each row
	execute function public.set_updated_at();

-- Cada persona solo puede leer su propio voto (o staff). Un anónimo nunca
-- puede leer ningún voto individual: no hay política para `anon` aquí.
create policy "next_block_votes_select_own_or_staff"
	on public.next_block_votes for select
	to authenticated
	using (user_id = auth.uid() or public.is_moderator_or_admin());

-- Sin políticas de INSERT/UPDATE/DELETE directas: toda escritura pasa por
-- `set_next_block_vote` (SECURITY DEFINER), igual que el resto de
-- participación de Convoca. Así nadie puede votar en nombre de otra cuenta
-- ni insertar una fila con un round_id/user_id arbitrario.

-- ---------------------------------------------------------------------------
-- 3. set_next_block_vote(): único punto de escritura
-- ---------------------------------------------------------------------------

create or replace function public.set_next_block_vote(p_round_id uuid, p_option_code text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para votar.';
	end if;

	if p_option_code is null or p_option_code not in (
		'empleo_salarios', 'educacion', 'pensiones_cuidados', 'coste_vida',
		'inmigracion_integracion_convivencia'
	) then
		raise exception 'Selecciona una opción válida.';
	end if;

	-- Defensa en profundidad: el servidor decide si la votación admite
	-- votos ahora mismo, nunca solo el cliente. `status = 'open'` no basta
	-- por sí solo si alguien manipulase las fechas desde el cliente — aquí
	-- se comprueban también opens_at/closes_at, ambos leídos de la fila
	-- real en servidor.
	if not exists (
		select 1 from public.next_block_vote_rounds r
		where r.id = p_round_id
		and r.status = 'open'
		and (r.opens_at is null or r.opens_at <= now())
		and (r.closes_at is null or r.closes_at > now())
	) then
		raise exception 'Esta votación no está abierta en este momento.';
	end if;

	insert into public.next_block_votes (round_id, user_id, option_code)
	values (p_round_id, v_user_id, p_option_code)
	on conflict (round_id, user_id)
	do update set option_code = excluded.option_code, updated_at = now();
end;
$function$;

comment on function public.set_next_block_vote is
	'Único punto de escritura de next_block_votes. auth.uid() interno: el id de usuario nunca llega como parámetro del cliente. El upsert sobre (round_id, user_id) hace que cambiar de opción actualice la misma fila, nunca sume un voto nuevo.';

-- ---------------------------------------------------------------------------
-- 4. Lecturas agregadas
-- ---------------------------------------------------------------------------

-- Total de votos válidos: siempre seguro, es el único dato que debe
-- mostrarse mientras la votación sigue abierta.
create or replace function public.get_next_block_vote_total(p_round_id uuid)
returns bigint
language sql
stable
security definer
set search_path to 'public'
as $function$
	select count(*) from public.next_block_votes where round_id = p_round_id;
$function$;

-- Recuento por opción: se niega en el propio servidor mientras la ronda no
-- esté `closed`, para que ni siquiera una llamada directa a esta función
-- (sin pasar por la interfaz) pueda adelantar qué opción va ganando.
create or replace function public.get_next_block_vote_results(p_round_id uuid)
returns table (option_code text, vote_count bigint)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
	if not exists (
		select 1 from public.next_block_vote_rounds where id = p_round_id and status = 'closed'
	) then
		raise exception 'Los resultados no están disponibles hasta que la votación finalice.';
	end if;

	return query
	select v.option_code, count(*)
	from public.next_block_votes v
	where v.round_id = p_round_id
	group by v.option_code;
end;
$function$;

comment on function public.get_next_block_vote_results is
	'Recuento por opción. Lanza una excepción si la ronda no está cerrada: la protección de "no revelar quién va ganando" vive en el servidor, no solo en que el cliente decida no pedirlo.';
