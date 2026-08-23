export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      actions: {
        Row: {
          category: string | null;
          completed_at: string | null;
          created_at: string;
          description: string;
          estimated_minutes: number | null;
          id: string;
          sort_order: number | null;
          track_id: string;
        };
        Insert: {
          category?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description: string;
          estimated_minutes?: number | null;
          id?: string;
          sort_order?: number | null;
          track_id: string;
        };
        Update: {
          category?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string;
          estimated_minutes?: number | null;
          id?: string;
          sort_order?: number | null;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "actions_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      albums: {
        Row: {
          cover_image_url: string | null;
          created_at: string;
          genre: string | null;
          id: string;
          is_active: boolean;
          owner_id: string;
          sort_order: number;
          start_date: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          cover_image_url?: string | null;
          created_at?: string;
          genre?: string | null;
          id?: string;
          is_active?: boolean;
          owner_id: string;
          sort_order?: number;
          start_date?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          cover_image_url?: string | null;
          created_at?: string;
          genre?: string | null;
          id?: string;
          is_active?: boolean;
          owner_id?: string;
          sort_order?: number;
          start_date?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_recurrences: {
        Row: {
          active_from: string;
          active_until: string | null;
          created_at: string;
          duration_minutes: number;
          id: string;
          owner_id: string;
          session_type_id: string | null;
          start_time: string;
          template_id: string | null;
          track_id: string | null;
          weekday: number;
        };
        Insert: {
          active_from?: string;
          active_until?: string | null;
          created_at?: string;
          duration_minutes: number;
          id?: string;
          owner_id: string;
          session_type_id?: string | null;
          start_time: string;
          template_id?: string | null;
          track_id?: string | null;
          weekday: number;
        };
        Update: {
          active_from?: string;
          active_until?: string | null;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          owner_id?: string;
          session_type_id?: string | null;
          start_time?: string;
          template_id?: string | null;
          track_id?: string | null;
          weekday?: number;
        };
        Relationships: [];
      };
      session_template_todos: {
        Row: {
          description: string;
          id: string;
          sort_order: number;
          template_id: string;
        };
        Insert: {
          description: string;
          id?: string;
          sort_order?: number;
          template_id: string;
        };
        Update: {
          description?: string;
          id?: string;
          sort_order?: number;
          template_id?: string;
        };
        Relationships: [];
      };
      session_templates: {
        Row: {
          created_at: string;
          default_duration_minutes: number;
          default_notes_md: string | null;
          id: string;
          name: string;
          owner_id: string;
          session_type_id: string | null;
        };
        Insert: {
          created_at?: string;
          default_duration_minutes?: number;
          default_notes_md?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          session_type_id?: string | null;
        };
        Update: {
          created_at?: string;
          default_duration_minutes?: number;
          default_notes_md?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          session_type_id?: string | null;
        };
        Relationships: [];
      };
      session_activities: {
        Row: {
          activity_key: string;
          created_at: string;
          id: string;
          minutes: number;
          note: string | null;
          session_id: string;
        };
        Insert: {
          activity_key: string;
          created_at?: string;
          id?: string;
          minutes?: number;
          note?: string | null;
          session_id: string;
        };
        Update: {
          activity_key?: string;
          created_at?: string;
          id?: string;
          minutes?: number;
          note?: string | null;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_activities_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      session_todos: {
        Row: {
          carried_from: string | null;
          created_at: string;
          description: string;
          done: boolean;
          done_at: string | null;
          id: string;
          session_id: string;
          sort_order: number;
        };
        Insert: {
          carried_from?: string | null;
          created_at?: string;
          description: string;
          done?: boolean;
          done_at?: string | null;
          id?: string;
          session_id: string;
          sort_order?: number;
        };
        Update: {
          carried_from?: string | null;
          created_at?: string;
          description?: string;
          done?: boolean;
          done_at?: string | null;
          id?: string;
          session_id?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      session_types: {
        Row: {
          color: string;
          created_at: string;
          icon: string | null;
          id: string;
          is_archived: boolean;
          name: string;
          owner_id: string;
          requires_track: boolean;
          sort_order: number;
        };
        Insert: {
          color: string;
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_archived?: boolean;
          name: string;
          owner_id: string;
          requires_track?: boolean;
          sort_order?: number;
        };
        Update: {
          color?: string;
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_archived?: boolean;
          name?: string;
          owner_id?: string;
          requires_track?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          action_id: string | null;
          created_at: string;
          duration_seconds: number | null;
          ended_at: string | null;
          energy_rating: number | null;
          enjoyment_rating: number | null;
          id: string;
          improved: string | null;
          notes_md: string | null;
          planned_end: string | null;
          planned_start: string | null;
          progress_impact_rating: number | null;
          recurrence_id: string | null;
          session_type_id: string | null;
          started_at: string | null;
          status: string;
          still_broken: string | null;
          template_id: string | null;
          track_id: string | null;
        };
        Insert: {
          action_id?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          ended_at?: string | null;
          energy_rating?: number | null;
          enjoyment_rating?: number | null;
          id?: string;
          improved?: string | null;
          notes_md?: string | null;
          planned_end?: string | null;
          planned_start?: string | null;
          progress_impact_rating?: number | null;
          recurrence_id?: string | null;
          session_type_id?: string | null;
          started_at?: string | null;
          status?: string;
          still_broken?: string | null;
          template_id?: string | null;
          track_id?: string | null;
        };
        Update: {
          action_id?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          ended_at?: string | null;
          energy_rating?: number | null;
          enjoyment_rating?: number | null;
          id?: string;
          improved?: string | null;
          notes_md?: string | null;
          planned_end?: string | null;
          planned_start?: string | null;
          progress_impact_rating?: number | null;
          recurrence_id?: string | null;
          session_type_id?: string | null;
          started_at?: string | null;
          status?: string;
          still_broken?: string | null;
          template_id?: string | null;
          track_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_action_id_fkey";
            columns: ["action_id"];
            isOneToOne: false;
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      track_finishing_steps: {
        Row: {
          completed_at: string | null;
          step_key: string;
          track_id: string;
        };
        Insert: {
          completed_at?: string | null;
          step_key: string;
          track_id: string;
        };
        Update: {
          completed_at?: string | null;
          step_key?: string;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "track_finishing_steps_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      track_stages: {
        Row: {
          complete: boolean;
          percent: number | null;
          stage_key: string;
          track_id: string;
        };
        Insert: {
          complete?: boolean;
          percent?: number | null;
          stage_key: string;
          track_id: string;
        };
        Update: {
          complete?: boolean;
          percent?: number | null;
          stage_key?: string;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "track_stages_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      library_loop_stacks: {
        Row: {
          artwork_url: string | null;
          bars: number | null;
          bpm: number | null;
          components: Json;
          created_at: string;
          favorite: boolean;
          id: string;
          music_key: string | null;
          name: string;
          notes: string;
          owner_id: string;
          preview_path: string | null;
          source_path: string | null;
          source_project: string | null;
          updated_at: string;
        };
        Insert: {
          artwork_url?: string | null;
          bars?: number | null;
          bpm?: number | null;
          components?: Json;
          created_at?: string;
          favorite?: boolean;
          id?: string;
          music_key?: string | null;
          name: string;
          notes?: string;
          owner_id: string;
          preview_path?: string | null;
          source_path?: string | null;
          source_project?: string | null;
          updated_at?: string;
        };
        Update: {
          artwork_url?: string | null;
          bars?: number | null;
          bpm?: number | null;
          components?: Json;
          created_at?: string;
          favorite?: boolean;
          id?: string;
          music_key?: string | null;
          name?: string;
          notes?: string;
          owner_id?: string;
          preview_path?: string | null;
          source_path?: string | null;
          source_project?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      library_presets: {
        Row: {
          artwork_url: string | null;
          category: string;
          core: boolean;
          created_at: string;
          favorite: boolean;
          id: string;
          name: string;
          notes: string;
          owner_id: string;
          plugin: string | null;
          preset_path: string | null;
          preview_path: string | null;
          source_project: string | null;
          updated_at: string;
        };
        Insert: {
          artwork_url?: string | null;
          category?: string;
          core?: boolean;
          created_at?: string;
          favorite?: boolean;
          id?: string;
          name: string;
          notes?: string;
          owner_id: string;
          plugin?: string | null;
          preset_path?: string | null;
          preview_path?: string | null;
          source_project?: string | null;
          updated_at?: string;
        };
        Update: {
          artwork_url?: string | null;
          category?: string;
          core?: boolean;
          created_at?: string;
          favorite?: boolean;
          id?: string;
          name?: string;
          notes?: string;
          owner_id?: string;
          plugin?: string | null;
          preset_path?: string | null;
          preview_path?: string | null;
          source_project?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      library_collections: {
        Row: {
          artwork_url: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string;
          position: number;
          updated_at: string;
        };
        Insert: {
          artwork_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          position?: number;
          updated_at?: string;
        };
        Update: {
          artwork_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      library_collection_items: {
        Row: {
          collection_id: string;
          created_at: string;
          id: string;
          loop_stack_id: string | null;
          position: number;
          preset_id: string | null;
        };
        Insert: {
          collection_id: string;
          created_at?: string;
          id?: string;
          loop_stack_id?: string | null;
          position?: number;
          preset_id?: string | null;
        };
        Update: {
          collection_id?: string;
          created_at?: string;
          id?: string;
          loop_stack_id?: string | null;
          position?: number;
          preset_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "library_collection_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "library_collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_collection_items_loop_stack_id_fkey";
            columns: ["loop_stack_id"];
            isOneToOne: false;
            referencedRelation: "library_loop_stacks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_collection_items_preset_id_fkey";
            columns: ["preset_id"];
            isOneToOne: false;
            referencedRelation: "library_presets";
            referencedColumns: ["id"];
          },
        ];
      };

      resources: {
        Row: {
          bookmarked: boolean;
          category_id: string;
          content: string | null;
          created_at: string;
          description: string;
          featured: boolean;
          id: string;
          owner_id: string;
          read_minutes: number;
          source_kind: string;
          storage_path: string | null;
          thumbnail_url: string | null;
          title: string;
          type: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          bookmarked?: boolean;
          category_id: string;
          content?: string | null;
          created_at?: string;
          description?: string;
          featured?: boolean;
          id?: string;
          owner_id: string;
          read_minutes?: number;
          source_kind: string;
          storage_path?: string | null;
          thumbnail_url?: string | null;
          title: string;
          type: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          bookmarked?: boolean;
          category_id?: string;
          content?: string | null;
          created_at?: string;
          description?: string;
          featured?: boolean;
          id?: string;
          owner_id?: string;
          read_minutes?: number;
          source_kind?: string;
          storage_path?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          type?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      suno_candidates: {
        Row: {
          created_at: string;
          decision: string;
          decision_note: string | null;
          experiment_id: string;
          id: string;
          mine_timestamp_end: number | null;
          mine_timestamp_start: number | null;
          version_id: string | null;
        };
        Insert: {
          created_at?: string;
          decision?: string;
          decision_note?: string | null;
          experiment_id: string;
          id?: string;
          mine_timestamp_end?: number | null;
          mine_timestamp_start?: number | null;
          version_id?: string | null;
        };
        Update: {
          created_at?: string;
          decision?: string;
          decision_note?: string | null;
          experiment_id?: string;
          id?: string;
          mine_timestamp_end?: number | null;
          mine_timestamp_start?: number | null;
          version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "suno_candidates_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "suno_experiments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suno_candidates_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "track_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      suno_experiments: {
        Row: {
          action_id: string | null;
          closed_at: string | null;
          created_at: string;
          external_job_id: string | null;
          goal: string;
          id: string;
          outcome_note: string | null;
          owner_id: string;
          prompt: string | null;
          source_version_id: string | null;
          status: string;
          track_id: string;
        };
        Insert: {
          action_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          external_job_id?: string | null;
          goal: string;
          id?: string;
          outcome_note?: string | null;
          owner_id: string;
          prompt?: string | null;
          source_version_id?: string | null;
          status?: string;
          track_id: string;
        };
        Update: {
          action_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          external_job_id?: string | null;
          goal?: string;
          id?: string;
          outcome_note?: string | null;
          owner_id?: string;
          prompt?: string | null;
          source_version_id?: string | null;
          status?: string;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suno_experiments_action_id_fkey";
            columns: ["action_id"];
            isOneToOne: false;
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suno_experiments_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "track_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suno_experiments_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      track_versions: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          experiment_id: string | null;
          id: string;
          kind: string;
          label: string;
          notes: string | null;
          parent_version_id: string | null;
          review_status: string;
          source: string;
          storage_path: string;
          suno_url: string | null;
          track_id: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          experiment_id?: string | null;
          id?: string;
          kind?: string;
          label: string;
          notes?: string | null;
          parent_version_id?: string | null;
          review_status?: string;
          source?: string;
          storage_path: string;
          suno_url?: string | null;
          track_id: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          experiment_id?: string | null;
          id?: string;
          kind?: string;
          label?: string;
          notes?: string | null;
          parent_version_id?: string | null;
          review_status?: string;
          source?: string;
          storage_path?: string;
          suno_url?: string | null;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "track_versions_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "suno_experiments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "track_versions_parent_version_id_fkey";
            columns: ["parent_version_id"];
            isOneToOne: false;
            referencedRelation: "track_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "track_versions_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      tracks: {
        Row: {
          album_id: string | null;
          als_file_path: string | null;
          bpm: number | null;
          cover_image_url: string | null;
          created_at: string;
          id: string;
          is_focus: boolean;
          last_worked_at: string | null;
          name: string;
          notes: string;
          owner_id: string;
          song_key: string | null;
          status: string;
          suno_status: string;
          tags: string[];
          updated_at: string;
        };
        Insert: {
          album_id?: string | null;
          als_file_path?: string | null;
          bpm?: number | null;
          cover_image_url?: string | null;
          created_at?: string;
          id?: string;
          is_focus?: boolean;
          last_worked_at?: string | null;
          name: string;
          notes?: string;
          owner_id: string;
          song_key?: string | null;
          status: string;
          suno_status?: string;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          album_id?: string | null;
          als_file_path?: string | null;
          bpm?: number | null;
          cover_image_url?: string | null;
          created_at?: string;
          id?: string;
          is_focus?: boolean;
          last_worked_at?: string | null;
          name?: string;
          notes?: string;
          owner_id?: string;
          song_key?: string | null;
          status?: string;
          suno_status?: string;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracks_album_id_fkey";
            columns: ["album_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_reviews: {
        Row: {
          created_at: string;
          intention: string;
          owner_id: string;
          reflection: string;
          updated_at: string;
          week_start: string;
        };
        Insert: {
          created_at?: string;
          intention?: string;
          owner_id: string;
          reflection?: string;
          updated_at?: string;
          week_start: string;
        };
        Update: {
          created_at?: string;
          intention?: string;
          owner_id?: string;
          reflection?: string;
          updated_at?: string;
          week_start?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
