/**
 * Tipos generados automáticamente a partir del esquema remoto real con
 * `supabase gen types typescript --project-id <tu-project-ref>`.
 * No editar a mano: si el esquema cambia, añade una migración nueva y
 * vuelve a generar este archivo.
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
			attendance_rate_limits: {
				Row: {
					called_at: string;
					dedup_token: string;
					id: number;
				};
				Insert: {
					called_at?: string;
					dedup_token: string;
					id?: never;
				};
				Update: {
					called_at?: string;
					dedup_token?: string;
					id?: never;
				};
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
				Row: {
					concern_id: string;
					created_at: string;
					event_id: string;
				};
				Insert: {
					concern_id: string;
					created_at?: string;
					event_id: string;
				};
				Update: {
					concern_id?: string;
					created_at?: string;
					event_id?: string;
				};
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
			concern_listening_completions: {
				Row: {
					completed_at: string;
					round_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					completed_at?: string;
					round_id: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					completed_at?: string;
					round_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'concern_listening_completions_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'concern_listening_rounds';
						referencedColumns: ['id'];
					}
				];
			};
			concern_listening_contexts: {
				Row: {
					area_type: string | null;
					community: string | null;
					created_at: string;
					housing_situation: string | null;
					id: string;
					round_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					area_type?: string | null;
					community?: string | null;
					created_at?: string;
					housing_situation?: string | null;
					id?: string;
					round_id: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					area_type?: string | null;
					community?: string | null;
					created_at?: string;
					housing_situation?: string | null;
					id?: string;
					round_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'concern_listening_contexts_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'concern_listening_rounds';
						referencedColumns: ['id'];
					}
				];
			};
			concern_listening_responses: {
				Row: {
					cause_code: string | null;
					cause_other: string | null;
					comment: string | null;
					created_at: string;
					evolution: string | null;
					id: string;
					option_code: string;
					personal_relation: string | null;
					rank: number | null;
					round_id: string;
					severity: string | null;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					cause_code?: string | null;
					cause_other?: string | null;
					comment?: string | null;
					created_at?: string;
					evolution?: string | null;
					id?: string;
					option_code: string;
					personal_relation?: string | null;
					rank?: number | null;
					round_id: string;
					severity?: string | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					cause_code?: string | null;
					cause_other?: string | null;
					comment?: string | null;
					created_at?: string;
					evolution?: string | null;
					id?: string;
					option_code?: string;
					personal_relation?: string | null;
					rank?: number | null;
					round_id?: string;
					severity?: string | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'concern_listening_responses_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'concern_listening_rounds';
						referencedColumns: ['id'];
					}
				];
			};
			concern_listening_rounds: {
				Row: {
					category: string;
					closes_at: string | null;
					created_at: string;
					created_by: string | null;
					id: string;
					opens_at: string | null;
					status: string;
					updated_at: string;
					version_label: string;
				};
				Insert: {
					category: string;
					closes_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					opens_at?: string | null;
					status?: string;
					updated_at?: string;
					version_label: string;
				};
				Update: {
					category?: string;
					closes_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					opens_at?: string | null;
					status?: string;
					updated_at?: string;
					version_label?: string;
				};
				Relationships: [];
			};
			concern_listening_survey_responses: {
				Row: {
					area_type: string | null;
					commitment_most_difficult_id: string | null;
					commitment_most_urgent_id: string | null;
					community: string | null;
					created_at: string;
					id: string;
					main_cause: string | null;
					missing_improvement: string | null;
					other_problem_text: string | null;
					prioritized_measure_ids: string[];
					problems: string[];
					round_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					area_type?: string | null;
					commitment_most_difficult_id?: string | null;
					commitment_most_urgent_id?: string | null;
					community?: string | null;
					created_at?: string;
					id?: string;
					main_cause?: string | null;
					missing_improvement?: string | null;
					other_problem_text?: string | null;
					prioritized_measure_ids?: string[];
					problems?: string[];
					round_id: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					area_type?: string | null;
					commitment_most_difficult_id?: string | null;
					commitment_most_urgent_id?: string | null;
					community?: string | null;
					created_at?: string;
					id?: string;
					main_cause?: string | null;
					missing_improvement?: string | null;
					other_problem_text?: string | null;
					prioritized_measure_ids?: string[];
					problems?: string[];
					round_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'concern_listening_survey_resp_commitment_most_difficult_id_fkey';
						columns: ['commitment_most_difficult_id'];
						isOneToOne: false;
						referencedRelation: 'topic_commitments';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'concern_listening_survey_respons_commitment_most_urgent_id_fkey';
						columns: ['commitment_most_urgent_id'];
						isOneToOne: false;
						referencedRelation: 'topic_commitments';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'concern_listening_survey_responses_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'concern_listening_rounds';
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
			general_participation_responses: {
				Row: {
					created_at: string;
					general_position: string;
					id: string;
					investment_opinion: string | null;
					measures_considered_count: number;
					pace_preference: string | null;
					round_id: string;
					unaddressed_problem: string | null;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					general_position: string;
					id?: string;
					investment_opinion?: string | null;
					measures_considered_count?: number;
					pace_preference?: string | null;
					round_id: string;
					unaddressed_problem?: string | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					general_position?: string;
					id?: string;
					investment_opinion?: string | null;
					measures_considered_count?: number;
					pace_preference?: string | null;
					round_id?: string;
					unaddressed_problem?: string | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'general_participation_responses_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'participation_rounds';
						referencedColumns: ['id'];
					}
				];
			};
			ine_municipalities: {
				Row: {
					ine_code: string;
					name: string;
					province_code: string;
				};
				Insert: {
					ine_code: string;
					name: string;
					province_code: string;
				};
				Update: {
					ine_code?: string;
					name?: string;
					province_code?: string;
				};
				Relationships: [];
			};
			measure_participation_responses: {
				Row: {
					comment: string | null;
					created_at: string;
					id: string;
					measure_id: string;
					position_value: string;
					quick_change: string | null;
					reason_code: string | null;
					reason_other: string | null;
					round_id: string;
					updated_at: string;
					urgency: string | null;
					user_id: string;
				};
				Insert: {
					comment?: string | null;
					created_at?: string;
					id?: string;
					measure_id: string;
					position_value: string;
					quick_change?: string | null;
					reason_code?: string | null;
					reason_other?: string | null;
					round_id: string;
					updated_at?: string;
					urgency?: string | null;
					user_id: string;
				};
				Update: {
					comment?: string | null;
					created_at?: string;
					id?: string;
					measure_id?: string;
					position_value?: string;
					quick_change?: string | null;
					reason_code?: string | null;
					reason_other?: string | null;
					round_id?: string;
					updated_at?: string;
					urgency?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'measure_participation_responses_measure_id_fkey';
						columns: ['measure_id'];
						isOneToOne: false;
						referencedRelation: 'topic_measures';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'measure_participation_responses_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'participation_rounds';
						referencedColumns: ['id'];
					}
				];
			};
			measure_responses: {
				Row: {
					created_at: string;
					id: string;
					measure_id: string;
					priority: string | null;
					stance: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					measure_id: string;
					priority?: string | null;
					stance: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					measure_id?: string;
					priority?: string | null;
					stance?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'measure_responses_measure_id_fkey';
						columns: ['measure_id'];
						isOneToOne: false;
						referencedRelation: 'topic_measures';
						referencedColumns: ['id'];
					}
				];
			};
			next_block_vote_rounds: {
				Row: {
					closes_at: string | null;
					created_at: string;
					created_by: string | null;
					id: string;
					opens_at: string | null;
					status: string;
					updated_at: string;
					version_label: string;
				};
				Insert: {
					closes_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					opens_at?: string | null;
					status?: string;
					updated_at?: string;
					version_label: string;
				};
				Update: {
					closes_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					opens_at?: string | null;
					status?: string;
					updated_at?: string;
					version_label?: string;
				};
				Relationships: [];
			};
			next_block_votes: {
				Row: {
					created_at: string;
					id: string;
					option_code: string;
					round_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					option_code: string;
					round_id: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					option_code?: string;
					round_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'next_block_votes_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'next_block_vote_rounds';
						referencedColumns: ['id'];
					}
				];
			};
			open_voice_contributions: {
				Row: {
					content: string;
					created_at: string;
					id: string;
					moderation_status: string;
					privacy_notice_version: string | null;
					scope_municipality_ine_code: string | null;
					scope_type: string;
					scope_value: string | null;
					status: string;
					updated_at: string;
					user_id: string;
					withdrawn_at: string | null;
				};
				Insert: {
					content: string;
					created_at?: string;
					id?: string;
					moderation_status?: string;
					privacy_notice_version?: string | null;
					scope_municipality_ine_code?: string | null;
					scope_type: string;
					scope_value?: string | null;
					status?: string;
					updated_at?: string;
					user_id: string;
					withdrawn_at?: string | null;
				};
				Update: {
					content?: string;
					created_at?: string;
					id?: string;
					moderation_status?: string;
					privacy_notice_version?: string | null;
					scope_municipality_ine_code?: string | null;
					scope_type?: string;
					scope_value?: string | null;
					status?: string;
					updated_at?: string;
					user_id?: string;
					withdrawn_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'open_voice_contributions_scope_municipality_ine_code_fkey';
						columns: ['scope_municipality_ine_code'];
						isOneToOne: false;
						referencedRelation: 'ine_municipalities';
						referencedColumns: ['ine_code'];
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
			participant_contexts: {
				Row: {
					community: string | null;
					created_at: string;
					housing_situation: string | null;
					id: string;
					round_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					community?: string | null;
					created_at?: string;
					housing_situation?: string | null;
					id?: string;
					round_id: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					community?: string | null;
					created_at?: string;
					housing_situation?: string | null;
					id?: string;
					round_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'participant_contexts_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'participation_rounds';
						referencedColumns: ['id'];
					}
				];
			};
			participation_rounds: {
				Row: {
					closes_at: string | null;
					created_at: string;
					created_by: string | null;
					id: string;
					opens_at: string | null;
					status: string;
					topic_id: string;
					updated_at: string;
					version_label: string;
				};
				Insert: {
					closes_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					opens_at?: string | null;
					status?: string;
					topic_id: string;
					updated_at?: string;
					version_label: string;
				};
				Update: {
					closes_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					opens_at?: string | null;
					status?: string;
					topic_id?: string;
					updated_at?: string;
					version_label?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'participation_rounds_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
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
			response_priorities: {
				Row: {
					created_at: string;
					id: string;
					measure_id: string;
					rank: number;
					round_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					measure_id: string;
					rank: number;
					round_id: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					measure_id?: string;
					rank?: number;
					round_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'response_priorities_measure_id_fkey';
						columns: ['measure_id'];
						isOneToOne: false;
						referencedRelation: 'topic_measures';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'response_priorities_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'participation_rounds';
						referencedColumns: ['id'];
					}
				];
			};
			topic_budget_lines: {
				Row: {
					color_token: string;
					created_at: string;
					description: string | null;
					id: string;
					max_amount: number;
					min_amount: number;
					name: string;
					note: string | null;
					sort_order: number;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					color_token: string;
					created_at?: string;
					description?: string | null;
					id?: string;
					max_amount: number;
					min_amount: number;
					name: string;
					note?: string | null;
					sort_order?: number;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					color_token?: string;
					created_at?: string;
					description?: string | null;
					id?: string;
					max_amount?: number;
					min_amount?: number;
					name?: string;
					note?: string | null;
					sort_order?: number;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_budget_lines_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_budget_scenarios: {
				Row: {
					created_at: string;
					description: string | null;
					id: string;
					key: string;
					label: string;
					sort_order: number;
					topic_id: string;
					total: number;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					id?: string;
					key: string;
					label: string;
					sort_order?: number;
					topic_id: string;
					total: number;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					id?: string;
					key?: string;
					label?: string;
					sort_order?: number;
					topic_id?: string;
					total?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_budget_scenarios_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_budget_timeline: {
				Row: {
					created_at: string;
					id: string;
					is_period_average: boolean;
					max_amount: number;
					min_amount: number;
					note: string | null;
					topic_id: string;
					updated_at: string;
					year: number;
				};
				Insert: {
					created_at?: string;
					id?: string;
					is_period_average?: boolean;
					max_amount: number;
					min_amount: number;
					note?: string | null;
					topic_id: string;
					updated_at?: string;
					year: number;
				};
				Update: {
					created_at?: string;
					id?: string;
					is_period_average?: boolean;
					max_amount?: number;
					min_amount?: number;
					note?: string | null;
					topic_id?: string;
					updated_at?: string;
					year?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_budget_timeline_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_commitments: {
				Row: {
					created_at: string;
					description: string;
					id: string;
					sort_order: number;
					title: string;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					description: string;
					id?: string;
					sort_order?: number;
					title: string;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					description?: string;
					id?: string;
					sort_order?: number;
					title?: string;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_commitments_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_concerns: {
				Row: {
					concern_id: string;
					created_at: string;
					sort_order: number;
					topic_id: string;
				};
				Insert: {
					concern_id: string;
					created_at?: string;
					sort_order?: number;
					topic_id: string;
				};
				Update: {
					concern_id?: string;
					created_at?: string;
					sort_order?: number;
					topic_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_concerns_concern_id_fkey';
						columns: ['concern_id'];
						isOneToOne: false;
						referencedRelation: 'concerns';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'topic_concerns_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_data_points: {
				Row: {
					created_at: string;
					explanation: string | null;
					id: string;
					label: string;
					sort_order: number;
					source_id: string | null;
					time_scope: string | null;
					topic_id: string;
					value: string;
				};
				Insert: {
					created_at?: string;
					explanation?: string | null;
					id?: string;
					label: string;
					sort_order?: number;
					source_id?: string | null;
					time_scope?: string | null;
					topic_id: string;
					value: string;
				};
				Update: {
					created_at?: string;
					explanation?: string | null;
					id?: string;
					label?: string;
					sort_order?: number;
					source_id?: string | null;
					time_scope?: string | null;
					topic_id?: string;
					value?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_data_points_source_id_fkey';
						columns: ['source_id'];
						isOneToOne: false;
						referencedRelation: 'topic_sources';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'topic_data_points_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_evaluation_moments: {
				Row: {
					created_at: string;
					description: string;
					frequency_label: string;
					id: string;
					key: string;
					sort_order: number;
					title: string;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					description: string;
					frequency_label: string;
					id?: string;
					key: string;
					sort_order?: number;
					title: string;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					description?: string;
					frequency_label?: string;
					id?: string;
					key?: string;
					sort_order?: number;
					title?: string;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_evaluation_moments_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_measure_alternatives: {
				Row: {
					acknowledged_risks: string | null;
					created_at: string;
					description: string;
					editorial_response: string | null;
					expected_effect: string | null;
					id: string;
					linked_version_label: string | null;
					measure_id: string | null;
					measure_part: string | null;
					proposer_user_id: string;
					reason: string | null;
					reviewed_at: string | null;
					reviewed_by: string | null;
					reviewer_note: string | null;
					round_id: string | null;
					source_url: string | null;
					status: string;
					title: string;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					acknowledged_risks?: string | null;
					created_at?: string;
					description: string;
					editorial_response?: string | null;
					expected_effect?: string | null;
					id?: string;
					linked_version_label?: string | null;
					measure_id?: string | null;
					measure_part?: string | null;
					proposer_user_id: string;
					reason?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					reviewer_note?: string | null;
					round_id?: string | null;
					source_url?: string | null;
					status?: string;
					title: string;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					acknowledged_risks?: string | null;
					created_at?: string;
					description?: string;
					editorial_response?: string | null;
					expected_effect?: string | null;
					id?: string;
					linked_version_label?: string | null;
					measure_id?: string | null;
					measure_part?: string | null;
					proposer_user_id?: string;
					reason?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					reviewer_note?: string | null;
					round_id?: string | null;
					source_url?: string | null;
					status?: string;
					title?: string;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_measure_alternatives_measure_id_fkey';
						columns: ['measure_id'];
						isOneToOne: false;
						referencedRelation: 'topic_measures';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'topic_measure_alternatives_round_id_fkey';
						columns: ['round_id'];
						isOneToOne: false;
						referencedRelation: 'participation_rounds';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'topic_measure_alternatives_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_measure_axes: {
				Row: {
					created_at: string;
					id: string;
					sort_order: number;
					title: string;
					topic_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					sort_order?: number;
					title: string;
					topic_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					sort_order?: number;
					title?: string;
					topic_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_measure_axes_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_measure_change_conditions: {
				Row: {
					created_at: string;
					id: string;
					items: string[];
					key: string;
					sort_order: number;
					title: string;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					items?: string[];
					key: string;
					sort_order?: number;
					title: string;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					items?: string[];
					key?: string;
					sort_order?: number;
					title?: string;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_measure_change_conditions_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_measure_phase_status: {
				Row: {
					created_at: string;
					id: string;
					measure_id: string;
					phase_id: string;
					status: string;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					measure_id: string;
					phase_id: string;
					status: string;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					measure_id?: string;
					phase_id?: string;
					status?: string;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_measure_phase_status_measure_id_fkey';
						columns: ['measure_id'];
						isOneToOne: false;
						referencedRelation: 'topic_measures';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'topic_measure_phase_status_phase_id_fkey';
						columns: ['phase_id'];
						isOneToOne: false;
						referencedRelation: 'topic_timeline_phases';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'topic_measure_phase_status_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_measure_sources: {
				Row: {
					created_at: string;
					measure_id: string;
					source_id: string;
				};
				Insert: {
					created_at?: string;
					measure_id: string;
					source_id: string;
				};
				Update: {
					created_at?: string;
					measure_id?: string;
					source_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_measure_sources_measure_id_fkey';
						columns: ['measure_id'];
						isOneToOne: false;
						referencedRelation: 'topic_measures';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'topic_measure_sources_source_id_fkey';
						columns: ['source_id'];
						isOneToOne: false;
						referencedRelation: 'topic_sources';
						referencedColumns: ['id'];
					}
				];
			};
			topic_measures: {
				Row: {
					arguments_for: string | null;
					axis_id: string | null;
					created_at: string;
					estimated_cost: string | null;
					estimated_cost_max: number | null;
					estimated_cost_min: number | null;
					explanation: string;
					how_it_works: string | null;
					id: string;
					indicators: string[];
					is_published: boolean;
					problem_addressed: string | null;
					responsible_scope: string | null;
					risks: string | null;
					safeguard: string | null;
					sort_order: number;
					summary: string | null;
					timeframe: string | null;
					title: string;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					arguments_for?: string | null;
					axis_id?: string | null;
					created_at?: string;
					estimated_cost?: string | null;
					estimated_cost_max?: number | null;
					estimated_cost_min?: number | null;
					explanation?: string;
					how_it_works?: string | null;
					id?: string;
					indicators?: string[];
					is_published?: boolean;
					problem_addressed?: string | null;
					responsible_scope?: string | null;
					risks?: string | null;
					safeguard?: string | null;
					sort_order?: number;
					summary?: string | null;
					timeframe?: string | null;
					title: string;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					arguments_for?: string | null;
					axis_id?: string | null;
					created_at?: string;
					estimated_cost?: string | null;
					estimated_cost_max?: number | null;
					estimated_cost_min?: number | null;
					explanation?: string;
					how_it_works?: string | null;
					id?: string;
					indicators?: string[];
					is_published?: boolean;
					problem_addressed?: string | null;
					responsible_scope?: string | null;
					risks?: string | null;
					safeguard?: string | null;
					sort_order?: number;
					summary?: string | null;
					timeframe?: string | null;
					title?: string;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_measures_axis_id_fkey';
						columns: ['axis_id'];
						isOneToOne: false;
						referencedRelation: 'topic_measure_axes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'topic_measures_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_risks: {
				Row: {
					category: string | null;
					created_at: string;
					decision_trigger: string | null;
					description: string | null;
					id: string;
					mitigation: string | null;
					signals: string | null;
					sort_order: number;
					title: string;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					category?: string | null;
					created_at?: string;
					decision_trigger?: string | null;
					description?: string | null;
					id?: string;
					mitigation?: string | null;
					signals?: string | null;
					sort_order?: number;
					title: string;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					category?: string | null;
					created_at?: string;
					decision_trigger?: string | null;
					description?: string | null;
					id?: string;
					mitigation?: string | null;
					signals?: string | null;
					sort_order?: number;
					title?: string;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_risks_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_sources: {
				Row: {
					created_at: string;
					id: string;
					label: string;
					note: string | null;
					sort_order: number;
					topic_id: string;
					url: string | null;
				};
				Insert: {
					created_at?: string;
					id?: string;
					label: string;
					note?: string | null;
					sort_order?: number;
					topic_id: string;
					url?: string | null;
				};
				Update: {
					created_at?: string;
					id?: string;
					label?: string;
					note?: string | null;
					sort_order?: number;
					topic_id?: string;
					url?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_sources_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_timeline_phases: {
				Row: {
					created_at: string;
					description: string;
					id: string;
					items: string[];
					sort_order: number;
					title: string;
					topic_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					description?: string;
					id?: string;
					items?: string[];
					sort_order?: number;
					title: string;
					topic_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					description?: string;
					id?: string;
					items?: string[];
					sort_order?: number;
					title?: string;
					topic_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_timeline_phases_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topic_versions: {
				Row: {
					id: string;
					note: string | null;
					published_at: string;
					published_by: string | null;
					topic_id: string;
					version_label: string;
				};
				Insert: {
					id?: string;
					note?: string | null;
					published_at?: string;
					published_by?: string | null;
					topic_id: string;
					version_label: string;
				};
				Update: {
					id?: string;
					note?: string | null;
					published_at?: string;
					published_by?: string | null;
					topic_id?: string;
					version_label?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'topic_versions_topic_id_fkey';
						columns: ['topic_id'];
						isOneToOne: false;
						referencedRelation: 'topics';
						referencedColumns: ['id'];
					}
				];
			};
			topics: {
				Row: {
					budget_double_count_rules: string[];
					budget_narrative: string | null;
					category: string | null;
					cover_image_url: string | null;
					created_at: string;
					created_by: string | null;
					document_title: string | null;
					evaluation_rules: string | null;
					governance_narrative: string | null;
					id: string;
					investment_gdp_percent: string | null;
					investment_range: string | null;
					problem_intro: string;
					public_notice: string | null;
					published_at: string | null;
					reference_goal: string | null;
					risks_overview: string[];
					slug: string;
					status: string;
					success_indicators: string[];
					summary: string;
					title: string;
					updated_at: string;
					version: string;
				};
				Insert: {
					budget_double_count_rules?: string[];
					budget_narrative?: string | null;
					category?: string | null;
					cover_image_url?: string | null;
					created_at?: string;
					created_by?: string | null;
					document_title?: string | null;
					evaluation_rules?: string | null;
					governance_narrative?: string | null;
					id?: string;
					investment_gdp_percent?: string | null;
					investment_range?: string | null;
					problem_intro?: string;
					public_notice?: string | null;
					published_at?: string | null;
					reference_goal?: string | null;
					risks_overview?: string[];
					slug: string;
					status?: string;
					success_indicators?: string[];
					summary?: string;
					title: string;
					updated_at?: string;
					version?: string;
				};
				Update: {
					budget_double_count_rules?: string[];
					budget_narrative?: string | null;
					category?: string | null;
					cover_image_url?: string | null;
					created_at?: string;
					created_by?: string | null;
					document_title?: string | null;
					evaluation_rules?: string | null;
					governance_narrative?: string | null;
					id?: string;
					investment_gdp_percent?: string | null;
					investment_range?: string | null;
					problem_intro?: string;
					public_notice?: string | null;
					published_at?: string | null;
					reference_goal?: string | null;
					risks_overview?: string[];
					slug?: string;
					status?: string;
					success_indicators?: string[];
					summary?: string;
					title?: string;
					updated_at?: string;
					version?: string;
				};
				Relationships: [];
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
			write_rate_limits: {
				Row: {
					action: string;
					called_at: string;
					id: number;
					user_id: string;
				};
				Insert: {
					action: string;
					called_at?: string;
					id?: never;
					user_id: string;
				};
				Update: {
					action?: string;
					called_at?: string;
					id?: never;
					user_id?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			channel_reports_moderation: {
				Row: {
					channel_id: string | null;
					created_at: string | null;
					details: string | null;
					id: string | null;
					reason: string | null;
					resolved_at: string | null;
					status: string | null;
				};
				Insert: {
					channel_id?: string | null;
					created_at?: string | null;
					details?: string | null;
					id?: string | null;
					reason?: string | null;
					resolved_at?: string | null;
					status?: string | null;
				};
				Update: {
					channel_id?: string | null;
					created_at?: string | null;
					details?: string | null;
					id?: string | null;
					reason?: string | null;
					resolved_at?: string | null;
					status?: string | null;
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
			reports_moderation: {
				Row: {
					created_at: string | null;
					details: string | null;
					event_id: string | null;
					id: string | null;
					reason: string | null;
					resolved_at: string | null;
					status: string | null;
				};
				Insert: {
					created_at?: string | null;
					details?: string | null;
					event_id?: string | null;
					id?: string | null;
					reason?: string | null;
					resolved_at?: string | null;
					status?: string | null;
				};
				Update: {
					created_at?: string | null;
					details?: string | null;
					event_id?: string | null;
					id?: string | null;
					reason?: string | null;
					resolved_at?: string | null;
					status?: string | null;
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
			get_concern_listening_survey_summary: {
				Args: { p_round_id: string };
				Returns: {
					code: string;
					dimension: string;
					response_count: number;
				}[];
			};
			get_concern_listening_survey_territory_breakdown: {
				Args: { p_min_threshold?: number; p_round_id: string };
				Returns: {
					community: string;
					response_count: number;
				}[];
			};
			get_concern_listening_survey_total: {
				Args: { p_round_id: string };
				Returns: number;
			};
			get_concern_results: {
				Args: { p_concern_ids?: string[] };
				Returns: {
					concern_id: string;
					level: number;
					response_count: number;
				}[];
			};
			get_general_participation_results: {
				Args: { p_round_id: string };
				Returns: {
					dimension: string;
					response_count: number;
					value: string;
				}[];
			};
			get_measure_position_counts: {
				Args: { p_measure_ids: string[]; p_round_id: string };
				Returns: {
					measure_id: string;
					position_value: string;
					response_count: number;
				}[];
			};
			get_measure_reason_counts: {
				Args: { p_measure_ids: string[]; p_round_id: string };
				Returns: {
					measure_id: string;
					reason_code: string;
					response_count: number;
				}[];
			};
			get_measure_results: {
				Args: { p_measure_ids?: string[] };
				Returns: {
					measure_id: string;
					response_count: number;
					stance: string;
				}[];
			};
			get_measure_urgency_counts: {
				Args: { p_measure_ids: string[]; p_round_id: string };
				Returns: {
					measure_id: string;
					response_count: number;
					urgency: string;
				}[];
			};
			get_next_block_vote_results: {
				Args: { p_round_id: string };
				Returns: {
					option_code: string;
					vote_count: number;
				}[];
			};
			get_next_block_vote_total: {
				Args: { p_round_id: string };
				Returns: number;
			};
			get_participation_summary: {
				Args: { p_round_id: string };
				Returns: {
					last_updated_at: string;
					proposals_published: number;
					proposals_received: number;
					total_general_responses: number;
					total_measure_responses: number;
					unique_participants: number;
				}[];
			};
			get_priority_results: {
				Args: { p_round_id: string };
				Returns: {
					avg_rank: number;
					measure_id: string;
					times_top3: number;
				}[];
			};
			get_pulso_participant_count: { Args: never; Returns: number };
			is_moderator_or_admin: { Args: never; Returns: boolean };
			purge_old_attendance_rate_limits: { Args: never; Returns: undefined };
			purge_old_attendance_responses: { Args: never; Returns: undefined };
			purge_old_write_rate_limits: { Args: never; Returns: undefined };
			set_attendance: {
				Args: { p_dedup_token: string; p_event_id: string; p_response?: string };
				Returns: undefined;
			};
			set_concern_listening_completed: {
				Args: { p_round_id: string };
				Returns: undefined;
			};
			set_concern_listening_context: {
				Args: {
					p_area_type?: string;
					p_community?: string;
					p_housing_situation?: string;
					p_round_id: string;
				};
				Returns: undefined;
			};
			set_concern_listening_detail: {
				Args: {
					p_cause_code?: string;
					p_cause_other?: string;
					p_comment?: string;
					p_evolution?: string;
					p_option_code: string;
					p_personal_relation?: string;
					p_round_id: string;
					p_severity?: string;
				};
				Returns: undefined;
			};
			set_concern_listening_priorities: {
				Args: { p_option_codes: string[]; p_round_id: string };
				Returns: undefined;
			};
			set_concern_listening_survey_response: {
				Args: {
					p_area_type?: string;
					p_commitment_most_difficult_id?: string;
					p_commitment_most_urgent_id?: string;
					p_community?: string;
					p_main_cause?: string;
					p_missing_improvement?: string;
					p_other_problem_text?: string;
					p_prioritized_measure_ids?: string[];
					p_problems: string[];
					p_round_id: string;
				};
				Returns: undefined;
			};
			set_concern_response: {
				Args: { p_concern_id: string; p_level: number };
				Returns: undefined;
			};
			set_general_participation_response: {
				Args: {
					p_general_position: string;
					p_investment_opinion?: string;
					p_pace_preference?: string;
					p_round_id: string;
					p_unaddressed_problem?: string;
				};
				Returns: undefined;
			};
			set_measure_participation_response: {
				Args: {
					p_comment?: string;
					p_measure_id: string;
					p_position: string;
					p_quick_change?: string;
					p_reason_code?: string;
					p_reason_other?: string;
					p_round_id: string;
					p_urgency?: string;
				};
				Returns: undefined;
			};
			set_measure_response: {
				Args: { p_measure_id: string; p_priority?: string; p_stance: string };
				Returns: undefined;
			};
			set_next_block_vote: {
				Args: { p_option_code: string; p_round_id: string };
				Returns: undefined;
			};
			set_participant_context: {
				Args: {
					p_community?: string;
					p_housing_situation?: string;
					p_round_id: string;
				};
				Returns: undefined;
			};
			set_response_priorities: {
				Args: { p_measure_ids: string[]; p_round_id: string };
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
