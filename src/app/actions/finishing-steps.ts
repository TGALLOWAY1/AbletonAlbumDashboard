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
