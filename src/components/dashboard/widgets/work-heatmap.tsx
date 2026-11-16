import { WorkHeatmapPanel } from "@/components/dashboard/widgets/work-heatmap-panel";
import { rangeToDays, trimSeriesToDays } from "@/lib/analytics";
import { fetchAnalyticsDataCached } from "@/lib/data/dashboard";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";

/**
 * Work Heatmap — every day worked, shaded by how long.
 *
 * A small window onto the Analytics page, drawn by the same `WorkHeatmap` and
 * measured by the same `getRangeStats`, so the two can never show different
 * squares or different totals for one range.
 *
 * The server's part is only the read. Which days the window covers depends on
 * the reader's calendar, which only the browser knows, so the series goes
 * down raw (trimmed to the longest range the switcher offers) and the panel
 * computes — the arrangement `AnalyticsDashboard` uses.
 */
export async function WorkHeatmapWidget({ config }: WidgetProps<"work-heatmap">) {
  const { sessions, taskCompletions } = await fetchAnalyticsDataCached();
  const now = new Date();
  const longest = rangeToDays("1y");

  return (
    <WorkHeatmapPanel
      // The range switcher is a local view choice that *starts* at the saved
      // setting; re-keying means a change in Settings is picked up rather
      // than shadowed by whatever was last clicked.
      key={config.range}
      title={WIDGETS["work-heatmap"].name}
      initialRange={config.range}
      sessions={trimSeriesToDays(sessions, (s) => s.startedAt, longest, now)}
      taskCompletions={trimSeriesToDays(
        taskCompletions,
        (t) => t.completedAt,
        longest,
        now,
      )}
    />
  );
}
