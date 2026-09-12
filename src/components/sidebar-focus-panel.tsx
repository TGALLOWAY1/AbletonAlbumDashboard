import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTracksByStatus } from "@/lib/data/tracks";
import { getSessionCountsByTrackSince } from "@/lib/data/sessions";
import { getSessionTypes } from "@/lib/data/session-types";
import { recommendTrack } from "@/lib/recommend";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { SidebarFocusLink } from "@/components/sidebar-focus-link";
import { StartSessionButton } from "@/components/start-session-button";

/**
 * The three reads behind the recommendation, or null when any of them
 * failed.
 *
 * This panel is root-layout chrome, rendered on every page (and on the
 * server for phones too, where CSS hides it). A throw here has no page
 * boundary above it — it reaches `global-error.tsx` and replaces the whole
 * app, whichever page the user was on. That is how a transient Supabase
 * "Gateway Timeout" during a resources-page refresh became a full-screen
 * "Something went wrong" for a save that had already succeeded. The fetchers
 * themselves keep throwing, because on their own pages a failed read *should*
 * reach that page's error boundary; the chrome is what has to degrade.
 */
async function loadFocusPanel() {
  try {
    const [active, sessionTypes, recentCounts] = await Promise.all([
      getTracksByStatus("active"),
      getSessionTypes(),
      getSessionCountsByTrackSince(7),
    ]);
    return { active, sessionTypes, recentCounts };
  } catch (e) {
    logSupabaseError("SidebarFocusPanel", e);
    return null;
  }
}

export async function SidebarFocusPanel() {
  const data = await loadFocusPanel();
  // No recommendation to offer, but starting a session never depended on one.
  if (!data) return <SidebarFocusLink />;
  const { active, sessionTypes, recentCounts } = data;
  const recommendation = recommendTrack(active, recentCounts);

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
            {recommendation.nextTask
              ? recommendation.nextTask.description
              : "No open tasks yet."}
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
