/**
 * Tipos generados automáticamente a partir del esquema remoto real
 * (proyecto ihwzbdaeggvkzwevozra) con
 * `mcp__supabase__generate_typescript_types`. No editar a mano: si el
 * esquema cambia, añade una migración nueva y vuelve a generar este
 * archivo.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	__InternalSupabase: {
		PostgrestVersion: '14.15';
	};
	public: {
		Tables: {
			attendance_rate_limits: {
				Row: { called_at: string; dedup_token: string; id: number };
				Insert: { called_at?: string; dedup_token: string; id?: never };
				Update: { called_at?: string; dedup_token?: string; id?: never };
				Relationships: [];
			};
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
					channel_id: string | null;
					created_at: string;
					event_id: string;
					id: string;
					moderator_id: string;
					note: string | null;
				};
				Insert: {
					action: string;
					channel_id?: string | null;
					created_at?: string;
					event_id: string;
					id?: string;
					moderator_id: string;
					note?: string | null;
				};
				Update: {
					action?: string;
					channel_id?: string | null;
					created_at?: string;
					event_id?: string;
					id?: string;
					moderator_id?: string;
					note?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'audit_logs_channel_id_fkey';
						columns: ['channel_id'];
						isOneToOne: false;
						referencedRelation: 'event_communication_channels';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'audit_logs_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					}
				];
			};
			channel_reports: {
				Row: {
					channel_id: string;
					created_at: string;
					details: string | null;
					id: string;
					reason: string;
					reported_by_user_id: string | null;
					resolved_at: string | null;
					status: string;
				};
				Insert: {
					channel_id: string;
					created_at?: string;
					details?: string | null;
					id?: string;
					reason: string;
					reported_by_user_id?: string | null;
					resolved_at?: string | null;
					status?: string;
				};
				Update: {
					channel_id?: string;
					created_at?: string;
					details?: string | null;
					id?: string;
					reason?: string;
					reported_by_user_id?: string | null;
					resolved_at?: string | null;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'channel_reports_channel_id_fkey';
						columns: ['channel_id'];
						isOneToOne: false;
						referencedRelation: 'event_communication_channels';
						referencedColumns: ['id'];
					}
				];
			};
			concern_events: {
				Row: { concern_id: string; created_at: string; event_id: string };
				Insert: { concern_id: string; created_at?: string; event_id: string };
				Update: { concern_id?: string; created_at?: string; event_id?: string };
				Relationships: [
					{
						foreignKeyName: 'concern_events_concern_id_fkey';
						columns: ['concern_id'];
						isOneToOne: false;
						referencedRelation: 'concerns';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'concern_events_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					}
				];
			};
			concern_proposals: {
				Row: {
					category: string;
					created_at: string;
					description: string;
					id: string;
					proposed_question: string;
					proposer_user_id: string;
					reason: string;
					resulting_concern_id: string | null;
					reviewed_at: string | null;
					reviewed_by: string | null;
					reviewer_note: string | null;
					scope_type: string;
					scope_value: string | null;
					status: string;
					title: string;
					updated_at: string;
				};
				Insert: {
					category: string;
					created_at?: string;
					description?: string;
					id?: string;
					proposed_question: string;
					proposer_user_id: string;
					reason: string;
					resulting_concern_id?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					reviewer_note?: string | null;
					scope_type?: string;
					scope_value?: string | null;
					status?: string;
					title: string;
					updated_at?: string;
				};
				Update: {
					category?: string;
					created_at?: string;
					description?: string;
					id?: string;
					proposed_question?: string;
					proposer_user_id?: string;
					reason?: string;
					resulting_concern_id?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					reviewer_note?: string | null;
					scope_type?: string;
					scope_value?: string | null;
					status?: string;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'concern_proposals_resulting_concern_id_fkey';
						columns: ['resulting_concern_id'];
						isOneToOne: false;
						referencedRelation: 'concerns';
						referencedColumns: ['id'];
					}
				];
			};
			concern_responses: {
				Row: {
					concern_id: string;
					created_at: string;
					id: string;
					level: number;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					concern_id: string;
					created_at?: string;
					id?: string;
					level: number;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					concern_id?: string;
					created_at?: string;
					id?: string;
					level?: number;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'concern_responses_concern_id_fkey';
						columns: ['concern_id'];
						isOneToOne: false;
						referencedRelation: 'concerns';
						referencedColumns: ['id'];
					}
				];
			};
			concerns: {
				Row: {
					category: string;
					closes_at: string | null;
					created_at: string;
					created_by: string | null;
					description: string;
					id: string;
					publisher_label: string;
					question: string;
					scope_type: string;
					scope_value: string | null;
					slug: string;
					starts_at: string;
					status: string;
					updated_at: string;
				};
				Insert: {
					category: string;
					closes_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string;
					id?: string;
					publisher_label?: string;
					question: string;
					scope_type?: string;
					scope_value?: string | null;
					slug: string;
					starts_at?: string;
					status?: string;
					updated_at?: string;
				};
				Update: {
					category?: string;
					closes_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string;
					id?: string;
					publisher_label?: string;
					question?: string;
					scope_type?: string;
					scope_value?: string | null;
					slug?: string;
					starts_at?: string;
					status?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			event_communication_channels: {
				Row: {
					channel_type: string;
					created_at: string;
					event_id: string;
					id: string;
					is_hidden: boolean;
					label: string | null;
					platform: string;
					updated_at: string;
					url: string;
				};
				Insert: {
					channel_type: string;
					created_at?: string;
					event_id: string;
					id?: string;
					is_hidden?: boolean;
					label?: string | null;
					platform: string;
					updated_at?: string;
					url: string;
				};
				Update: {
					channel_type?: string;
					created_at?: string;
					event_id?: string;
					id?: string;
					is_hidden?: boolean;
					label?: string | null;
					platform?: string;
					updated_at?: string;
					url?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'event_communication_channels_event_id_fkey';
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
					accepted_peaceful_use_version: string | null;
					accepted_privacy_at: string | null;
					accepted_privacy_version: string | null;
					accepted_terms_at: string | null;
					accepted_terms_version: string | null;
					created_at: string;
					legal_organization_name: string | null;
					organizer_id: string;
					user_id: string;
				};
				Insert: {
					accepted_peaceful_use_at?: string | null;
					accepted_peaceful_use_version?: string | null;
					accepted_privacy_at?: string | null;
					accepted_privacy_version?: string | null;
					accepted_terms_at?: string | null;
					accepted_terms_version?: string | null;
					created_at?: string;
					legal_organization_name?: string | null;
					organizer_id: string;
					user_id: string;
				};
				Update: {
					accepted_peaceful_use_at?: string | null;
					accepted_peaceful_use_version?: string | null;
					accepted_privacy_at?: string | null;
					accepted_privacy_version?: string | null;
					accepted_terms_at?: string | null;
					accepted_terms_version?: string | null;
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
				Row: { created_at: string; id: string; role: string; updated_at: string };
				Insert: { created_at?: string; id: string; role?: string; updated_at?: string };
				Update: { created_at?: string; id?: string; role?: string; updated_at?: string };
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
				Returns: { event_id: string; going_count: number; interested_count: number }[];
			};
			get_concern_results: {
				Args: { p_concern_ids?: string[] };
				Returns: { concern_id: string; level: number; response_count: number }[];
			};
			get_pulso_participant_count: { Args: never; Returns: number };
			set_concern_response: {
				Args: { p_concern_id: string; p_level: number };
				Returns: undefined;
			};
			is_moderator_or_admin: { Args: never; Returns: boolean };
			purge_old_attendance_rate_limits: { Args: never; Returns: undefined };
			purge_old_attendance_responses: { Args: never; Returns: undefined };
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

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never) = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never) = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never) = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never) = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {}
	}
} as const;
