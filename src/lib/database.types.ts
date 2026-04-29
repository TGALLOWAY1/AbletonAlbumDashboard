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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
