import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { isMissingColumn } from "@/lib/migration-errors";
import type { SunoExperimentStatus } from "@/lib/suno";
import {
  comparePinPosition,
  finishingStepsFromRows,
  type ActionRow,
  type FinishingStepRow,
  type StageRow,
  type TrackRow,
  type TrackStatus,
  type TrackSunoSummary,
  type TrackWithDetails,
} from "@/lib/types";

type TrackAlbum = { id: string; title: string | null; genre: string | null };

/**
 * Album membership for a set of tracks.
 *
 * Membership is essential — it decides how `/tracks` groups, and whether a
 * track reads as "on a record" at all — while `genre` (migration 0021) is
 * decoration. So a project that has not applied 0021 yet must still get its
 * albums: selecting the column outright made PostgREST fail the whole query
 * with `42703 undefined_column`, which silently filed every track under
 * Backlog. On any error we retry for just the columns that have always
 * existed and treat the genre as unset.
 */
export async function fetchTrackAlbums(
  supabase: ReturnType<typeof getServerSupabase>,
  albumIds: string[],
): Promise<TrackAlbum[]> {
  if (albumIds.length === 0) return [];

  const withGenre = await supabase
    .from("albums")
    .select("id, title, genre")
    .in("id", albumIds);
  if (!withGenre.error) return withGenre.data ?? [];

  const base = await supabase
    .from("albums")
    .select("id, title")
    .in("id", albumIds);
  if (base.error) {
    // Both attempts failed — the albums table itself is missing or
    // unreadable. Membership is lost either way, but say so rather than
    // letting the page quietly claim every track is unassigned.
    console.warn(
      "[tracks] could not load albums for track membership:",
      base.error.message,
    );
    return [];
  }
  console.warn(
    "[tracks] albums.genre is missing — apply supabase/migrations/" +
      "0021_album_genre_track_suno.sql to enable album genres.",
  );
  return (base.data ?? []).map((a) => ({ ...a, genre: null }));
}

/**
 * Open tasks for a set of tracks, in display order: hand-set `sort_order`
 * (migration 0025) with NULLs last, then `created_at`. The one definition of
 * that order, shared by `attachDetails` and `getOpenActionsForTrack`, so the
 * dashboard's `nextTask` and the detail page's list cannot disagree.
 *
 * Ordering by a column PostgREST does not know fails the whole query with
 * `42703 undefined_column`, which took down every track detail page when a
 * deploy landed before 0025 was applied. Same posture as `fetchTrackAlbums`
 * above: the hand-set order is refinement, the tasks are essential — retry in
 * creation order and say what to run.
 */
async function selectOpenActions(
  supabase: ReturnType<typeof getServerSupabase>,
  trackIds: string[],
) {
  const openActions = () =>
    supabase
      .from("actions")
      .select("*")
      .in("track_id", trackIds)
      .is("completed_at", null);

  const ordered = await openActions()
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (!isMissingColumn(ordered.error)) return ordered;

  console.warn(
    "[tracks] actions.sort_order is missing — apply supabase/migrations/" +
      "0025_action_sort_order.sql to enable hand-set task ordering.",
  );
  return openActions().order("created_at", { ascending: true });
}

async function attachDetails(tracks: TrackRow[]): Promise<TrackWithDetails[]> {
  if (tracks.length === 0) return [];
  const supabase = getServerSupabase();
  const ids = tracks.map((t) => t.id);
  const albumIds = [
    ...new Set(
      tracks
        .map((t) => t.album_id)
        .filter((id): id is string => id != null),
    ),
  ];

  const [
    stagesRes,
    openActionsRes,
    completedActionsRes,
    albumsRes,
    sunoRes,
    finishingRes,
  ] =
    await Promise.all([
      supabase.from("track_stages").select("*").in("track_id", ids),
      // One query serves the open-task count, the remaining-time estimate and
      // `nextTask`. The first row per track is the top of the list the detail
      // page renders (`getOpenActionsForTrack` uses the same helper).
      selectOpenActions(supabase, ids),
      supabase
        .from("actions")
        .select("track_id")
        .in("track_id", ids)
        .not("completed_at", "is", null),
      fetchTrackAlbums(supabase, albumIds),
      // At most one non-terminal Suno experiment per track (partial unique
      // index); embedded candidate decisions give the unreviewed count.
      supabase
        .from("suno_experiments")
        .select("id, track_id, status, goal, suno_candidates(decision)")
        .in("track_id", ids)
        .not("status", "in", "(integrated,discarded)"),
      // Migration 0023. A project that has not applied it yet still gets its
      // cards: every step reads as outstanding (see below) rather than the
      // whole track query failing on `42P01 undefined_table`.
      supabase.from("track_finishing_steps").select("*").in("track_id", ids),
    ]);

  const stagesByTrack = new Map<string, StageRow[]>();
  (stagesRes.data ?? []).forEach((s) => {
    const list = stagesByTrack.get(s.track_id) ?? [];
    list.push(s);
    stagesByTrack.set(s.track_id, list);
  });
  const nextTaskByTrack = new Map<string, ActionRow>();
  const openCountByTrack = new Map<string, number>();
  const estMinutesByTrack = new Map<string, number>();
  // `actions.track_id` is nullable since migration 0027 (studio tasks own no
  // track), but both queries above filter `.in("track_id", ids)`, so a null
  // here is impossible. The guard is for the type system, not for the data.
  (openActionsRes.data ?? []).forEach((a) => {
    const trackId = a.track_id;
    if (!trackId) return;
    // Rows arrive in list order, so the first one seen per track is the top of
    // that track's list — i.e. its next action.
    if (!nextTaskByTrack.has(trackId)) nextTaskByTrack.set(trackId, a);
    openCountByTrack.set(trackId, (openCountByTrack.get(trackId) ?? 0) + 1);
    if (a.estimated_minutes != null) {
      estMinutesByTrack.set(
        trackId,
        (estMinutesByTrack.get(trackId) ?? 0) + a.estimated_minutes,
      );
    }
  });
  const completedCountByTrack = new Map<string, number>();
  (completedActionsRes.data ?? []).forEach((a) => {
    const trackId = a.track_id;
    if (!trackId) return;
    completedCountByTrack.set(
      trackId,
      (completedCountByTrack.get(trackId) ?? 0) + 1,
    );
  });
  const albumById = new Map<string, TrackAlbum>();
  albumsRes.forEach((a) => albumById.set(a.id, a));
  const finishingByTrack = new Map<string, FinishingStepRow[]>();
  if (finishingRes.error) {
    console.warn(
      "[tracks] could not load finishing steps — apply supabase/migrations/" +
        "0023_track_finishing_steps.sql to enable the finishing checklist: " +
        finishingRes.error.message,
    );
  }
  (finishingRes.data ?? []).forEach((row) => {
    const list = finishingByTrack.get(row.track_id) ?? [];
    list.push(row);
    finishingByTrack.set(row.track_id, list);
  });
  const sunoByTrack = new Map<string, TrackSunoSummary>();
  (sunoRes.data ?? []).forEach((e) => {
    sunoByTrack.set(e.track_id, {
      id: e.id,
      status: e.status as SunoExperimentStatus,
      goal: e.goal,
      unreviewedCount: (e.suno_candidates ?? []).filter(
        (c) => c.decision === "unreviewed",
      ).length,
    });
  });

  return tracks.map((t) => ({
    ...t,
    stages: stagesByTrack.get(t.id) ?? [],
    finishingSteps: finishingStepsFromRows(finishingByTrack.get(t.id) ?? []),
    nextTask: nextTaskByTrack.get(t.id) ?? null,
    openTaskCount: openCountByTrack.get(t.id) ?? 0,
    completedTaskCount: completedCountByTrack.get(t.id) ?? 0,
    estMinutesRemaining: estMinutesByTrack.get(t.id) ?? 0,
    album: (t.album_id && albumById.get(t.album_id)) || null,
    sunoExperiment: sunoByTrack.get(t.id) ?? null,
  }));
}

export async function getTracksByStatus(
  status: TrackStatus,
): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("status", status)
    .order("last_worked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachDetails(data ?? []);
}

/**
 * The shortlist: pinned tracks in priority order.
 *
 * This is what the dashboard shows. Deliberately not filtered by status or by
 * album — a pin is the whole answer to "is this on my list right now", and
 * scoping it again by either would resurrect the coupling migration 0026 set
 * out to remove.
 *
 * Ordering by `pin_order` fails the whole query with `42703 undefined_column`
 * on a database that has not applied 0026, which would take the dashboard
 * down rather than degrade it. Same posture as `selectOpenActions` above:
 * retry without the order and sort in memory, where `comparePinPosition`
 * gives the same answer. A database missing the columns entirely returns no
 * pinned rows, and the dashboard says the shortlist is empty — which, without
 * the migration, it is.
 */
export async function getPinnedTracks(): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const pinned = () =>
    supabase
      .from("tracks")
      .select("*")
      .eq("owner_id", OWNER_ID)
      .not("pinned_at", "is", null);

  const ordered = await pinned()
    .order("pin_order", { ascending: true, nullsFirst: false })
    .order("pinned_at", { ascending: true });
  const res = isMissingColumn(ordered.error) ? await pinned() : ordered;

  if (res.error) {
    if (isMissingColumn(res.error)) {
      console.warn(
        "[tracks] tracks.pinned_at is missing — apply supabase/migrations/" +
          "0026_track_pins.sql to enable the pinned shortlist.",
      );
      return [];
    }
    throw res.error;
  }

  const rows = [...(res.data ?? [])].sort(comparePinPosition);
  return attachDetails(rows);
}

/** How many tracks are pinned — the cap check in `setTrackPinned`. */
export async function countPinnedTracks(): Promise<number> {
  const supabase = getServerSupabase();
  const { count, error } = await supabase
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", OWNER_ID)
    .not("pinned_at", "is", null);
  if (error) {
    if (isMissingColumn(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

export type TrackOption = {
  id: string;
  name: string;
  status: string;
  pinned: boolean;
  lastWorkedAt: string | null;
  coverImageUrl: string | null;
};

/**
 * Lean rows for the pickers: every non-archived track, name and status only.
 *
 * The manual "log a session" dialog and the dashboard's pin shortlist both
 * need a list of tracks to choose from, and neither draws a track card. Going
 * through `getAllTracks` for that ran the whole `attachDetails` fan-out —
 * stages, both task queries, albums, Suno experiments and finishing steps for
 * every track in the library — to render a name in a dropdown.
 */
export async function listTrackOptions(): Promise<TrackOption[]> {
  const supabase = getServerSupabase();
  const columns = "id, name, status, last_worked_at, cover_image_url, pinned_at";
  const query = () =>
    supabase
      .from("tracks")
      .select(columns)
      .eq("owner_id", OWNER_ID)
      .neq("status", "archived")
      .order("last_worked_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

  const withPin = await query();
  if (!isMissingColumn(withPin.error)) {
    if (withPin.error) throw withPin.error;
    return (withPin.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      pinned: t.pinned_at != null,
      lastWorkedAt: t.last_worked_at,
      coverImageUrl: t.cover_image_url,
    }));
  }

  // Pre-0026 database: still list the tracks, just with nothing pinned.
  const base = await supabase
    .from("tracks")
    .select("id, name, status, last_worked_at, cover_image_url")
    .eq("owner_id", OWNER_ID)
    .neq("status", "archived")
    .order("last_worked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (base.error) throw base.error;
  return (base.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    pinned: false,
    lastWorkedAt: t.last_worked_at,
    coverImageUrl: t.cover_image_url,
  }));
}

export async function getTracksByAlbum(
  albumId: string,
): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("album_id", albumId)
    .order("last_worked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachDetails(data ?? []);
}

export async function getTracksWithoutAlbum(): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .is("album_id", null)
    .order("last_worked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachDetails(data ?? []);
}

export type AssignableTrack = {
  id: string;
  name: string;
  albumId: string | null;
  albumTitle: string | null;
};

/** All non-archived owner tracks that are NOT in the given album — lean rows
 * for the assign-tracks dialog (unassigned tracks + tracks in other albums). */
export async function getAssignableTracks(
  albumId: string,
): Promise<AssignableTrack[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("id, name, album_id")
    .eq("owner_id", OWNER_ID)
    .neq("status", "archived")
    .order("name", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []).filter((t) => t.album_id !== albumId);
  const albumIds = [
    ...new Set(
      rows.map((t) => t.album_id).filter((id): id is string => id != null),
    ),
  ];
  const titleByAlbumId = new Map<string, string | null>();
  if (albumIds.length > 0) {
    const { data: albums, error: albumsError } = await supabase
      .from("albums")
      .select("id, title")
      .in("id", albumIds);
    if (albumsError) throw albumsError;
    (albums ?? []).forEach((a) => titleByAlbumId.set(a.id, a.title));
  }

  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    albumId: t.album_id,
    albumTitle: t.album_id ? (titleByAlbumId.get(t.album_id) ?? null) : null,
  }));
}

export async function getAllTracks(): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachDetails(data ?? []);
}

export async function getTrack(id: string): Promise<TrackWithDetails | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withDetails] = await attachDetails([data]);
  return withDetails;
}

export async function getOpenActionsForTrack(
  trackId: string,
): Promise<ActionRow[]> {
  const supabase = getServerSupabase();
  // Hand-set order first (migration 0025), then anything never reordered by
  // age. The first row is the track's next action.
  const { data, error } = await selectOpenActions(supabase, [trackId]);
  if (error) throw error;
  return data ?? [];
}

export async function getCompletedActionsForTrack(
  trackId: string,
): Promise<ActionRow[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("track_id", trackId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

