import Link from "next/link";
import { Disc3 } from "lucide-react";
import { ProgressOverviewBody } from "@/components/dashboard/widgets/progress-overview-body";
import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { Button } from "@/components/ui/button";
import { RANGE_OPTIONS, rangeToDays, trimSeriesToDays } from "@/lib/analytics";
import { fetchAnalyticsDataCached } from "@/lib/data/dashboard";
import { getActiveTrackProgressCached } from "@/lib/data/dashboard-progress";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";

/**
 * Progress Overview — how finished the open work is, and how much went into
 * it lately.
 *
 * Two kinds of number share the card and it matters which is which:
 *
 *   - The ring is **now**. "Overall" is the mean of `progressFromStages`
 *     across the active tracks (see `dashboard-progress.ts`) — the same
 *     per-track figure every track card prints, averaged. The card says so
 *     under the ring, so the percentage is not a mystery.
 *   - Tasks done, time logged and days worked are **over the range** in the
 *     widget's settings, read off `getRangeStats` like the Analytics page.
 *     The header names that window.
 *
 * With no active track there is nothing to average. That is an empty state,
 * not "0%": zero would claim the work is unstarted when there is no work.
 */
export async function ProgressOverviewWidget({
  config,
}: WidgetProps<"progress-overview">) {
  const [{ sessions, taskCompletions }, progress] = await Promise.all([
    fetchAnalyticsDataCached(),
    getActiveTrackProgressCached(),
  ]);
  const title = WIDGETS["progress-overview"].name;

  if (progress.percent === null) {
    return (
      <>
        <WidgetHeader title={title} />
        <WidgetBody>
          <WidgetEmpty
            icon={Disc3}
            // Two rows tall there is room for the words, not for the icon and
            // the button as well.
            className="min-h-0 dash-stack:min-h-24 [&>span]:hidden widget-h3:[&>span]:flex dash-stack:[&>span]:flex [&>div]:hidden widget-h3:[&>div]:block dash-stack:[&>div]:block"
            title="No active tracks"
            hint="Overall is the average across your active tracks."
            action={
              <Button asChild size="sm" variant="outline" className="dash-stack:h-9">
                <Link href="/tracks">Open tracks</Link>
              </Button>
            }
          />
        </WidgetBody>
      </>
    );
  }

  const now = new Date();
  const days = rangeToDays(config.range);

  return (
    <>
      <WidgetHeader
        title={title}
        meta={RANGE_OPTIONS.find((o) => o.key === config.range)?.label}
      />
      <WidgetBody>
        <ProgressOverviewBody
          percent={progress.percent}
          trackCount={progress.trackCount}
          range={config.range}
          sessions={trimSeriesToDays(sessions, (s) => s.startedAt, days, now)}
          taskCompletions={trimSeriesToDays(
            taskCompletions,
            (t) => t.completedAt,
            days,
            now,
          )}
        />
      </WidgetBody>
    </>
  );
}
