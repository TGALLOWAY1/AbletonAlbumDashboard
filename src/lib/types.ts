import type { Database } from "@/lib/database.types";

export type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];
export type StageRow = Database["public"]["Tables"]["track_stages"]["Row"];
export type BottleneckRow = Database["public"]["Tables"]["bottlenecks"]["Row"];
export type ActionRow = Database["public"]["Tables"]["actions"]["Row"];
export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
export type VersionRow = Database["public"]["Tables"]["track_versions"]["Row"];
export type SampleRow = Database["public"]["Tables"]["samples"]["Row"];

export type ReviewStatus =
  | "not_reviewed"
  | "reviewed_not_added"
  | "added_to_favorites";
export type SessionTypeRow =
  Database["public"]["Tables"]["session_types"]["Row"];
export type SessionTodoRow =
  Database["public"]["Tables"]["session_todos"]["Row"];
export type SessionTemplateRow =
  Database["public"]["Tables"]["session_templates"]["Row"];
export type SessionTemplateTodoRow =
  Database["public"]["Tables"]["session_template_todos"]["Row"];
export type SessionRecurrenceRow =
  Database["public"]["Tables"]["session_recurrences"]["Row"];
export type WeeklyReviewRow =
  Database["public"]["Tables"]["weekly_reviews"]["Row"];
export type AlbumRow = Database["public"]["Tables"]["albums"]["Row"];

export type AlbumWithTrackCount = AlbumRow & {
  trackCount: number;
};

export const SESSION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "skipped",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type CalendarSessionRow = SessionRow & {
  session_type: SessionTypeRow | null;
  track: { id: string; name: string; cover_image_url: string | null } | null;
  todos: SessionTodoRow[];
};

export const TRACK_STATUSES = [
  "active",
  "backlog",
  "completed",
  "archived",
] as const;
export type TrackStatus = (typeof TRACK_STATUSES)[number];

export const STAGE_KEYS = [
  "idea",
  "sound_design",
  "arrangement",
  "mixing",
  "mastering",
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export const STAGE_LABELS: Record<StageKey, string> = {
  idea: "Idea / Concept",
  sound_design: "Sound Design",
  arrangement: "Arrangement",
  mixing: "Mixing",
  mastering: "Mastering",
};

export const BOTTLENECK_CATEGORIES = [
  "composition",
  "sound_design",
  "arrangement",
  "mixing",
  "mastering",
  "organization",
  "other",
] as const;
export type BottleneckCategory = (typeof BOTTLENECK_CATEGORIES)[number];

export const BOTTLENECK_LABELS: Record<string, string> = {
  composition: "Composition",
  sound_design: "Sound Design",
  arrangement: "Arrangement",
  mixing: "Mixing",
  mastering: "Mastering",
  organization: "Organization",
  other: "Other",
  // Legacy value kept renderable for rows stored before the enum expanded.
  mix: "Mixing",
};

export const MAX_ACTIVE_TRACKS = 5;

// Aggregate shape used by dashboard + detail views.
export type TrackWithDetails = TrackRow & {
  stages: StageRow[];
  bottleneck: BottleneckRow | null;
  primaryAction: ActionRow | null;
  openTaskCount: number;
  completedTaskCount: number;
  estMinutesRemaining: number;
};

export function progressFromStages(stages: StageRow[]): number {
  if (stages.length === 0) return 0;
  const total = stages.reduce((acc, s) => {
    if (s.percent != null) return acc + s.percent;
    return acc + (s.complete ? 100 : 0);
  }, 0);
  return Math.round(total / stages.length);
}

// Human-readable current stage: the first incomplete stage in workflow order.
// Falls back to the final stage label once everything is complete.
export function currentStageLabel(stages: StageRow[]): string {
  for (const key of STAGE_KEYS) {
    const stage = stages.find((s) => s.stage_key === key);
    const done = stage?.complete || (stage?.percent ?? 0) >= 100;
    if (!done) return STAGE_LABELS[key];
  }
  return STAGE_LABELS[STAGE_KEYS[STAGE_KEYS.length - 1]];
}
