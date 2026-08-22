/**
 * Which panel the dashboard's Progress section shows.
 *
 * Held in the URL (`/?progress=history`) rather than in client state, for the
 * same reasons as the collection pages' view preference (`view-mode.ts`): the
 * section stays a server component and the choice is linkable. Here it also
 * decides how much work a dashboard request does — the history log is a much
 * heavier fetch than the overview, so only the selected panel is rendered.
 * The default is omitted from the query string, so a plain `/` never grows a
 * param it doesn't need.
 */

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

/**
 * Href for a tab. Anchored to the section so switching tabs lands the reader
 * back at Progress instead of the top of the dashboard.
 */
export function progressTabHref(tab: ProgressTab): string {
  return tab === DEFAULT_PROGRESS_TAB ? "/#progress" : `/?progress=${tab}#progress`;
}
