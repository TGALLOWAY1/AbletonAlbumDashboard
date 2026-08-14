import {
  AudioWaveform,
  Bot,
  FolderOpen,
  Grid2x2,
  Headphones,
  Music4,
  Sparkles,
  SlidersHorizontal,
  MoreHorizontal,
  Wand2,
  type LucideIcon,
} from "lucide-react";

export type ProductionActivityKey =
  | "sound_design"
  | "arrangement"
  | "mixing"
  | "organization"
  | "melody_harmony"
  | "automation"
  | "reference_listening"
  | "fx_design"
  | "suno_ideation"
  | "other";

export type ProductionActivity = {
  key: ProductionActivityKey;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip (bg + text), tuned to the mockup. */
  iconClassName: string;
};

/**
 * Single source of truth for the production activities, in the display
 * order shown on the session-logging mockup. Keep this in sync with the
 * `activity_key` check constraint, last updated in
 * supabase/migrations/0019_suno_round_trip.sql (originally 0015).
 */
export const PRODUCTION_ACTIVITIES: ProductionActivity[] = [
  {
    key: "sound_design",
    label: "Sound Design",
    icon: AudioWaveform,
    iconClassName: "bg-primary/10 text-primary",
  },
  {
    key: "arrangement",
    label: "Arrangement",
    icon: Grid2x2,
    iconClassName: "bg-warning/15 text-warning",
  },
  {
    key: "mixing",
    label: "Mixing",
    icon: SlidersHorizontal,
    iconClassName: "bg-sky-500/15 text-sky-600",
  },
  {
    key: "organization",
    label: "Organization",
    icon: FolderOpen,
    iconClassName: "bg-primary/10 text-primary",
  },
  {
    key: "melody_harmony",
    label: "Melody / Harmony",
    icon: Music4,
    iconClassName: "bg-pink-500/15 text-pink-600",
  },
  {
    key: "automation",
    label: "Automation",
    icon: Sparkles,
    iconClassName: "bg-accent/15 text-accent",
  },
  {
    key: "reference_listening",
    label: "Reference / Listening",
    icon: Headphones,
    iconClassName: "bg-teal-500/15 text-teal-600",
  },
  {
    key: "fx_design",
    label: "FX Design",
    icon: Wand2,
    iconClassName: "bg-violet-500/15 text-violet-600",
  },
  {
    key: "suno_ideation",
    label: "Suno Ideation",
    icon: Bot,
    iconClassName: "bg-fuchsia-500/15 text-fuchsia-600",
  },
  {
    key: "other",
    label: "Other",
    icon: MoreHorizontal,
    iconClassName: "bg-muted text-muted-foreground",
  },
];

export const PRODUCTION_ACTIVITY_KEYS = PRODUCTION_ACTIVITIES.map(
  (a) => a.key,
) as [ProductionActivityKey, ...ProductionActivityKey[]];

export const PRODUCTION_ACTIVITY_LABELS: Record<ProductionActivityKey, string> =
  Object.fromEntries(
    PRODUCTION_ACTIVITIES.map((a) => [a.key, a.label]),
  ) as Record<ProductionActivityKey, string>;
