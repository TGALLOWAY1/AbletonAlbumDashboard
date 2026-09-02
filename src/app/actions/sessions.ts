"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { completeAction } from "@/app/actions/actions";
import { OWNER_ID } from "@/lib/owner";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";
import { PRODUCTION_ACTIVITY_KEYS } from "@/lib/production-activities";
import { lastWorkedAtFrom } from "@/lib/session-last-worked";

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

  if (parsed.completeAction && parsed.actionId) {
    await completeAction(parsed.actionId, parsed.trackId ?? "");
  }

  if (parsed.trackId) {
    revalidateTrackSurfaces(parsed.trackId);
  }
  REVALIDATE();
  return { id: resolvedSessionId };
}

// ---------------------------------------------------------------------------
// Edit and delete a logged session.
//
// Every figure on the dashboard — the heatmap, the range stats, the streak —
// and every track's last-worked date are derived from these rows, so a
// mislogged session used to be permanently wrong. Both writers below go
// through the same three steps: change the row, put `tracks.last_worked_at`
// back in step for every track the change touched, then revalidate.
//
// Scoping note (single-user app): `sessions` has no `owner_id` column, so a
// session is reached by id. Where it has a track, the track's `owner_id` is
// checked — that is the only ownership fact these rows carry. A track-less
// session (allowed since migration 0009) has nothing to scope through and is
// accepted on its id alone; when this app grows a second user, `sessions`
// needs its own `owner_id` and both actions need a filter on it.
// ---------------------------------------------------------------------------

type Supabase = ReturnType<typeof getServerSupabase>;

/**
 * Put `tracks.last_worked_at` back in step with the sessions the track has
 * left. The `bump_track_last_worked` trigger only fires on insert and only
 * ever moves the value forward, so after an edit or a delete it can be stale —
 * pointing at a session that no longer ends then, or no longer exists. The
 * rule itself lives in `lastWorkedAtFrom`; see that file for why status is not
 * filtered and why `tracks.started_at` is left alone.
 */
async function syncTrackLastWorked(supabase: Supabase, trackId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("ended_at")
    .eq("track_id", trackId);
  if (error) throw error;

  const { error: updateErr } = await supabase
    .from("tracks")
    .update({ last_worked_at: lastWorkedAtFrom(data ?? []) })
    .eq("id", trackId)
    .eq("owner_id", OWNER_ID);
  if (updateErr) throw updateErr;
}

/** Load the session being changed, with the owner of the track it is on. */
async function loadOwnedSession(supabase: Supabase, id: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, track_id, track:tracks!sessions_track_id_fkey(owner_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("That session no longer exists.");

  const track = data.track as { owner_id: string } | null;
  if (track && track.owner_id !== OWNER_ID) {
    // Same message as a missing row: a session on someone else's track is not
    // a session this user can be told about.
    throw new Error("That session no longer exists.");
  }
  return data;
}

/**
 * A session type may insist on a track (`session_types.requires_track`, 0009).
 * Checked here rather than trusted from the form, since the form is not the
 * only caller a server action can have.
 */
async function assertTrackSatisfiesType(
  supabase: Supabase,
  sessionTypeId: string | null,
  trackId: string | null,
) {
  if (!sessionTypeId || trackId) return;
  const { data, error } = await supabase
    .from("session_types")
    .select("name, requires_track")
    .eq("id", sessionTypeId)
    .eq("owner_id", OWNER_ID)
    .maybeSingle();
  if (error) throw error;
  if (data?.requires_track) {
    throw new Error(`“${data.name}” sessions have to be attached to a track.`);
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.string(),
  endedAt: z.string(),
  trackId: z.string().uuid().nullable().optional(),
  sessionTypeId: z.string().uuid().nullable().optional(),
  notesMd: z.string().max(10000).nullable().optional(),
  progressImpactRating: z.number().int().min(1).max(5).nullable().optional(),
  enjoymentRating: z.number().int().min(1).max(5).nullable().optional(),
  activities: z
    .array(
      z.object({
        key: z.enum(PRODUCTION_ACTIVITY_KEYS),
        minutes: z.number().int().min(0),
        note: z.string().max(2000).optional().or(z.literal("")),
      }),
    )
    .optional(),
});

export async function updateSession(input: {
  id: string;
  startedAt: string;
  endedAt: string;
  trackId?: string | null;
  sessionTypeId?: string | null;
  notesMd?: string | null;
  progressImpactRating?: number | null;
  enjoymentRating?: number | null;
  activities?: Array<{
    key: (typeof PRODUCTION_ACTIVITY_KEYS)[number];
    minutes: number;
    note?: string;
  }>;
}) {
  const parsed = updateSchema.parse(input);

  const startMs = new Date(parsed.startedAt).getTime();
  const endMs = new Date(parsed.endedAt).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    throw new Error("Pick a valid start and end for the session.");
  }
  // The database carries the same check (`sessions_actual_time_order`, 0009),
  // but a constraint violation reaches the user as an opaque Postgres error.
  if (endMs < startMs) {
    throw new Error("A session cannot end before it starts.");
  }

  const supabase = getServerSupabase();
  const existing = await loadOwnedSession(supabase, parsed.id);
  const nextTrackId = parsed.trackId ?? null;
  const nextSessionTypeId = parsed.sessionTypeId ?? null;

  if (nextTrackId) {
    const { data: track, error: trackErr } = await supabase
      .from("tracks")
      .select("id")
      .eq("id", nextTrackId)
      .eq("owner_id", OWNER_ID)
      .maybeSingle();
    if (trackErr) throw trackErr;
    if (!track) throw new Error("That track no longer exists.");
  }
  await assertTrackSatisfiesType(supabase, nextSessionTypeId, nextTrackId);

  // `duration_seconds` is never written: it is generated from the two
  // timestamps (migration 0001) and Postgres rejects a value for it.
  const { error: updateErr } = await supabase
    .from("sessions")
    .update({
      track_id: nextTrackId,
      session_type_id: nextSessionTypeId,
      started_at: parsed.startedAt,
      ended_at: parsed.endedAt,
      notes_md: parsed.notesMd?.trim() ? parsed.notesMd : null,
      progress_impact_rating: parsed.progressImpactRating ?? null,
      enjoyment_rating: parsed.enjoymentRating ?? null,
    })
    .eq("id", parsed.id);
  if (updateErr) throw updateErr;

  // Activities are replaced wholesale when supplied and left alone when not,
  // so a caller with no activity editor cannot wipe the breakdown a session
  // was logged with.
  if (parsed.activities) {
    const { error: clearErr } = await supabase
      .from("session_activities")
      .delete()
      .eq("session_id", parsed.id);
    if (clearErr) throw clearErr;

    const rows = parsed.activities
      .filter((a) => a.minutes > 0 || (a.note ?? "").trim().length > 0)
      .map((a) => ({
        session_id: parsed.id,
        activity_key: a.key,
        minutes: a.minutes,
        note: (a.note ?? "").trim() || null,
      }));
    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from("session_activities")
        .insert(rows);
      if (insertErr) throw insertErr;
    }
  }

  // Both ends of a move: the track the session left and the one it joined.
  const affected = new Set(
    [existing.track_id, nextTrackId].filter((id): id is string => !!id),
  );
  for (const trackId of affected) {
    await syncTrackLastWorked(supabase, trackId);
    revalidateTrackSurfaces(trackId);
  }
  // The dashboard draws every session, track or no track — this mirrors what
  // the manual-entry path revalidates for a track-less log.
  REVALIDATE();
  return { id: parsed.id };
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteSession(input: { id: string }) {
  const parsed = deleteSchema.parse(input);
  const supabase = getServerSupabase();
  const existing = await loadOwnedSession(supabase, parsed.id);

  // `session_activities` and `session_todos` both cascade (0015, 0009).
  const { error } = await supabase.from("sessions").delete().eq("id", parsed.id);
  if (error) throw error;

  if (existing.track_id) {
    await syncTrackLastWorked(supabase, existing.track_id);
    revalidateTrackSurfaces(existing.track_id);
  }
  REVALIDATE();
  return { id: parsed.id };
}
