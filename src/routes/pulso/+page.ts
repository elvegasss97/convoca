import type { PageLoad } from './$types';
import { getPulsoParticipantCount } from '$lib/services/concernsService';
import { listPublishedTopics } from '$lib/services/topicsService';

export const load: PageLoad = async () => {
	const [participantCount, topics] = await Promise.all([
		getPulsoParticipantCount(),
		listPublishedTopics()
	]);

	return { participantCount, topics };
};
