"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { OWNER_ID } from "@/lib/owner";
import {
  assignTracksToAlbumSchema,
  MAX_PINNED_TRACKS,
  SUNO_STATUSES,
  TRACK_STATUSES,
} from "@/lib/types";
import {
  revalidateAlbumSurfaces,
  revalidateTrackSurfaces,
} from "@/lib/revalidate-track";
import {
  isCheckViolation,
  isMissingColumn,
  MIGRATION_0021_MISSING_MESSAGE,
  MIGRATION_0022_MISSING_MESSAGE,
  MIGRATION_0026_MISSING_MESSAGE,
} from "@/lib/migration-errors";

const optionalTrimmed = z
  .string()
  .optional()
  .default("")
  .transform((v) => v.trim());

const optionalBpm = z
  .string()
  .optional()
  .default("")
  .transform((v) => v.trim())
  .refine(
    (v) => v === "" || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) < 1000),
    "BPM must be a positive number under 1000",
  )
  .transform((v) => (v === "" ? null : Number(v)));

const optionalUuid = z
  .string()
  .optional()
  .default("")
  .transform((v) => v.trim())
  .refine(
    (v) => v === "" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    "Invalid album id",
  )
  .transform((v) => (v === "" ? null : v));

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  tags: z.string().optional().default(""),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["active", "backlog"]).default("active"),
  song_key: optionalTrimmed.pipe(z.string().max(20)),
  bpm: optionalBpm,
  album_id: optionalUuid,
});

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function resolveAlbumId(
  supabase: ReturnType<typeof getServerSupabase>,
  raw: string | null,
): Promise<string | null> {
  if (raw) return raw;
  const { data } = await supabase
    .from("albums")
    .select("id")
    .eq("owner_id", OWNER_ID)
    .eq("is_active", true)
    .maybeSingle();
  return data?.id ?? null;
}

export async function createTrack(formData: FormData) {
  const parsed = createSchema.parse({
    name: formData.get("name"),
    tags: formData.get("tags") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    status: formData.get("status") ?? "active",
    song_key: formData.get("song_key") ?? "",
    bpm: formData.get("bpm") ?? "",
    album_id: formData.get("album_id") ?? "",
  });

  // No cap here any more. `status` says where a track is in its life, and
  // there is no reason to be limited in how many songs are alive; the cap that
  // matters — how many you are working on right now — moved to the pin
  // (migration 0026, `setTrackPinned`).
  const supabase = getServerSupabase();

  const album_id = await resolveAlbumId(supabase, parsed.album_id);

  const { data, error } = await supabase
    .from("tracks")
    .insert({
      owner_id: OWNER_ID,
      name: parsed.name,
      tags: parseTags(parsed.tags),
      cover_image_url: parsed.cover_image_url || null,
      status: parsed.status,
      song_key: parsed.song_key || null,
      bpm: parsed.bpm,
      album_id,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidateTrackSurfaces(data.id, { albumIds: [album_id] });
  redirect(`/tracks/${data.id}`);
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  tags: z.string().optional().default(""),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  als_file_path: z.string().max(1000).optional().default(""),
  song_key: optionalTrimmed.pipe(z.string().max(20)),
  bpm: optionalBpm,
});

// Album membership is not part of this form — it saves immediately through
// `assignTracksToAlbum` via <TrackAlbumSelect>, independent of this form's
// "Save changes" button, on every surface that shows it.
export async function updateTrack(formData: FormData) {
  const parsed = updateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    tags: formData.get("tags") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    als_file_path: formData.get("als_file_path") ?? "",
    song_key: formData.get("song_key") ?? "",
    bpm: formData.get("bpm") ?? "",
  });
  const supabase = getServerSupabase();

  const { data: updated, error } = await supabase
    .from("tracks")
    .update({
      name: parsed.name,
      tags: parseTags(parsed.tags),
      cover_image_url: parsed.cover_image_url || null,
      als_file_path: parsed.als_file_path.trim() || null,
      song_key: parsed.song_key || null,
      bpm: parsed.bpm,
    })
    .eq("owner_id", OWNER_ID)
    .eq("id", parsed.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updated) {
    throw new Error("Track not found, or the update was blocked.");
  }
  revalidateTrackSurfaces(parsed.id);
}

/**
 * Move a track between `active` / `backlog` / `completed` / `archived`.
 *
 * Finishing or shelving a track also unpins it. That is the second half of the
 * shortlist rule — "unpin one, or finish it" — and it has to happen here
 * rather than being left to the user: a completed song sitting in one of five
 * slots is the exact stall the cap exists to prevent, and nobody remembers to
 * clear it by hand.
 */
export async function setTrackStatus(id: string, status: string) {
  const next = z
    .enum(TRACK_STATUSES as unknown as [string, ...string[]])
    .parse(status);
  const supabase = getServerSupabase();

  const leavesShortlist = next === "completed" || next === "archived";
  const patch = leavesShortlist
    ? { status: next, pinned_at: null, pin_order: null }
    : { status: next };

  const { error } = await supabase
    .from("tracks")
    .update(patch)
    .eq("owner_id", OWNER_ID)
    .eq("id", id);

  // A database without 0026 has no pin columns to clear — the status change
  // is the part that matters, so retry without them rather than blocking it.
  if (error && leavesShortlist && isMissingColumn(error)) {
    const retry = await supabase
      .from("tracks")
      .update({ status: next })
      .eq("owner_id", OWNER_ID)
      .eq("id", id);
    if (retry.error) throw retry.error;
  } else if (error) {
    throw error;
  }

  revalidateTrackSurfaces(id);
}

/** `error` is null on success — same shape as `setTrackSunoStatus`. */
export type SetTrackPinnedResult = { error: string | null };

/**
 * Pin or unpin a track — the dashboard shortlist.
 *
 * Pinning is capped at `MAX_PINNED_TRACKS`. The count is read immediately
 * before the write rather than enforced by a constraint (see migration 0026),
 * so the cap is advisory against a concurrent second pin; for a single-user
 * app with one writer that is the right trade against a statement trigger
 * firing on every bulk update.
 *
 * A new pin gets `pin_order = null`, which sorts last — a track you just added
 * to the list starts at the bottom of it, and only a deliberate reorder moves
 * it up. Unpinning clears the order too, so a re-pin does not inherit a
 * position from a previous stint on the list.
 *
 * Returns its failure rather than throwing, because React replaces the message
 * of anything a server action throws before it reaches the client.
 */
export async function setTrackPinned(
  id: string,
  pinned: boolean,
): Promise<SetTrackPinnedResult> {
  const trackId = z.string().uuid("Invalid track id").parse(id);
  const supabase = getServerSupabase();

  if (pinned) {
    const { count, error: countError } = await supabase
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID)
      .not("pinned_at", "is", null);
    if (countError) {
      if (isMissingColumn(countError)) {
        return { error: MIGRATION_0026_MISSING_MESSAGE };
      }
      logSupabaseError("[setTrackPinned] count failed", countError);
      return { error: "Could not read your pinned tracks. Please try again." };
    }
    if ((count ?? 0) >= MAX_PINNED_TRACKS) {
      return {
        error:
          `You already have ${MAX_PINNED_TRACKS} tracks pinned. Unpin one, or ` +
          `finish it, to make room.`,
      };
    }
  }

  const { data: updated, error } = await supabase
    .from("tracks")
    .update({
      pinned_at: pinned ? new Date().toISOString() : null,
      pin_order: null,
    })
    .eq("owner_id", OWNER_ID)
    .eq("id", trackId)
    .select("id")
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) {
      return { error: MIGRATION_0026_MISSING_MESSAGE };
    }
    logSupabaseError("[setTrackPinned] failed", error);
    return { error: "Could not save the pin. Please try again." };
  }
  if (!updated) {
    return { error: "Track not found, or the update was blocked." };
  }

  revalidateTrackSurfaces(trackId);
  return { error: null };
}

const reorderPinsSchema = z.object({
  // The full displayed order, top first. `MAX_PINNED_TRACKS` is the real
  // bound; the schema allows a little slack so a list that is briefly over the
  // cap (a pin landing as a reorder is in flight) can still be renumbered
  // rather than rejected.
  orderedIds: z
    .array(z.string().uuid("Invalid track id"))
    .min(1)
    .max(MAX_PINNED_TRACKS * 2),
});

/**
 * Persist the shortlist's priority order.
 *
 * Writes an explicit 0..n-1 over every id passed, the same way
 * `reorderTrackTodos` does for a track's tasks — which is what turns a list
 * ordered by "whenever I pinned it" into one you chose. Every update is scoped
 * to `owner_id` and to `pinned_at is not null`, so an unpinned or foreign
 * track cannot be renumbered onto the list through this action.
 */
export async function reorderPinnedTracks(input: {
  orderedIds: string[];
}): Promise<SetTrackPinnedResult> {
  const parsed = reorderPinsSchema.parse(input);
  const supabase = getServerSupabase();

  const results = await Promise.all(
    parsed.orderedIds.map((id, index) =>
      supabase
        .from("tracks")
        .update({ pin_order: index })
        .eq("owner_id", OWNER_ID)
        .eq("id", id)
        .not("pinned_at", "is", null),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    if (isMissingColumn(failed.error)) {
      return { error: MIGRATION_0026_MISSING_MESSAGE };
    }
    logSupabaseError("[reorderPinnedTracks] failed", failed.error);
    return { error: "Could not save the new order. Please try again." };
  }

  for (const id of parsed.orderedIds) revalidateTrackSurfaces(id);
  return { error: null };
}

/** `error` is null on success — same shape as `CreateAlbumState`. */
export type SetSunoStatusResult = { error: string | null };

/**
 * Set the track's standing Suno marker (`todo` / `done` / `error`). The control
 * lives on track cards and both detail surfaces, so it takes the target status
 * rather than advancing server-side — the client already knows what it is
 * showing, and a double-click can't then race itself into the wrong state.
 *
 * Returns its failure rather than throwing it, matching `createAlbum`: React
 * replaces the message of anything a server action throws with a generic
 * "An error occurred in the Server Components render" before the rejection
 * reaches the client, so a thrown message is a message the user never sees.
 * A returned value crosses intact.
 */
export async function setTrackSunoStatus(
  id: string,
  status: string,
): Promise<SetSunoStatusResult> {
  const next = z.enum(SUNO_STATUSES).parse(status);
  const supabase = getServerSupabase();

  const { data: updated, error } = await supabase
    .from("tracks")
    .update({ suno_status: next })
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) {
      return { error: MIGRATION_0021_MISSING_MESSAGE };
    }
    // 0022 widened this constraint to three states. Until it is applied, the
    // column happily takes 'todo' and 'done' and rejects 'error'.
    if (isCheckViolation(error, "tracks_suno_status_check")) {
      return { error: MIGRATION_0022_MISSING_MESSAGE };
    }
    logSupabaseError("[setTrackSunoStatus] failed", error);
    return { error: "Could not save the Suno status. Please try again." };
  }
  if (!updated) {
    return { error: "Track not found, or the update was blocked." };
  }
  revalidateTrackSurfaces(id);
  return { error: null };
}

export async function deleteTrack(id: string) {
  const supabase = getServerSupabase();

  // Grab the album before the row disappears so its detail page refreshes.
  const { data: previous, error: readError } = await supabase
    .from("tracks")
    .select("album_id")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;

  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;
  revalidateTrackSurfaces(id, { albumIds: [previous?.album_id] });
}

// Bulk-assign tracks to an album (or unassign with albumId = null). Returns
// the number of tracks actually updated so callers can toast "Added N tracks".
export async function assignTracksToAlbum(
  albumId: string | null,
  trackIds: string[],
): Promise<{ count: number }> {
  const parsed = assignTracksToAlbumSchema.parse({ albumId, trackIds });
  const supabase = getServerSupabase();

  if (parsed.albumId !== null) {
    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id")
      .eq("owner_id", OWNER_ID)
      .eq("id", parsed.albumId)
      .maybeSingle();
    if (albumError) throw albumError;
    if (!album) {
      throw new Error("Album not found. It may have been deleted.");
    }
  }

  // Read the current albums before updating so the old album detail pages
  // refresh too when tracks move between albums.
  const { data: previous, error: readError } = await supabase
    .from("tracks")
    .select("album_id")
    .eq("owner_id", OWNER_ID)
    .in("id", parsed.trackIds);
  if (readError) throw readError;
  const previousAlbumIds = [
    ...new Set((previous ?? []).map((t) => t.album_id)),
  ];

  const { data: updated, error } = await supabase
    .from("tracks")
    .update({ album_id: parsed.albumId })
    .eq("owner_id", OWNER_ID)
    .in("id", parsed.trackIds)
    .select("id");
  if (error) throw error;

  revalidateAlbumSurfaces(parsed.albumId ?? undefined);
  for (const id of parsed.trackIds) {
    revalidateTrackSurfaces(id, {
      albumIds: [parsed.albumId, ...previousAlbumIds],
    });
  }

  return { count: updated?.length ?? 0 };
}

export async function updateNotes(id: string, notes: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("tracks")
    .update({ notes })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;
  revalidateTrackSurfaces(id);
}
