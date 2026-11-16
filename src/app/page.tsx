import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WidgetHost } from "@/components/dashboard/widget-host";
import { getDashboardLayouts, listTrackOptionsCached } from "@/lib/data/dashboard";
import { pickActiveLayout } from "@/lib/dashboard/layout";
import { logSupabaseError } from "@/lib/supabase/log-error";
import {
  DEFAULT_PROGRESS_TAB,
  parseProgressTab,
  progressTabHref,
} from "@/lib/progress-tab";

export const dynamic = "force-dynamic";

type DashboardSearchParams = {
  layout?: string | string[];
  progress?: string | string[];
};

/**
 * The dashboard.
 *
 * A grid of widgets the user arranges: which ones, where, how big, and with
 * what settings is a saved layout (migration 0038), and there can be several
 * named ones. This page's whole job is to pick the layout the request is
 * for, render one widget per instance in it, and hand both to
 * `DashboardShell`, which draws the grid and runs the edit mode.
 *
 * It no longer fetches what the widgets show. Each widget is an async server
 * component that reads its own data behind its own Suspense and error
 * boundary (`WidgetHost`), so the page does not need to know which widgets
 * are on it, a slow query delays one card instead of the response, and a
 * failed one costs one card instead of the page. Queries several widgets
 * share are de-duplicated per request in `src/lib/data/dashboard.ts`.
 *
 * What the page used to be — header buttons, the pinned shortlist, the Suno
 * strip, studio tasks, the Progress section — is all still here as widgets
 * in the default layout, in that order on a phone. The Progress section's
 * full view (range tabs, the session history log) moved to `/analytics`.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const params = await searchParams;

  // `/?progress=history` addressed the History tab while Progress was a
  // section of this page. Bookmarks and old links follow it to its new home.
  const progressTab = parseProgressTab(params);
  if (progressTab !== DEFAULT_PROGRESS_TAB) redirect(progressTabHref(progressTab));

  const requested = Array.isArray(params.layout) ? params.layout[0] : params.layout;

  const [{ layouts, status }, tracks] = await Promise.all([
    getDashboardLayouts(),
    // Only the settings dialog's track pickers need this. A failure there
    // should cost the pickers their options, not the dashboard its widgets.
    listTrackOptionsCached().catch((e) => {
      logSupabaseError("DashboardPage.trackOptions", e);
      return [];
    }),
  ]);

  const active = pickActiveLayout(layouts, requested);

  const nodes: Record<string, ReactNode> = {};
  for (const item of active.layout.items) {
    nodes[item.id] = (
      <WidgetHost type={item.type} config={item.config} instanceId={item.id} />
    );
  }

  return (
    <DashboardShell
      layouts={layouts.map(({ id, name, isDefault }) => ({ id, name, isDefault }))}
      active={active}
      status={status}
      nodes={nodes}
      tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}
