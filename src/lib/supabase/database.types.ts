/**
 * Tipos generados automáticamente a partir del esquema remoto real
 * (proyecto ihwzbdaeggvkzwevozra) con
 * `mcp__supabase__generate_typescript_types`. No editar a mano: si el
 * esquema cambia, añade una migración nueva y vuelve a generar este
 * archivo.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '14.15';
	};
	public: {
		Tables: {
			attendance_responses: {
				Row: {
					created_at: string;
					dedup_token: string;
					event_id: string;
					id: string;
					response: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					dedup_token: string;
					event_id: string;
					id?: string;
					response: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					dedup_token?: string;
					event_id?: string;
					id?: string;
					response?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'attendance_responses_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					}
				];
			};
			audit_logs: {
				Row: {
					action: string;
					created_at: string;
					event_id: string;
					id: string;
					moderator_id: string;
					note: string | null;
				};
				Insert: {
					action: string;
					created_at?: string;
					event_id: string;
					id?: string;
					moderator_id: string;
					note?: string | null;
				};
				Update: {
					action?: string;
					created_at?: string;
					event_id?: string;
					id?: string;
					moderator_id?: string;
					note?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'audit_logs_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					}
				];
			};
			event_updates: {
				Row: {
					author_organizer_id: string;
					body: string;
					created_at: string;
					event_id: string;
					id: string;
					is_critical: boolean;
					title: string;
				};
				Insert: {
					author_organizer_id: string;
					body: string;
					created_at?: string;
					event_id: string;
					id?: string;
					is_critical?: boolean;
					title: string;
				};
				Update: {
					author_organizer_id?: string;
					body?: string;
					created_at?: string;
					event_id?: string;
					id?: string;
					is_critical?: boolean;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'event_updates_author_organizer_id_fkey';
						columns: ['author_organizer_id'];
						isOneToOne: false;
						referencedRelation: 'organizers';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'event_updates_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					}
				];
			};
			events: {
				Row: {
					archived: boolean;
					category: string;
					cover_image_url: string | null;
					created_at: string;
					created_by_user_id: string;
					custom_theme_label: string | null;
					description: string;
					duration_minutes: number | null;
					end_at: string | null;
					id: string;
					meeting_point: Json;
					objective: string;
					organizer_id: string;
					peaceful_declaration: boolean;
					prior_communication: string;
					route: Json | null;
					rules: string[];
					slug: string;
					start_at: string;
					status: string;
					status_note: string | null;
					themes: string[];
					title: string;
					updated_at: string;
					verification: Json;
				};
				Insert: {
					archived?: boolean;
					category: string;
					cover_image_url?: string | null;
					created_at?: string;
					created_by_user_id: string;
					custom_theme_label?: string | null;
					description: string;
					duration_minutes?: number | null;
					end_at?: string | null;
					id?: string;
					meeting_point: Json;
					objective: string;
					organizer_id: string;
					peaceful_declaration: boolean;
					prior_communication: string;
					route?: Json | null;
					rules?: string[];
					slug: string;
					start_at: string;
					status?: string;
					status_note?: string | null;
					themes?: string[];
					title: string;
					updated_at?: string;
					verification?: Json;
				};
				Update: {
					archived?: boolean;
					category?: string;
					cover_image_url?: string | null;
					created_at?: string;
					created_by_user_id?: string;
					custom_theme_label?: string | null;
					description?: string;
					duration_minutes?: number | null;
					end_at?: string | null;
					id?: string;
					meeting_point?: Json;
					objective?: string;
					organizer_id?: string;
					peaceful_declaration?: boolean;
					prior_communication?: string;
					route?: Json | null;
					rules?: string[];
					slug?: string;
					start_at?: string;
					status?: string;
					status_note?: string | null;
					themes?: string[];
					title?: string;
					updated_at?: string;
					verification?: Json;
				};
				Relationships: [
					{
						foreignKeyName: 'events_organizer_id_fkey';
						columns: ['organizer_id'];
						isOneToOne: false;
						referencedRelation: 'organizers';
						referencedColumns: ['id'];
					}
				];
			};
			organizer_private_profiles: {
				Row: {
					accepted_peaceful_use_at: string | null;
					accepted_terms_at: string | null;
					created_at: string;
					legal_organization_name: string | null;
					organizer_id: string;
					user_id: string;
				};
				Insert: {
					accepted_peaceful_use_at?: string | null;
					accepted_terms_at?: string | null;
					created_at?: string;
					legal_organization_name?: string | null;
					organizer_id: string;
					user_id: string;
				};
				Update: {
					accepted_peaceful_use_at?: string | null;
					accepted_terms_at?: string | null;
					created_at?: string;
					legal_organization_name?: string | null;
					organizer_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'organizer_private_profiles_organizer_id_fkey';
						columns: ['organizer_id'];
						isOneToOne: true;
						referencedRelation: 'organizers';
						referencedColumns: ['id'];
					}
				];
			};
			organizers: {
				Row: {
					avatar_url: string | null;
					bio: string | null;
					contact_email: string | null;
					created_at: string;
					created_by: string;
					display_name: string;
					id: string;
					kind: string;
					published_events_count: number;
					updated_at: string;
					website: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					bio?: string | null;
					contact_email?: string | null;
					created_at?: string;
					created_by: string;
					display_name: string;
					id?: string;
					kind: string;
					published_events_count?: number;
					updated_at?: string;
					website?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					bio?: string | null;
					contact_email?: string | null;
					created_at?: string;
					created_by?: string;
					display_name?: string;
					id?: string;
					kind?: string;
					published_events_count?: number;
					updated_at?: string;
					website?: string | null;
				};
				Relationships: [];
			};
			profiles: {
				Row: {
					created_at: string;
					id: string;
					role: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id: string;
					role?: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					role?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			reports: {
				Row: {
					created_at: string;
					details: string | null;
					event_id: string;
					id: string;
					reason: string;
					reported_by_user_id: string | null;
					resolved_at: string | null;
					status: string;
				};
				Insert: {
					created_at?: string;
					details?: string | null;
					event_id: string;
					id?: string;
					reason: string;
					reported_by_user_id?: string | null;
					resolved_at?: string | null;
					status?: string;
				};
				Update: {
					created_at?: string;
					details?: string | null;
					event_id?: string;
					id?: string;
					reason?: string;
					reported_by_user_id?: string | null;
					resolved_at?: string | null;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'reports_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					}
				];
			};
			verification_documents: {
				Row: {
					event_id: string | null;
					file_name: string;
					id: string;
					organizer_id: string;
					reviewed_at: string | null;
					reviewer_note: string | null;
					status: string;
					storage_path: string;
					submitted_at: string;
					type: string;
					uploaded_by_user_id: string;
				};
				Insert: {
					event_id?: string | null;
					file_name: string;
					id?: string;
					organizer_id: string;
					reviewed_at?: string | null;
					reviewer_note?: string | null;
					status?: string;
					storage_path: string;
					submitted_at?: string;
					type: string;
					uploaded_by_user_id: string;
				};
				Update: {
					event_id?: string | null;
					file_name?: string;
					id?: string;
					organizer_id?: string;
					reviewed_at?: string | null;
					reviewer_note?: string | null;
					status?: string;
					storage_path?: string;
					submitted_at?: string;
					type?: string;
					uploaded_by_user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'verification_documents_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'verification_documents_organizer_id_fkey';
						columns: ['organizer_id'];
						isOneToOne: false;
						referencedRelation: 'organizers';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			get_attendance_counts: {
				Args: { p_event_ids?: string[] };
				Returns: {
					event_id: string;
					going_count: number;
					interested_count: number;
				}[];
			};
			is_moderator_or_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
			purge_old_attendance_responses: { Args: Record<PropertyKey, never>; Returns: undefined };
			set_attendance: {
				Args: { p_dedup_token: string; p_event_id: string; p_response?: string };
				Returns: undefined;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals['public'];

export type Tables<TableName extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])> =
	(DefaultSchema['Tables'] & DefaultSchema['Views'])[TableName] extends {
		Row: infer R;
	}
		? R
		: never;

export type TablesInsert<TableName extends keyof DefaultSchema['Tables']> =
	DefaultSchema['Tables'][TableName] extends {
		Insert: infer I;
	}
		? I
		: never;

export type TablesUpdate<TableName extends keyof DefaultSchema['Tables']> =
	DefaultSchema['Tables'][TableName] extends {
		Update: infer U;
	}
		? U
		: never;
