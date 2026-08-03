/**
 * Capa de acceso a datos de "Tú eliges el próximo bloque": votación de una
 * opción entre 5 fijas para decidir qué problema aborda Convoca después.
 *
 * La autorización real vive en las políticas RLS y en las funciones
 * `SECURITY DEFINER` de `supabase/migrations/0038_proximo_bloque.sql`
 * (`set_next_block_vote`, `get_next_block_vote_total`,
 * `get_next_block_vote_results`) — las comprobaciones de aquí son
 * conveniencia de UX, nunca la única barrera.
 *
 * Las funciones de creación/cambio de estado de la ronda (`createRound`,
 * `setRoundStatus`) son escritura directa de tabla, no RPC: igual que
 * `participationService.ts` (0031), la política RLS
 * `next_block_vote_rounds_write_staff` ya exige `is_moderator_or_admin()`,
 * así que no hace falta una función intermedia.
 */
import { supabase } from '$lib/supabase/client';
import type {
	NextBlockVoteOptionCode,
	NextBlockVoteResultRow,
	NextBlockVoteRound,
	NextBlockVoteRoundStatus
} from '$lib/types';

interface RoundRow {
	id: string;
	version_label: string;
	status: string;
	opens_at: string | null;
	closes_at: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

function rowToRound(row: RoundRow): NextBlockVoteRound {
	return {
		id: row.id,
		versionLabel: row.version_label,
		status: row.status as NextBlockVoteRoundStatus,
		opensAt: row.opens_at ?? undefined,
		closesAt: row.closes_at ?? undefined,
		createdBy: row.created_by ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

// ---------------------------------------------------------------------------
// Ronda (lectura pública)
// ---------------------------------------------------------------------------

/** La ronda más reciente (visible públicamente: no hay estado oculto en esta votación). */
export async function getLatestNextBlockVoteRound(): Promise<NextBlockVoteRound | undefined> {
	const { data, error } = await supabase
		.from('next_block_vote_rounds')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error || !data) return undefined;
	return rowToRound(data);
}

// ---------------------------------------------------------------------------
// Ronda (administración — requiere is_moderator_or_admin(), forzado por RLS)
// ---------------------------------------------------------------------------

export async function listNextBlockVoteRounds(): Promise<NextBlockVoteRound[]> {
	const { data, error } = await supabase
		.from('next_block_vote_rounds')
		.select('*')
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToRound);
}

export interface NextBlockVoteRoundInput {
	versionLabel: string;
	opensAt?: string;
	closesAt?: string;
}

export async function createNextBlockVoteRound(
	input: NextBlockVoteRoundInput,
	createdBy: string
): Promise<NextBlockVoteRound> {
	const { data, error } = await supabase
		.from('next_block_vote_rounds')
		.insert({
			version_label: input.versionLabel.trim(),
			opens_at: input.opensAt ?? null,
			closes_at: input.closesAt ?? null,
			created_by: createdBy
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToRound(data);
}

export async function setNextBlockVoteRoundStatus(
	roundId: string,
	status: NextBlockVoteRoundStatus
): Promise<NextBlockVoteRound> {
	const { data, error } = await supabase
		.from('next_block_vote_rounds')
		.update({ status })
		.eq('id', roundId)
		.select('*')
		.single();
	if (error) throw error;
	return rowToRound(data);
}

// ---------------------------------------------------------------------------
// Mi voto
// ---------------------------------------------------------------------------

/** Mi propio voto (o ninguno). Requiere sesión — se resuelve siempre en el cliente. */
export async function getMyNextBlockVote(
	roundId: string
): Promise<NextBlockVoteOptionCode | undefined> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) return undefined;

	const { data, error } = await supabase
		.from('next_block_votes')
		.select('option_code')
		.eq('round_id', roundId)
		.eq('user_id', sessionData.session.user.id)
		.maybeSingle();
	if (error || !data) return undefined;
	return data.option_code as NextBlockVoteOptionCode;
}

/** Guarda o actualiza mi voto. Único punto de escritura: `set_next_block_vote` (usa `auth.uid()` interno). */
export async function setNextBlockVote(
	roundId: string,
	optionCode: NextBlockVoteOptionCode
): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	if (!sessionData.session) {
		throw new Error('Debes iniciar sesión para votar.');
	}
	const { error } = await supabase.rpc('set_next_block_vote', {
		p_round_id: roundId,
		p_option_code: optionCode
	});
	if (error) throw new Error(error.message || 'No se ha podido guardar tu elección.');
}

// ---------------------------------------------------------------------------
// Resultados agregados (nunca exponen votos individuales)
// ---------------------------------------------------------------------------

/** Siempre seguro: el único dato que debe mostrarse mientras la votación sigue abierta. */
export async function getNextBlockVoteTotal(roundId: string): Promise<number> {
	const { data, error } = await supabase.rpc('get_next_block_vote_total', {
		p_round_id: roundId
	});
	if (error) throw error;
	return data ?? 0;
}

/**
 * Recuento por opción. El servidor (no este cliente) es quien decide si
 * puede responder: `get_next_block_vote_results` lanza una excepción si la
 * ronda no está `closed`. Este cliente ni siquiera debería llamarla antes
 * (ver `NextBlockVoteFlow.svelte`), pero aunque lo hiciera, no obtendría
 * datos.
 */
export async function getNextBlockVoteResults(roundId: string): Promise<NextBlockVoteResultRow[]> {
	const { data, error } = await supabase.rpc('get_next_block_vote_results', {
		p_round_id: roundId
	});
	if (error) throw error;
	return (data ?? []).map((row) => ({
		optionCode: row.option_code as NextBlockVoteOptionCode,
		voteCount: row.vote_count
	}));
}
