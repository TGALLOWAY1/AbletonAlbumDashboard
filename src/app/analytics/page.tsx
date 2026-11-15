import { BackLink } from "@/components/back-link";
import { ProgressPanel } from "@/components/home/progress-panel";
import {
  parseProgressTab,
  type ProgressSearchParams,
} from "@/lib/progress-tab";

export const dynamic = "force-dynamic";

/**
 * Analytics: the work heatmap with every figure measured over it, and the
 * session history log.
 *
 * This is the Progress section that used to end the dashboard, unchanged —
 * the same `ProgressPanel`, the same one-range-control rule, the same
 * Overview / History tabs in the URL. It has its own page because the
 * dashboard is now a grid of widgets: several of them (the heatmap, the
 * overview, recent sessions) are small windows onto this data, and this is
 * where they link for the full view. It also means editing or deleting a
 * logged session never depends on which widgets someone has kept.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<ProgressSearchParams>;
}) {
  const tab = parseProgressTab(await searchParams);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex">
        <BackLink fallback="/" label="Back to Home" />
      </div>
      <h1 className="sr-only">Analytics</h1>
      <ProgressPanel tab={tab} />
    </div>
  );
}
