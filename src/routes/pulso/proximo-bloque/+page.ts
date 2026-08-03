import type { PageLoad } from './$types';
import {
	getLatestNextBlockVoteRound,
	getMyNextBlockVote,
	getNextBlockVoteResults,
	getNextBlockVoteTotal
} from '$lib/services/nextBlockVoteService';

export const load: PageLoad = async () => {
	const round = await getLatestNextBlockVoteRound();

	if (!round) {
		return { round: undefined, myVote: undefined, total: 0, results: [] };
	}

	// Los resultados por opción se piden únicamente con la ronda cerrada:
	// mientras está abierta, `get_next_block_vote_results` los rechaza en el
	// propio servidor (ver 0038_proximo_bloque.sql) — no tiene sentido
	// llamarla antes, y el total (siempre seguro) sí se pide en cualquier
	// estado.
	const [myVote, total, results] = await Promise.all([
		getMyNextBlockVote(round.id),
		getNextBlockVoteTotal(round.id),
		round.status === 'closed' ? getNextBlockVoteResults(round.id) : Promise.resolve([])
	]);

	return { round, myVote, total, results };
};
