import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	isPublicSpendingAsylumInvestigation,
	isPublicSpendingClaimSource,
	isPublicSpendingPrimarySource
} from '$lib/data/publicSpending';
import { getPublicSpendingInvestigation } from '$lib/services/publicSpendingService';

const SLUG = 'acogida-proteccion-internacional-2026-2027';

export const load: PageLoad = async () => {
	const investigation = await getPublicSpendingInvestigation(SLUG);
	if (!investigation) error(404, 'Investigación no encontrada');
	if (!isPublicSpendingAsylumInvestigation(investigation)) {
		error(500, 'La investigación no contiene el desglose editorial esperado');
	}

	const claimOrigin = investigation.sources.find(isPublicSpendingClaimSource);
	if (!claimOrigin) error(500, 'Falta la publicación analizada');

	return {
		investigation,
		claimOrigin,
		primarySources: investigation.sources.filter(isPublicSpendingPrimarySource)
	};
};
