"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";
import {
  FINISHING_STEP_CONSTRAINT,
  isCheckViolation,
  isMissingTable,
  MIGRATION_0023_MISSING_MESSAGE,
  MIGRATION_0030_MISSING_MESSAGE,
  MIGRATION_0031_MISSING_MESSAGE,
} from "@/lib/migration-errors";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { FINISHING_STEP_KEYS } from "@/lib/types";

const stepSchema = z.enum(FINISHING_STEP_KEYS);

/**
 * Tick or untick one of the finishing steps.
 *
 * Reports through the return value rather than throwing: in a production build
 * React replaces the message of anything a server action throws with the
 * generic render error, so a "you still need migration 0023" hint would never
 * reach the person who can act on it. Same contract as `setTrackSunoStatus`.
 */
export async function setFinishingStep(
  trackId: string,
  stepKey: string,
  complete: boolean,
): Promise<{ error?: string }> {
  const parsed = stepSchema.safeParse(stepKey);
  if (!parsed.success) return { error: "Unknown finishing step" };

  const supabase = getServerSupabase();
  const { error } = await supabase.from("track_finishing_steps").upsert(
    {
      track_id: trackId,
      step_key: parsed.data,
      completed_at: complete ? new Date().toISOString() : null,
    },
    { onConflict: "track_id,step_key" },
  );

  if (error) {
    if (isMissingTable(error)) return { error: MIGRATION_0023_MISSING_MESSAGE };
    // A Suno-workflow key against a database whose constraint predates 0030:
    // the table exists, so the write is well-formed right up until the row is
    // validated.
    if (isCheckViolation(error, FINISHING_STEP_CONSTRAINT))
      return { error: MIGRATION_0030_MISSING_MESSAGE };
    logSupabaseError("setFinishingStep", error);
    return { error: "Could not save that step. Try again." };
  }

  revalidateTrackSurfaces(trackId);
  return {};
}

const variationNameSchema = z.string().trim().min(1).max(80);

/**
 * Add a named variation to a track (migration 0031). The variation carries
 * its own run of the finishing checklist; like the track's own checklist,
 * step rows are written on first tick, so a fresh variation needs no seeding.
 */
export async function addTrackVariation(
  trackId: string,
  name: string,
): Promise<{ error?: string }> {
  const parsed = variationNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: "Give the variation a name (up to 80 characters)." };
  }

  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("track_variations")
    .insert({ track_id: trackId, name: parsed.data });

  if (error) {
    if (isMissingTable(error)) return { error: MIGRATION_0031_MISSING_MESSAGE };
    logSupabaseError("addTrackVariation", error);
    return { error: "Could not add that variation. Try again." };
  }

  revalidateTrackSurfaces(trackId);
  return {};
}

/**
 * Delete a variation and (via cascade) its checklist run. The caller confirms
 * with the user first — completed ticks go with it.
 */
export async function deleteTrackVariation(
  trackId: string,
  variationId: string,
): Promise<{ error?: string }> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("track_variations")
    .delete()
    .eq("id", variationId)
    .eq("track_id", trackId);

  if (error) {
    if (isMissingTable(error)) return { error: MIGRATION_0031_MISSING_MESSAGE };
    logSupabaseError("deleteTrackVariation", error);
    return { error: "Could not delete that variation. Try again." };
  }

  revalidateTrackSurfaces(trackId);
  return {};
}

/**
 * Tick or untick one step on one variation's checklist. Same contract and
 * same step keys as `setFinishingStep`; only the row's home differs
 * (track_variation_steps, keyed by variation).
 */
export async function setVariationStep(
  trackId: string,
  variationId: string,
  stepKey: string,
  complete: boolean,
): Promise<{ error?: string }> {
  const parsed = stepSchema.safeParse(stepKey);
  if (!parsed.success) return { error: "Unknown finishing step" };

  const supabase = getServerSupabase();
  const { error } = await supabase.from("track_variation_steps").upsert(
    {
      variation_id: variationId,
      step_key: parsed.data,
      completed_at: complete ? new Date().toISOString() : null,
    },
    { onConflict: "variation_id,step_key" },
  );

  if (error) {
    if (isMissingTable(error)) return { error: MIGRATION_0031_MISSING_MESSAGE };
    logSupabaseError("setVariationStep", error);
    return { error: "Could not save that step. Try again." };
  }

  revalidateTrackSurfaces(trackId);
  return {};
}
