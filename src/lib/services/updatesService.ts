import type { EventUpdate } from '$lib/types';
import { supabase } from '$lib/supabase/client';

interface EventUpdateRow {
	id: string;
	event_id: string;
	author_organizer_id: string;
	title: string;
	body: string;
	is_critical: boolean;
	created_at: string;
}

function rowToUpdate(row: EventUpdateRow): EventUpdate {
	return {
		id: row.id,
		eventId: row.event_id,
		authorOrganizerId: row.author_organizer_id,
		title: row.title,
		body: row.body,
		isCritical: row.is_critical,
		createdAt: row.created_at
	};
}

export async function listUpdates(eventId: string): Promise<EventUpdate[]> {
	const { data, error } = await supabase
		.from('event_updates')
		.select('*')
		.eq('event_id', eventId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []).map(rowToUpdate);
}

export type NewUpdateInput = Omit<EventUpdate, 'id' | 'createdAt'>;

export async function publishUpdate(input: NewUpdateInput): Promise<EventUpdate> {
	const { data, error } = await supabase
		.from('event_updates')
		.insert({
			event_id: input.eventId,
			author_organizer_id: input.authorOrganizerId,
			title: input.title,
			body: input.body,
			is_critical: input.isCritical
		})
		.select('*')
		.single();
	if (error) throw error;
	return rowToUpdate(data);
}
