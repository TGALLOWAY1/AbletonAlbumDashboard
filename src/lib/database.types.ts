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
          is_primary: boolean;
          track_id: string;
        };
        Insert: {
          category?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description: string;
          estimated_minutes?: number | null;
          id?: string;
          is_primary?: boolean;
          track_id: string;
        };
        Update: {
          category?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string;
          estimated_minutes?: number | null;
          id?: string;
          is_primary?: boolean;
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
      bottlenecks: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          resolved_at: string | null;
          track_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          is_active?: boolean;
          resolved_at?: string | null;
          track_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          resolved_at?: string | null;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bottlenecks_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
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
          new_bottleneck: string | null;
          notes_md: string | null;
          planned_end: string | null;
          planned_start: string | null;
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
          new_bottleneck?: string | null;
          notes_md?: string | null;
          planned_end?: string | null;
          planned_start?: string | null;
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
          new_bottleneck?: string | null;
          notes_md?: string | null;
          planned_end?: string | null;
          planned_start?: string | null;
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
      instruments: {
        Row: {
          created_at: string;
          id: string;
          instrument_type: string | null;
          name: string;
          notes: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          instrument_type?: string | null;
          name: string;
          notes?: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          instrument_type?: string | null;
          name?: string;
          notes?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      samples: {
        Row: {
          created_at: string;
          favorite_dest: string | null;
          favorited_at: string | null;
          id: string;
          original_file_name: string;
          original_path: string;
          owner_id: string;
          review_status: string;
          sample_key: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          favorite_dest?: string | null;
          favorited_at?: string | null;
          id?: string;
          original_file_name: string;
          original_path: string;
          owner_id: string;
          review_status?: string;
          sample_key: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          favorite_dest?: string | null;
          favorited_at?: string | null;
          id?: string;
          original_file_name?: string;
          original_path?: string;
          owner_id?: string;
          review_status?: string;
          sample_key?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      track_versions: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          id: string;
          label: string;
          storage_path: string;
          track_id: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          label: string;
          storage_path: string;
          track_id: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          label?: string;
          storage_path?: string;
          track_id?: string;
        };
        Relationships: [
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
