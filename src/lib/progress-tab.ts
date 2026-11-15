/**
 * Which panel the Analytics page shows.
 *
 * Held in the URL (`/analytics?progress=history`) rather than in client
 * state, for the same reasons as the collection pages' view preference
 * (`view-mode.ts`): the page stays a server component and the choice is
 * linkable. Here it also decides how much work a request does — the history
 * log is a much heavier fetch than the overview, so only the selected panel
 * is rendered. The default is omitted from the query string, so a plain
 * `/analytics` never grows a param it doesn't need.
 *
 * The panel used to be the last section of the dashboard, addressed as
 * `/#progress`. The dashboard is now a grid of widgets, several of which are
 * windows onto this same data, so the full view has its own page and the old
 * addresses redirect to it (see `src/app/page.tsx`).
 */

/** Where the full progress view lives. */
export const ANALYTICS_PATH = "/analytics";

export const PROGRESS_TABS = ["overview", "history"] as const;
export type ProgressTab = (typeof PROGRESS_TABS)[number];

export const DEFAULT_PROGRESS_TAB: ProgressTab = "overview";

export type ProgressSearchParams = {
  progress?: string | string[];
};

export function parseProgressTab(params: ProgressSearchParams): ProgressTab {
  const value = (
    Array.isArray(params.progress) ? params.progress[0] : params.progress
  )?.trim();
  return PROGRESS_TABS.includes(value as ProgressTab)
    ? (value as ProgressTab)
    : DEFAULT_PROGRESS_TAB;
}

/** Href for a tab. */
export function progressTabHref(tab: ProgressTab): string {
  return tab === DEFAULT_PROGRESS_TAB
    ? ANALYTICS_PATH
    : `${ANALYTICS_PATH}?progress=${tab}`;
}
