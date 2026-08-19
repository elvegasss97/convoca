import type { PageLoad } from './$types';
import {
	getMunicipalRadarSummary,
	listMunicipalIssues,
	listMunicipalPetitions
} from '$lib/services/municipalService';

export const load: PageLoad = async () => {
	const [issues, petitions, summary] = await Promise.all([
		listMunicipalIssues(),
		listMunicipalPetitions(),
		getMunicipalRadarSummary()
	]);
	return { issues, petitions, summary };
};
