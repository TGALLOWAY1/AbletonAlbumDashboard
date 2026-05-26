import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTracksByStatus } from "@/lib/data/tracks";
import { getSessionTypes } from "@/lib/data/session-types";
import { recommendTrack } from "@/lib/recommend";
import { StartSessionButton } from "@/components/start-session-button";

export async function SidebarFocusPanel() {
  const [active, sessionTypes] = await Promise.all([
    getTracksByStatus("active"),
    getSessionTypes(),
  ]);
  const recommendation = recommendTrack(active);

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" />
        Focus Mode
      </div>

      {recommendation ? (
        <>
          <div className="mt-3 text-xs text-muted-foreground">Today&apos;s Focus</div>
          <div className="mt-1 text-sm font-semibold leading-tight">
            {recommendation.track.name}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {recommendation.primaryAction
              ? recommendation.primaryAction.description
              : "No primary task set yet."}
          </p>
          <Button asChild size="sm" className="mt-3 w-full">
            <Link href={`/focus/${recommendation.track.id}`}>
              <Play className="h-3.5 w-3.5" />
              Start Focus Session
            </Link>
          </Button>
        </>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            No active tracks yet. Add one to get a focus suggestion.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link href="/tracks/new">Add a track</Link>
          </Button>
        </>
      )}

      <StartSessionButton sessionTypes={sessionTypes} />
    </section>
  );
}
