import type { PageLoad } from './$types';
import { listMunicipalIssues } from '$lib/services/municipalService';

export const load: PageLoad = async ({ url }) => {
	const issueId = url.searchParams.get('issue');
	if (!issueId) return { issue: null };
	const issues = await listMunicipalIssues();
	return { issue: issues.find((issue) => issue.id === issueId) ?? null };
};
