-- Corrige set_concern_listening_priorities: la versión de 0032 primero
-- asignaba los nuevos rangos y solo después ponía a null los que dejaban de
-- estar seleccionados. Si una preocupación nueva ocupaba el mismo rango
-- (1/2/3) que una que se estaba deseleccionando en la misma llamada, la
-- restricción UNIQUE(round_id, user_id, rank) rechazaba la operación con un
-- error 23505 real (confirmado en QA: deseleccionar "dificultad_compra" en
-- rango 2 mientras "emancipacion_juvenil" pasaba de rango 3 a rango 2).
--
-- La corrección invierte el orden: primero libera (rank = null) todos los
-- rangos actuales del usuario en la ronda, y solo después asigna los nuevos.
-- Esto es seguro porque el UNIQUE admite múltiples NULL simultáneos.
create or replace function public.set_concern_listening_priorities(
	p_round_id uuid,
	p_option_codes text[]
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_user_id uuid := auth.uid();
	v_count integer;
	v_distinct_count integer;
begin
	if v_user_id is null then
		raise exception 'Debes iniciar sesión para participar.';
	end if;

	v_count := coalesce(array_length(p_option_codes, 1), 0);
	if v_count > 3 then
		raise exception 'Puedes elegir como máximo tres preocupaciones.';
	end if;

	select count(distinct c) into v_distinct_count from unnest(p_option_codes) as c;
	if v_distinct_count <> v_count then
		raise exception 'No puedes elegir la misma preocupación más de una vez.';
	end if;

	if not exists (
		select 1 from public.concern_listening_rounds r where r.id = p_round_id and r.status = 'open'
	) then
		raise exception 'Esta escucha no admite respuestas en este momento.';
	end if;

	-- Libera primero todos los rangos actuales del usuario en esta ronda:
	-- evita colisiones transitorias con UNIQUE(round_id, user_id, rank) al
	-- reordenar o sustituir prioridades en la misma llamada.
	update public.concern_listening_responses
	set rank = null, updated_at = now()
	where round_id = p_round_id
	and user_id = v_user_id
	and rank is not null;

	if v_count > 0 then
		insert into public.concern_listening_responses (round_id, user_id, option_code, rank)
		select p_round_id, v_user_id, u.code, u.ord::smallint
		from unnest(p_option_codes) with ordinality as u (code, ord)
		on conflict (round_id, option_code, user_id)
		do update set rank = excluded.rank, updated_at = now();
	end if;
end;
$function$;
