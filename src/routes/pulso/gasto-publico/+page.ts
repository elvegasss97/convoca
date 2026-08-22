import type { PageLoad } from './$types';
import { listPublicSpendingInvestigations } from '$lib/services/publicSpendingService';

export const load: PageLoad = async () => ({
	investigations: await listPublicSpendingInvestigations()
});
