import { WeeklyActivityChart } from "@/components/dashboard/widgets/weekly-activity-chart";
import { trimSeriesToDays } from "@/lib/analytics";
import { fetchAnalyticsDataCached } from "@/lib/data/dashboard";
import { WIDGETS } from "@/lib/dashboard/widgets";

/**
 * This Week — time logged on each day of the current week, Monday to Sunday.
 *
 * The week is the reader's own (their local Monday), so the server only
 * reads the session series and hands over its recent tail; the chart cuts
 * the week in the browser with `buildWeekActivity`, which measures with the
 * same helpers as the heatmap. A day's bar here and that day's square there
 * are one number.
 */
export async function WeeklyActivityWidget() {
  const { sessions } = await fetchAnalyticsDataCached();

  return (
    <WeeklyActivityChart
      title={WIDGETS["weekly-activity"].name}
      // A week is at most seven days back; the helper adds the zone margin.
      sessions={trimSeriesToDays(sessions, (s) => s.startedAt, 7)}
    />
  );
}
