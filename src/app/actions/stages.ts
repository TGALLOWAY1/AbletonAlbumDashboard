"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";
import { STAGE_KEYS } from "@/lib/types";

const stageSchema = z.enum(STAGE_KEYS as unknown as [string, ...string[]]);

export async function toggleStage(
  trackId: string,
  stageKey: string,
  complete: boolean,
) {
  const key = stageSchema.parse(stageKey);
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("track_stages")
    .update({ complete, percent: complete ? 100 : 0 })
    .eq("track_id", trackId)
    .eq("stage_key", key);
  if (error) throw error;
  revalidateTrackSurfaces(trackId);
}

export async function setStagePercent(
  trackId: string,
  stageKey: string,
  percent: number,
) {
  const key = stageSchema.parse(stageKey);
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("track_stages")
    .update({ percent: clamped, complete: clamped === 100 })
    .eq("track_id", trackId)
    .eq("stage_key", key);
  if (error) throw error;
  revalidateTrackSurfaces(trackId);
}
