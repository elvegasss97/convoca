/**
 * Tipos de la base de datos, escritos a mano a partir de
 * `supabase/migrations/*.sql` porque no hay acceso a la CLI de Supabase
 * vinculada al proyecto real desde este entorno.
 *
 * En cuanto tengas la CLI vinculada (`supabase link --project-ref <ref>`),
 * sustituye este archivo por la salida real de:
 *   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 * para que quede garantizado que coincide exactamente con el esquema en
 * producción, en vez de con esta copia mantenida a mano.
 */

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					role: 'organizer' | 'moderator' | 'admin';
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					role?: 'organizer' | 'moderator' | 'admin';
				};
				Update: {
					role?: 'organizer' | 'moderator' | 'admin';
				};
			};
			organizers: {
				Row: {
					id: string;
					created_by: string;
					display_name: string;
					kind: 'persona' | 'colectivo' | 'asociacion' | 'sindicato' | 'plataforma' | 'otro';
					bio: string | null;
					contact_email: string | null;
					website: string | null;
					avatar_url: string | null;
					published_events_count: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					created_by: string;
					display_name: string;
					kind: 'persona' | 'colectivo' | 'asociacion' | 'sindicato' | 'plataforma' | 'otro';
					bio?: string | null;
					contact_email?: string | null;
					website?: string | null;
					avatar_url?: string | null;
				};
				Update: {
					display_name?: string;
					bio?: string | null;
					contact_email?: string | null;
					website?: string | null;
					avatar_url?: string | null;
				};
			};
			organizer_private_profiles: {
				Row: {
					organizer_id: string;
					user_id: string;
					legal_organization_name: string | null;
					accepted_terms_at: string | null;
					accepted_peaceful_use_at: string | null;
					created_at: string;
				};
				Insert: {
					organizer_id: string;
					user_id: string;
					legal_organization_name?: string | null;
					accepted_terms_at?: string | null;
					accepted_peaceful_use_at?: string | null;
				};
				Update: {
					legal_organization_name?: string | null;
				};
			};
			events: {
				Row: {
					id: string;
					slug: string;
					title: string;
					description: string;
					objective: string;
					category: string;
					themes: string[];
					custom_theme_label: string | null;
					status: string;
					status_note: string | null;
					start_at: string;
					end_at: string | null;
					duration_minutes: number | null;
					meeting_point: Record<string, unknown>;
					route: Record<string, unknown> | null;
					organizer_id: string;
					created_by_user_id: string;
					verification: Record<string, unknown>;
					prior_communication: string;
					rules: string[];
					peaceful_declaration: boolean;
					cover_image_url: string | null;
					archived: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					slug: string;
					title: string;
					description: string;
					objective: string;
					category: string;
					themes?: string[];
					custom_theme_label?: string | null;
					status?: string;
					status_note?: string | null;
					start_at: string;
					end_at?: string | null;
					duration_minutes?: number | null;
					meeting_point: Record<string, unknown>;
					route?: Record<string, unknown> | null;
					organizer_id: string;
					created_by_user_id: string;
					prior_communication: string;
					rules?: string[];
					peaceful_declaration: boolean;
					cover_image_url?: string | null;
					archived?: boolean;
				};
				Update: {
					title?: string;
					description?: string;
					objective?: string;
					category?: string;
					themes?: string[];
					custom_theme_label?: string | null;
					status?: string;
					status_note?: string | null;
					start_at?: string;
					end_at?: string | null;
					duration_minutes?: number | null;
					meeting_point?: Record<string, unknown>;
					route?: Record<string, unknown> | null;
					rules?: string[];
					peaceful_declaration?: boolean;
					cover_image_url?: string | null;
					archived?: boolean;
				};
			};
			event_updates: {
				Row: {
					id: string;
					event_id: string;
					author_organizer_id: string;
					title: string;
					body: string;
					is_critical: boolean;
					created_at: string;
				};
				Insert: {
					event_id: string;
					author_organizer_id: string;
					title: string;
					body: string;
					is_critical?: boolean;
				};
				Update: never;
			};
			reports: {
				Row: {
					id: string;
					event_id: string;
					reported_by_user_id: string | null;
					reason: string;
					details: string | null;
					status: 'open' | 'in_review' | 'resolved' | 'dismissed';
					created_at: string;
					resolved_at: string | null;
				};
				Insert: {
					event_id: string;
					reported_by_user_id?: string | null;
					reason: string;
					details?: string | null;
				};
				Update: {
					status?: 'open' | 'in_review' | 'resolved' | 'dismissed';
					resolved_at?: string | null;
				};
			};
			audit_logs: {
				Row: {
					id: string;
					event_id: string;
					action: 'approve' | 'request_changes' | 'hide' | 'reject' | 'reinstate';
					moderator_id: string;
					note: string | null;
					created_at: string;
				};
				Insert: {
					event_id: string;
					action: 'approve' | 'request_changes' | 'hide' | 'reject' | 'reinstate';
					moderator_id: string;
					note?: string | null;
				};
				Update: never;
			};
			verification_documents: {
				Row: {
					id: string;
					organizer_id: string;
					event_id: string | null;
					uploaded_by_user_id: string;
					type: 'identity' | 'organization_registration' | 'prior_communication_receipt' | 'other';
					file_name: string;
					storage_path: string;
					status: 'pending' | 'approved' | 'rejected';
					submitted_at: string;
					reviewed_at: string | null;
					reviewer_note: string | null;
				};
				Insert: {
					organizer_id: string;
					event_id?: string | null;
					uploaded_by_user_id: string;
					type: 'identity' | 'organization_registration' | 'prior_communication_receipt' | 'other';
					file_name: string;
					storage_path: string;
				};
				Update: {
					status?: 'pending' | 'approved' | 'rejected';
					reviewed_at?: string | null;
					reviewer_note?: string | null;
				};
			};
		};
	};
}
