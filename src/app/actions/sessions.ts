"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { setActiveBottleneck } from "@/app/actions/bottlenecks";
import { completeAction } from "@/app/actions/actions";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";
import { BOTTLENECK_CATEGORIES } from "@/lib/types";
import { PRODUCTION_ACTIVITY_KEYS } from "@/lib/production-activities";

// Session history and analytics both render on the dashboard now.
const REVALIDATE = () => {
  revalidatePath("/");
};

// ---------------------------------------------------------------------------
// Log a finished session — from the focus runner's stop-and-log flow or the
// manual "log past session" dialog.
// ---------------------------------------------------------------------------

const completeSchema = z.object({
  trackId: z.string().uuid().nullable().optional(),
  sessionTypeId: z.string().uuid().nullable().optional(),
  actionId: z.string().uuid().nullable().optional(),
  startedAt: z.string(),
  endedAt: z.string(),
  improved: z.string().max(2000).optional().or(z.literal("")),
  stillBroken: z.string().max(2000).optional().or(z.literal("")),
  notesMd: z.string().max(10000).optional().or(z.literal("")),
  energyRating: z.number().int().min(1).max(5).optional().nullable(),
  enjoymentRating: z.number().int().min(1).max(5).optional().nullable(),
  progressImpact: z.number().int().min(1).max(5).optional().nullable(),
  activities: z
    .array(
      z.object({
        key: z.enum(PRODUCTION_ACTIVITY_KEYS),
        minutes: z.number().int().min(0),
        note: z.string().max(2000).optional().or(z.literal("")),
      }),
    )
    .optional(),
  newBottleneckDescription: z.string().max(500).optional().or(z.literal("")),
  newBottleneckCategory: z
    .enum(BOTTLENECK_CATEGORIES as unknown as [string, ...string[]])
    .optional(),
  completeAction: z.boolean().optional().default(false),
  todos: z
    .array(
      z.object({
        description: z.string().min(1).max(500),
        done: z.boolean(),
      }),
    )
    .optional(),
});

export async function completeSession(input: {
  trackId?: string | null;
  sessionTypeId?: string | null;
  actionId?: string | null;
  startedAt: string;
  endedAt: string;
  improved?: string;
  stillBroken?: string;
  notesMd?: string;
  energyRating?: number | null;
  enjoymentRating?: number | null;
  progressImpact?: number | null;
  activities?: Array<{
    key: (typeof PRODUCTION_ACTIVITY_KEYS)[number];
    minutes: number;
    note?: string;
  }>;
  newBottleneckDescription?: string;
  newBottleneckCategory?: string;
  completeAction?: boolean;
  todos?: Array<{ description: string; done: boolean }>;
}) {
  const parsed = completeSchema.parse(input);
  const supabase = getServerSupabase();

  const payload = {
    track_id: parsed.trackId ?? null,
    session_type_id: parsed.sessionTypeId ?? null,
    action_id: parsed.actionId ?? null,
    started_at: parsed.startedAt,
    ended_at: parsed.endedAt,
    improved: parsed.improved || null,
    still_broken: parsed.stillBroken || null,
    notes_md: parsed.notesMd || null,
    new_bottleneck: parsed.newBottleneckDescription || null,
    energy_rating: parsed.energyRating ?? null,
    enjoyment_rating: parsed.enjoymentRating ?? null,
    progress_impact_rating: parsed.progressImpact ?? null,
    status: "completed" as const,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("sessions")
    .insert(payload)
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  const resolvedSessionId = inserted.id;

  // Per-activity time allocation. Only rows carrying signal are persisted —
  // minutes > 0 or a non-empty note.
  const activityRows = (parsed.activities ?? [])
    .filter((a) => a.minutes > 0 || (a.note ?? "").trim().length > 0)
    .map((a) => ({
      session_id: resolvedSessionId,
      activity_key: a.key,
      minutes: a.minutes,
      note: (a.note ?? "").trim() || null,
    }));
  if (activityRows.length > 0) {
    const { error: actErr } = await supabase
      .from("session_activities")
      .insert(activityRows);
    if (actErr) throw actErr;
  }

  const todoRows = (parsed.todos ?? []).map((t, i) => ({
    session_id: resolvedSessionId,
    description: t.description,
    done: t.done,
    done_at: t.done ? new Date().toISOString() : null,
    sort_order: i,
  }));
  if (todoRows.length > 0) {
    const { error: todoErr } = await supabase
      .from("session_todos")
      .insert(todoRows);
    if (todoErr) throw todoErr;
  }

  if (
    parsed.newBottleneckDescription &&
    parsed.newBottleneckCategory &&
    parsed.newBottleneckDescription.trim().length > 0 &&
    parsed.trackId
  ) {
    await setActiveBottleneck({
      trackId: parsed.trackId,
      description: parsed.newBottleneckDescription.trim(),
      category: parsed.newBottleneckCategory,
    });
  }

  if (parsed.completeAction && parsed.actionId) {
    await completeAction(parsed.actionId, parsed.trackId ?? "");
  }

  if (parsed.trackId) {
    revalidateTrackSurfaces(parsed.trackId);
  }
  REVALIDATE();
  return { id: resolvedSessionId };
}
