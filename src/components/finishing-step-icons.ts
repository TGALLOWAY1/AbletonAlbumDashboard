import {
  AudioWaveform,
  Download,
  MessageCircleMore,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { FinishingStepKey } from "@/lib/types";

/**
 * The icon and colour for each finishing step, shared by the checklist rows
 * (`TrackFinishingSteps`) and the step's notes page so a step looks the same
 * wherever it is named. Lives outside the client component because the notes
 * page renders on the server, and a `"use client"` module's exports are
 * client references there, not values.
 */
export const STEP_ICON: Record<FinishingStepKey, LucideIcon> = {
  suno_variations: Sparkles,
  arrangement_favorites: Star,
  sound_palette: Palette,
  core_elements: AudioWaveform,
  mixing_tips: MessageCircleMore,
  stems_midi: Download,
  ableton_cleanup: SlidersHorizontal,
};

// Restrained: steps that produce something get an accent, the tidy-up stays
// neutral. The two accents alternate through the Suno workflow so a seven-row
// list still reads as rows, not a rainbow. Icons carry the colour so the
// labels can all read as plain text.
export const STEP_ICON_TONE: Record<FinishingStepKey, string> = {
  suno_variations: "text-primary",
  arrangement_favorites: "text-accent",
  sound_palette: "text-primary",
  core_elements: "text-accent",
  mixing_tips: "text-primary",
  stems_midi: "text-accent",
  ableton_cleanup: "text-muted-foreground",
};
