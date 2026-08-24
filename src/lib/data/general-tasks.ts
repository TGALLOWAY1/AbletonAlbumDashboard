import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { isMissingColumn } from "@/lib/migration-errors";
import type { ActionRow } from "@/lib/types";

/**
 * Studio tasks: rows in `actions` with no track (migration 0028).
 *
 * Same table and same list semantics as a track's tasks — hand-set
 * `sort_order` from 0025 with NULLs last, then `created_at` — so the two lists
 * behave identically and share `TrackTodoList`. The difference is only what
 * they are about: a track's list is the song's remaining work, this one is the
 * studio's ("back up the drive", "sort the sample folder").
 *
 * Completed rows come back too, newest completion last, so the panel can show
 * what was finished today without a second query. The dashboard's tasks-done
 * stat counts both kinds from the same `completed_at` column.
 */
export async function getGeneralTasks(): Promise<ActionRow[]> {
  const supabase = getServerSupabase();
  const general = () =>
    supabase
      .from("actions")
      .select("*")
      .is("track_id", null)
      .eq("owner_id", OWNER_ID);

  const { data, error } = await general()
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (!error) return data ?? [];

  // Pre-0028 database: `actions.owner_id` does not exist, so there are no
  // general tasks to return either. Say what to run rather than throwing the
  // dashboard away over a panel.
  if (isMissingColumn(error)) {
    console.warn(
      "[general-tasks] actions.owner_id is missing — apply supabase/migrations/" +
        "0028_general_tasks.sql to enable studio tasks.",
    );
    return [];
  }
  throw error;
}
