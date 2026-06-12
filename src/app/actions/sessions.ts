"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { setActiveBottleneck } from "@/app/actions/bottlenecks";
import { completeAction } from "@/app/actions/actions";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";
import { BOTTLENECK_CATEGORIES } from "@/lib/types";
import { PRODUCTION_ACTIVITY_KEYS } from "@/lib/production-activities";
import type { Database } from "@/lib/database.types";

type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

const REVALIDATE = () => {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/sessions");
  revalidatePath("/analytics");
};

// ---------------------------------------------------------------------------
// Create / update planned session
// ---------------------------------------------------------------------------

const createPlannedSchema = z.object({
  trackId: z.string().uuid().nullable().optional(),
  sessionTypeId: z.string().uuid().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
  recurrenceId: z.string().uuid().nullable().optional(),
  plannedStart: z.string(),
  plannedEnd: z.string(),
  notesMd: z.string().max(10000).optional().nullable(),
  todos: z.array(z.string().min(1).max(500)).optional(),
});

export async function createPlannedSession(input: {
  trackId?: string | null;
  sessionTypeId?: string | null;
  templateId?: string | null;
  recurrenceId?: string | null;
  plannedStart: string;
  plannedEnd: string;
  notesMd?: string | null;
  todos?: string[];
}): Promise<{ id: string }> {
  const parsed = createPlannedSchema.parse(input);
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      track_id: parsed.trackId ?? null,
      session_type_id: parsed.sessionTypeId ?? null,
      template_id: parsed.templateId ?? null,
      recurrence_id: parsed.recurrenceId ?? null,
      planned_start: parsed.plannedStart,
      planned_end: parsed.plannedEnd,
      notes_md: parsed.notesMd || null,
      status: "planned",
    })
    .select("id")
    .single();
  if (error) throw error;

  const todos = (parsed.todos ?? []).filter((t) => t.trim().length > 0);
  if (todos.length > 0) {
    const { error: todoErr } = await supabase.from("session_todos").insert(
      todos.map((description, i) => ({
        session_id: data.id,
        description,
        sort_order: i,
      })),
    );
    if (todoErr) throw todoErr;
  }

  REVALIDATE();
  return { id: data.id };
}

const updatePlannedSchema = z.object({
  id: z.string().uuid(),
  trackId: z.string().uuid().nullable().optional(),
  sessionTypeId: z.string().uuid().nullable().optional(),
  plannedStart: z.string().optional(),
  plannedEnd: z.string().optional(),
  notesMd: z.string().max(10000).optional().nullable(),
});

export async function updatePlannedSession(input: {
  id: string;
  trackId?: string | null;
  sessionTypeId?: string | null;
  plannedStart?: string;
  plannedEnd?: string;
  notesMd?: string | null;
}) {
  const parsed = updatePlannedSchema.parse(input);
  const supabase = getServerSupabase();

  const update: SessionUpdate = {};
  if (parsed.trackId !== undefined) update.track_id = parsed.trackId;
  if (parsed.sessionTypeId !== undefined)
    update.session_type_id = parsed.sessionTypeId;
  if (parsed.plannedStart) update.planned_start = parsed.plannedStart;
  if (parsed.plannedEnd) update.planned_end = parsed.plannedEnd;
  if (parsed.notesMd !== undefined) update.notes_md = parsed.notesMd || null;

  const { error } = await supabase
    .from("sessions")
    .update(update)
    .eq("id", parsed.id);
  if (error) throw error;

  REVALIDATE();
}

export async function rescheduleSession(
  id: string,
  plannedStart: string,
  plannedEnd: string,
) {
  return updatePlannedSession({ id, plannedStart, plannedEnd });
}

export async function deleteSession(id: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
  REVALIDATE();
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function markSessionInProgress(id: string) {
  const supabase = getServerSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("sessions")
    .update({ status: "in_progress", started_at: now })
    .eq("id", id);
  if (error) throw error;
  REVALIDATE();
}

export async function markSessionSkipped(id: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("sessions")
    .update({ status: "skipped" })
    .eq("id", id);
  if (error) throw error;
  REVALIDATE();
}

// ---------------------------------------------------------------------------
// Complete a session — handles both legacy ad-hoc logging and finishing a
// planned/in-progress row.
// ---------------------------------------------------------------------------

const completeSchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
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
  carryOverTodoIds: z.array(z.string().uuid()).optional(),
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
  sessionId?: string | null;
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
  carryOverTodoIds?: string[];
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

  let resolvedSessionId = parsed.sessionId ?? null;

  if (parsed.sessionId) {
    const { error } = await supabase
      .from("sessions")
      .update(payload)
      .eq("id", parsed.sessionId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("sessions")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    resolvedSessionId = data.id;
  }

  // Replace the session's per-activity time allocation. Delete-then-insert is
  // idempotent and safe to re-run (e.g. re-completing a session), and we only
  // persist rows that carry signal — minutes > 0 or a non-empty note.
  if (parsed.activities && resolvedSessionId) {
    const sessionId = resolvedSessionId;
    const { error: delErr } = await supabase
      .from("session_activities")
      .delete()
      .eq("session_id", sessionId);
    if (delErr) throw delErr;

    const rows = parsed.activities
      .filter((a) => a.minutes > 0 || (a.note ?? "").trim().length > 0)
      .map((a) => ({
        session_id: sessionId,
        activity_key: a.key,
        minutes: a.minutes,
        note: (a.note ?? "").trim() || null,
      }));
    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from("session_activities")
        .insert(rows);
      if (insErr) throw insErr;
    }
  }

  // Sync session_todos to the supplied list. Matches by description so any
  // existing row keeps its id (so carry-over below still works), updates
  // done/sort_order, inserts new descriptions, deletes unmatched rows.
  if (parsed.todos && resolvedSessionId) {
    const sessionId = resolvedSessionId;
    const { data: existing, error: exErr } = await supabase
      .from("session_todos")
      .select("id, description, done")
      .eq("session_id", sessionId);
    if (exErr) throw exErr;

    const pool = [...(existing ?? [])];
    const matchedIds = new Set<string>();
    const inserts: Array<{
      session_id: string;
      description: string;
      done: boolean;
      done_at: string | null;
      sort_order: number;
    }> = [];
    const updates: Array<{
      id: string;
      done: boolean;
      done_at: string | null;
      sort_order: number;
    }> = [];

    parsed.todos.forEach((t, i) => {
      const matchIdx = pool.findIndex(
        (e) => !matchedIds.has(e.id) && e.description === t.description,
      );
      const doneAt = t.done ? new Date().toISOString() : null;
      if (matchIdx >= 0) {
        const match = pool[matchIdx];
        matchedIds.add(match.id);
        updates.push({ id: match.id, done: t.done, done_at: doneAt, sort_order: i });
      } else {
        inserts.push({
          session_id: sessionId,
          description: t.description,
          done: t.done,
          done_at: doneAt,
          sort_order: i,
        });
      }
    });

    const toDelete = (existing ?? [])
      .filter((e) => !matchedIds.has(e.id))
      .map((e) => e.id);

    await Promise.all([
      ...updates.map((u) =>
        supabase
          .from("session_todos")
          .update({ done: u.done, done_at: u.done_at, sort_order: u.sort_order })
          .eq("id", u.id),
      ),
      inserts.length > 0
        ? supabase.from("session_todos").insert(inserts)
        : Promise.resolve(),
      toDelete.length > 0
        ? supabase.from("session_todos").delete().in("id", toDelete)
        : Promise.resolve(),
    ]);
  }

  // Carry over: clone unchecked todo descriptions onto a new planned session
  // of the same track + type, scheduled 1 week later as a soft default.
  if (
    parsed.carryOverTodoIds &&
    parsed.carryOverTodoIds.length > 0 &&
    resolvedSessionId
  ) {
    const { data: todos, error: tErr } = await supabase
      .from("session_todos")
      .select("id, description, sort_order")
      .in("id", parsed.carryOverTodoIds);
    if (tErr) throw tErr;
    if (todos && todos.length > 0) {
      const ended = new Date(parsed.endedAt);
      const nextStart = new Date(ended);
      nextStart.setDate(nextStart.getDate() + 7);
      const nextEnd = new Date(
        nextStart.getTime() +
          (ended.getTime() - new Date(parsed.startedAt).getTime()),
      );
      const { data: nextSession, error: nsErr } = await supabase
        .from("sessions")
        .insert({
          track_id: parsed.trackId ?? null,
          session_type_id: parsed.sessionTypeId ?? null,
          planned_start: nextStart.toISOString(),
          planned_end: nextEnd.toISOString(),
          status: "planned",
          notes_md: "Carried over from previous session.",
        })
        .select("id")
        .single();
      if (nsErr) throw nsErr;
      const { error: cloneErr } = await supabase.from("session_todos").insert(
        todos.map((t, i) => ({
          session_id: nextSession.id,
          description: t.description,
          sort_order: i,
          carried_from: t.id,
        })),
      );
      if (cloneErr) throw cloneErr;
    }
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
  return { id: resolvedSessionId! };
}
