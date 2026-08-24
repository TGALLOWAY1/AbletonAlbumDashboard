import Link from "next/link";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { SessionHistory } from "@/components/sessions/session-history";
import {
  TABS_LIST_CLASS,
  TABS_TRIGGER_CLASS,
  TABS_TRIGGER_ACTIVE_CLASS,
} from "@/components/ui/tabs-classes";
import { fetchAnalyticsData } from "@/lib/data/analytics";
import { cn } from "@/lib/utils";
import {
  PROGRESS_TABS,
  progressTabHref,
  type ProgressTab,
} from "@/lib/progress-tab";

const TAB_LABELS: Record<ProgressTab, string> = {
  overview: "Overview",
  history: "History",
};

// The dashboard's progress section (formerly the standalone /analytics page):
// long-range work patterns plus the focus-session history log.
//
// Only the selected panel is rendered. Both are server components, so a
// client-side tab would still run the hidden panel's queries on every
// dashboard request — and history is the expensive one (the session log plus
// every track and session type, for the manual-entry dialog). The tab lives in
// the URL instead, which keeps that cost on the requests that ask for it and
// makes the view linkable. See `src/lib/progress-tab.ts`.
export async function ProgressPanel({ tab }: { tab: ProgressTab }) {
  const { sessions, tracks, taskCompletions } =
    tab === "overview"
      ? await fetchAnalyticsData()
      : { sessions: [], tracks: [], taskCompletions: [] };

  return (
    <section id="progress" className="flex flex-col gap-3">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Progress
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a window — every figure below is measured over it.
        </p>
      </div>

      <div>
        <div className={TABS_LIST_CLASS} role="tablist">
          {PROGRESS_TABS.map((value) => {
            const active = value === tab;
            return (
              <Link
                key={value}
                href={progressTabHref(value)}
                role="tab"
                aria-selected={active}
                scroll={false}
                className={cn(
                  TABS_TRIGGER_CLASS,
                  active && TABS_TRIGGER_ACTIVE_CLASS,
                )}
              >
                {TAB_LABELS[value]}
              </Link>
            );
          })}
        </div>

        <div className="mt-4">
          {tab === "overview" ? (
            <AnalyticsDashboard
              sessions={sessions}
              tracks={tracks}
              taskCompletions={taskCompletions}
            />
          ) : (
            <SessionHistory />
          )}
        </div>
      </div>
    </section>
  );
}
