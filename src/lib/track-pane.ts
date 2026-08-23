/**
 * Which of the track workspace's three surfaces the mobile page shows.
 *
 * Desktop renders Tasks, Notes and the track log side by side; a phone can
 * only show one at a time, so it gets the same three surfaces as tabs. The
 * choice lives in the URL (`/m/<id>?pane=notes`) rather than client state, for
 * the same reasons as the dashboard's progress tab (`progress-tab.ts`): the
 * page stays a server component and the view is linkable. The default is
 * omitted from the query string so a plain track link never grows a param.
 */

export const TRACK_PANES = ["tasks", "notes", "log"] as const;
export type TrackPane = (typeof TRACK_PANES)[number];

export const DEFAULT_TRACK_PANE: TrackPane = "tasks";

export const TRACK_PANE_LABELS: Record<TrackPane, string> = {
  tasks: "Tasks",
  notes: "Notes",
  log: "Log",
};

export type TrackPaneSearchParams = {
  pane?: string | string[];
};

export function parseTrackPane(params: TrackPaneSearchParams): TrackPane {
  const value = (
    Array.isArray(params.pane) ? params.pane[0] : params.pane
  )?.trim();
  return TRACK_PANES.includes(value as TrackPane)
    ? (value as TrackPane)
    : DEFAULT_TRACK_PANE;
}

export function trackPaneHref(trackId: string, pane: TrackPane): string {
  return pane === DEFAULT_TRACK_PANE
    ? `/m/${trackId}`
    : `/m/${trackId}?pane=${pane}`;
}
