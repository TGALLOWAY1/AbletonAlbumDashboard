import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { SessionHistory } from "@/components/sessions/session-history";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { fetchAnalyticsData } from "@/lib/data/analytics";

// The dashboard's progress section (formerly the standalone /analytics page):
// long-range work patterns plus the focus-session history log. Server
// component — it fetches the analytics rows and hands them to the client
// dashboard; the tabs keep history out of the way until asked for.
export async function ProgressPanel() {
  const { sessions, tracks, bottlenecks } = await fetchAnalyticsData();

  return (
    <section id="progress" className="flex flex-col gap-3">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Progress
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The patterns underneath the work.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AnalyticsDashboard
            sessions={sessions}
            tracks={tracks}
            bottlenecks={bottlenecks}
          />
        </TabsContent>

        <TabsContent value="history">
          <SessionHistory />
        </TabsContent>
      </Tabs>
    </section>
  );
}
