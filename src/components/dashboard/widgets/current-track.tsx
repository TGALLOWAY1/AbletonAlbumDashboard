import Link from "next/link";
import { format } from "date-fns";
import { Disc3, Play } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { Button } from "@/components/ui/button";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";
import { getPinnedTracksCached } from "@/lib/data/dashboard";
import { getTrack } from "@/lib/data/tracks";
import {
  currentStageLabel,
  isTrackStale,
  progressFromStages,
  type TrackWithDetails,
} from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";

/**
 * `WidgetEmpty` for a box that may be two rows tall. Under a header that
 * leaves about 100px, which holds a title and one more thing — so the icon
 * and the outer padding only appear from three rows up (or stacked, where
 * the box is as tall as it needs to be).
 */
const EMPTY_COMPACT =
  "min-h-0 py-1 [&>span]:hidden widget-h3:min-h-24 widget-h3:py-3 widget-h3:[&>span]:flex dash-stack:min-h-24 dash-stack:py-3 dash-stack:[&>span]:flex";

/**
 * The song you are on, as the dashboard's hero.
 *
 * With no track chosen in its settings it follows the top of the pinned
 * shortlist — the pin order *is* the priority order, so "current" needs no
 * flag of its own (0027 dropped the one-track `is_focus` for that reason).
 * Drag another track to the top of the shortlist and this card follows.
 *
 * It is the one full-bleed widget: the cover fills the card under a dark
 * gradient, so it draws no `WidgetHeader` and names itself with an eyebrow
 * instead. What it adds as the box grows is information, not scale — the
 * small box is title, percent, bar and a play button; wider boxes say how
 * many tasks are open and name the next one; taller ones add the stage, when
 * it was last worked and the estimated time left.
 */
export async function CurrentTrackWidget({ config }: WidgetProps<"current-track">) {
  const name = WIDGETS["current-track"].name;

  if (config.trackId == null) {
    const [top] = await getPinnedTracksCached();
    if (!top) {
      return (
        <>
          <WidgetHeader title={name} />
          <WidgetBody>
            <WidgetEmpty
              icon={Disc3}
              className={EMPTY_COMPACT}
              title="Nothing pinned yet"
              hint={
                // The two-row box keeps the title and the button; the
                // sentence between them is what it has no room for.
                <span className="hidden widget-h3:inline dash-stack:inline">
                  This follows the top of your pinned shortlist. Pin a track
                  to see it here.
                </span>
              }
              action={
                <Button asChild size="sm" variant="outline" className="dash-stack:h-9">
                  <Link href="/tracks">Pin a track</Link>
                </Button>
              }
            />
          </WidgetBody>
        </>
      );
    }
    return <CurrentTrackHero track={top} />;
  }

  const track = await getTrack(config.trackId);
  if (!track || track.status === "archived") {
    return (
      <>
        <WidgetHeader title={name} />
        <WidgetBody>
          <WidgetEmpty
            icon={Disc3}
            className={EMPTY_COMPACT}
            title={track ? "This track is archived" : "This track is gone"}
            // Short enough to fit the two-row box under its header.
            hint="Choose another in this widget's settings: Customize, then its menu."
          />
        </WidgetBody>
      </>
    );
  }
  return <CurrentTrackHero track={track} />;
}

function CurrentTrackHero({ track }: { track: TrackWithDetails }) {
  const progress = Math.max(0, Math.min(100, progressFromStages(track.stages)));
  const open = track.openTaskCount;
  const next = track.nextTask?.description ?? null;
  const totalTasks = track.openTaskCount + track.completedTaskCount;
  // Read once per request, on the server — nothing here re-renders on a clock.
  const stale = isTrackStale(track, new Date().getTime());
  const lastWorked = track.last_worked_at
    ? format(new Date(track.last_worked_at), "MMM d")
    : null;

  return (
    <div className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-neutral-900 p-4 text-white widget-h3:@md/widget:p-5 widget-h4:p-5">
      {/* The frame for the artwork is the card itself: `CoverArt` fills its
          nearest positioned ancestor, and this root is `relative` with the
          grid cell's dimensions (or, stacked, its content's). */}
      {track.cover_image_url ? (
        <CoverArt
          src={track.cover_image_url}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="-z-20"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-gradient-to-br from-neutral-800 via-neutral-900 to-primary/40"
        />
      )}
      {/* Dark enough at the text edge for white type on any cover, and never
          clear: a pale cover behind the bar would wash it out. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/65 to-black/35"
      />

      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
        Current track
      </p>

      <h2 className="mt-1 text-lg font-semibold leading-tight tracking-tight widget-h3:@md/widget:text-2xl widget-h4:text-xl widget-h4:@md/widget:text-2xl dash-stack:text-xl">
        <Link
          href={`/tracks/${track.id}`}
          className="line-clamp-1 rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white widget-h4:line-clamp-2 dash-stack:-my-1.5 dash-stack:py-1.5"
        >
          {track.name}
        </Link>
      </h2>

      <p className="mt-1 truncate text-xs tabular-nums text-white/80 @md/widget:text-sm">
        {progress}% complete
        {/* The open-task count joins from 20rem — every box but the
            narrowest small one — and on a phone. */}
        <span className="hidden @xs/widget:inline widget-h3:inline dash-stack:inline">
          <span aria-hidden> · </span>
          {open} open {open === 1 ? "task" : "tasks"}
        </span>
      </p>

      {/* Not in the two-row box: it has room for the title, the figure and
          the bar, and a truncated half-line of a task says less than none. */}
      <div className="mt-3 hidden min-w-0 widget-h3:block dash-stack:block">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          Next
        </p>
        <p className="line-clamp-1 text-sm wrap-anywhere text-white/95 widget-h4:line-clamp-2 widget-h5:line-clamp-3 dash-stack:line-clamp-2">
          {next ?? (
            <span className="text-white/70">
              No open tasks — add one to give it a next step.
            </span>
          )}
        </p>
      </div>

      {/* The facts a tall box has room for. All of them are already on
          `TrackWithDetails`; none is fetched for this card. */}
      <dl className="mt-3 hidden grid-cols-1 gap-x-6 gap-y-1.5 text-xs widget-h4:grid @md/widget:grid-cols-3">
        {/* The stage is the fact a narrow column drops: with a two-line
            title, three stacked rows do not fit above the bar. */}
        <Fact
          label="Stage"
          value={currentStageLabel(track.stages)}
          className="hidden @md/widget:block"
        />
        <Fact
          label="Last worked"
          value={
            lastWorked
              ? stale
                ? `${lastWorked} · going stale`
                : lastWorked
              : "Not yet"
          }
        />
        {track.estMinutesRemaining > 0 && (
          <Fact
            label="Time left"
            value={`${formatMinutes(track.estMinutesRemaining)} estimated`}
          />
        )}
        {totalTasks > 0 && (
          // Only the five-row box: `contents` so the fact is still a cell of
          // the grid above rather than a box of its own.
          <div className="hidden widget-h5:contents">
            <Fact
              label="Tasks done"
              value={`${track.completedTaskCount} of ${totalTasks}`}
            />
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center gap-3 pt-3">
        <div
          role="progressbar"
          aria-label={`${track.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* One control at every size: a round play button that grows a label
            where there is width for one. */}
        <Link
          href={`/focus/${track.id}`}
          aria-label={`Start session on ${track.name}`}
          className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-medium text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-white @md/widget:px-4 dash-stack:h-10 dash-stack:px-4"
        >
          <Play className="h-4 w-4 fill-current" aria-hidden />
          <span className="hidden @md/widget:inline dash-stack:inline">
            Start session
          </span>
        </Link>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-baseline justify-between gap-2 @md/widget:block",
        className,
      )}
    >
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-white/60">
        {label}
      </dt>
      <dd className="truncate tabular-nums text-white/95">{value}</dd>
    </div>
  );
}
