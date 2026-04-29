import type { Database } from "@/lib/database.types";

export type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];
export type StageRow = Database["public"]["Tables"]["track_stages"]["Row"];
export type BottleneckRow = Database["public"]["Tables"]["bottlenecks"]["Row"];
export type ActionRow = Database["public"]["Tables"]["actions"]["Row"];
export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
export type VersionRow = Database["public"]["Tables"]["track_versions"]["Row"];

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
  "arrangement",
  "mix",
  "sound_design",
  "composition",
] as const;
export type BottleneckCategory = (typeof BOTTLENECK_CATEGORIES)[number];

export const BOTTLENECK_LABELS: Record<BottleneckCategory, string> = {
  arrangement: "Arrangement",
  mix: "Mix",
  sound_design: "Sound Design",
  composition: "Composition",
};

export const MAX_ACTIVE_TRACKS = 5;

// Aggregate shape used by dashboard + detail views.
export type TrackWithDetails = TrackRow & {
  stages: StageRow[];
  bottleneck: BottleneckRow | null;
  primaryAction: ActionRow | null;
};

export function progressFromStages(stages: StageRow[]): number {
  if (stages.length === 0) return 0;
  const total = stages.reduce((acc, s) => {
    if (s.percent != null) return acc + s.percent;
    return acc + (s.complete ? 100 : 0);
  }, 0);
  return Math.round(total / stages.length);
}
