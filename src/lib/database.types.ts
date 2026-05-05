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
      album_settings: {
        Row: {
          cover_image_url: string | null;
          owner_id: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          cover_image_url?: string | null;
          owner_id: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          cover_image_url?: string | null;
          owner_id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
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
      sessions: {
        Row: {
          action_id: string | null;
          created_at: string;
          duration_seconds: number | null;
          ended_at: string;
          id: string;
          improved: string | null;
          new_bottleneck: string | null;
          started_at: string;
          still_broken: string | null;
          track_id: string;
        };
        Insert: {
          action_id?: string | null;
          created_at?: string;
          ended_at: string;
          id?: string;
          improved?: string | null;
          new_bottleneck?: string | null;
          started_at: string;
          still_broken?: string | null;
          track_id: string;
        };
        Update: {
          action_id?: string | null;
          created_at?: string;
          ended_at?: string;
          id?: string;
          improved?: string | null;
          new_bottleneck?: string | null;
          started_at?: string;
          still_broken?: string | null;
          track_id?: string;
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
          cover_image_url: string | null;
          created_at: string;
          id: string;
          last_worked_at: string | null;
          name: string;
          notes: string;
          owner_id: string;
          status: string;
          tags: string[];
          updated_at: string;
        };
        Insert: {
          cover_image_url?: string | null;
          created_at?: string;
          id?: string;
          last_worked_at?: string | null;
          name: string;
          notes?: string;
          owner_id: string;
          status: string;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          cover_image_url?: string | null;
          created_at?: string;
          id?: string;
          last_worked_at?: string | null;
          name?: string;
          notes?: string;
          owner_id?: string;
          status?: string;
          tags?: string[];
          updated_at?: string;
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
