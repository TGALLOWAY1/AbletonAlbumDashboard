import { cache } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { OWNER_ID } from "@/lib/owner";
import { isMissingTable } from "@/lib/migration-errors";
import { readLayout, type SavedLayout } from "@/lib/dashboard/layout";
import { fetchAnalyticsData } from "@/lib/data/analytics";
import { getGeneralTasks } from "@/lib/data/general-tasks";
import { getSessionTypes } from "@/lib/data/session-types";
import { getSessionStatsByTrack } from "@/lib/data/sessions";
import { getSunoWorkSummary } from "@/lib/data/suno";
import { getPinnedTracks, listTrackOptions } from "@/lib/data/tracks";

/**
 * How the read of saved layouts went, because the three outcomes need three
 * different pages:
 *
 *   ok        rows read (possibly none — the built-in layout stands in).
 *   missing   migration 0038 is not applied. The dashboard still works on the
 *             built-in layout; saving explains which file to run.
 *   failed    the read errored for some other reason. The built-in layout is
 *             shown *read-only*: saving over an unknown set of rows could
 *             create a duplicate default or bury the user's real layouts.
 */
export type LayoutsStatus = "ok" | "missing" | "failed";

let warnedMissingLayouts = false;

/**
 * Every named layout this owner has saved, default first.
 *
 * Degrades rather than throws, for the reason every read here does (see
 * `migration-errors.ts`): a deploy can meet a database without 0038, and the
 * dashboard is the home page — it must not go down over where the widgets
 * sit. Each stored document goes through `readLayout`, so nothing downstream
 * ever sees a layout it cannot draw.
 */
export async function getDashboardLayouts(): Promise<{
  layouts: SavedLayout[];
  status: LayoutsStatus;
}> {
  let result;
  try {
    result = await getServerSupabase()
      .from("dashboard_layouts")
      .select("id, name, layout, is_default, updated_at")
      .eq("owner_id", OWNER_ID)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
  } catch (e) {
    logSupabaseError("getDashboardLayouts", e);
    return { layouts: [], status: "failed" };
  }

  if (result.error) {
    if (isMissingTable(result.error)) {
      if (!warnedMissingLayouts) {
        warnedMissingLayouts = true;
        console.warn(
          "[dashboard] dashboard_layouts is missing — showing the built-in " +
            "layout. Apply supabase/migrations/0038_dashboard_layouts.sql to " +
            "let layouts be saved.",
        );
      }
      return { layouts: [], status: "missing" };
    }
    logSupabaseError("getDashboardLayouts", result.error);
    return { layouts: [], status: "failed" };
  }

  const rows = result.data ?? [];
  // Zero or several rows can be flagged default (see 0038): the first flagged
  // one wins, and with none flagged the first row is treated as the default.
  const defaultId = (rows.find((r) => r.is_default) ?? rows[0])?.id ?? null;
  return {
    status: "ok",
    layouts: rows.map((row) => {
      const { layout, fallback } = readLayout(row.layout);
      return {
        id: row.id,
        name: row.name,
        isDefault: row.id === defaultId,
        layout,
        fallback,
        updatedAt: row.updated_at,
      };
    }),
  };
}

/*
 * Widget reads, de-duplicated per request.
 *
 * Each widget fetches what it draws, so several widgets want the same query —
 * the heatmap, the progress ring, the weekly bars and the goals all read the
 * session series. `cache()` makes each of these one round trip per request no
 * matter how many widgets ask, which is what lets a widget stay self-contained
 * without the page having to know which widgets are on it.
 *
 * These still throw on failure. A widget's failure is caught by its own
 * `WidgetErrorBoundary`; swallowing it here would print "0 sessions" over a
 * real history instead (the mistake `fetchTaskCompletions` documents).
 */
export const getPinnedTracksCached = cache(getPinnedTracks);
export const listTrackOptionsCached = cache(listTrackOptions);
export const getGeneralTasksCached = cache(getGeneralTasks);
export const getSessionTypesCached = cache(getSessionTypes);
export const getSessionStatsByTrackCached = cache(getSessionStatsByTrack);
export const getSunoWorkSummaryCached = cache(getSunoWorkSummary);
export const fetchAnalyticsDataCached = cache(fetchAnalyticsData);
