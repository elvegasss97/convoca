import type { PageLoad } from './$types';
import { listPublishedTopics } from '$lib/services/topicsService';

export const load: PageLoad = async () => {
	const topics = await listPublishedTopics();
	return { topics };
};
