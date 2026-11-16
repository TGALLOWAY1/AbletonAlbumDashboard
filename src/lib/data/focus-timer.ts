import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingColumn } from "@/lib/migration-errors";

/**
 * The top open task of each of the given tracks — what a focus session
 * started on that track takes as its goal.
 *
 * One query for the whole set, two columns wide. The Focus Timer widget lets
 * a session start on any track in the library, and the goal the focus runner
 * seeds is the top of that track's open task list; getting it through
 * `getAllTracks` would run the whole `attachDetails` fan-out (stages, albums,
 * Suno, finishing steps, variations, step notes) for every track to read one
 * sentence each. Pinned tracks do not come through here: the dashboard has
 * already loaded them with `nextTask` attached, so the widget passes only the
 * ids it has nothing for.
 *
 * THE ORDER IS A COPY. "Next" means the same thing everywhere — hand-set
 * `sort_order` (migration 0025) with NULLs last, then `created_at` — and the
 * one definition of it is `selectOpenActions` in `src/lib/data/tracks.ts`,
 * which is private to that file and returns whole rows. This repeats its
 * `order()` calls and its pre-0025 retry so the two agree; if that ordering
 * ever changes, change it here too (or export the helper with a column list
 * and delete this copy).
 *
 * Tracks with nothing open are simply absent from the map. A failed read
 * throws, like every widget read: the widget's error boundary reports it,
 * rather than every track quietly starting sessions with no goal.
 */
export async function getNextTaskDescriptions(
  trackIds: string[],
): Promise<Map<string, string>> {
  const next = new Map<string, string>();
  if (trackIds.length === 0) return next;

  const supabase = getServerSupabase();
  const openTasks = () =>
    supabase
      .from("actions")
      .select("track_id, description")
      .in("track_id", trackIds)
      .is("completed_at", null);

  let result = await openTasks()
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (isMissingColumn(result.error)) {
    console.warn(
      "[focus-timer] actions.sort_order is missing — apply supabase/migrations/" +
        "0025_action_sort_order.sql to enable hand-set task ordering.",
    );
    result = await openTasks().order("created_at", { ascending: true });
  }
  if (result.error) throw result.error;

  // Rows arrive in list order, so the first one seen per track is the top of
  // that track's list.
  for (const row of result.data ?? []) {
    if (row.track_id && !next.has(row.track_id)) {
      next.set(row.track_id, row.description);
    }
  }
  return next;
}
