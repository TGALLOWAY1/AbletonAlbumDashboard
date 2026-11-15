import Link from "next/link";
import { Sparkles } from "lucide-react";
import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { WIDGETS } from "@/lib/dashboard/widgets";
import { getSunoWorkSummaryCached } from "@/lib/data/dashboard";
import type { SunoWorkItem } from "@/lib/data/suno";
import { cn } from "@/lib/utils";

type Bucket = {
  label: string;
  items: SunoWorkItem[];
  variant: NonNullable<BadgeProps["variant"]>;
};

/**
 * Open Suno round-trips by where each one is stuck, one chip per experiment,
 * deep-linking to the track's Suno surface.
 *
 * This is the old home page's Suno strip inside a card. The strip rendered
 * nothing when there was no open work; a widget the user placed cannot
 * vanish, so it says what would be here instead.
 *
 * Narrow, it lists only the buckets that hold something, label and chips on
 * one wrapping line. From 28rem it becomes four columns — every stage of the
 * round trip, empty ones included, each with its count — so the card reads
 * as the pipeline it is and an empty stage is visible as empty.
 */
// No settings, so no props are read; `WIDGET_RENDERERS` still checks this
// against `WidgetProps<"suno-queue">`.
export async function SunoQueueWidget() {
  const summary = await getSunoWorkSummaryCached();
  const buckets: Bucket[] = [
    { label: "Ready to send", items: summary.readyToSend, variant: "default" },
    { label: "Waiting on Suno", items: summary.waiting, variant: "accent" },
    { label: "Needs review", items: summary.needsReview, variant: "warning" },
    { label: "Ready to integrate", items: summary.readyToIntegrate, variant: "primary" },
  ];
  const total = buckets.reduce((acc, b) => acc + b.items.length, 0);
  const title = WIDGETS["suno-queue"].name;

  if (total === 0) {
    return (
      <>
        <WidgetHeader title={title} />
        <WidgetBody>
          <WidgetEmpty
            icon={Sparkles}
            // No icon in the two-row box: title and hint are what fit there.
            className="[&>span]:hidden widget-h3:[&>span]:flex dash-stack:[&>span]:flex"
            title="No open round-trips"
            hint="Start a Suno experiment from a track and it shows here until it is integrated or discarded."
          />
        </WidgetBody>
      </>
    );
  }

  return (
    <>
      <WidgetHeader title={title} meta={`${total} open`} />
      <WidgetBody>
        <ul className="flex flex-col gap-2 @md/widget:grid @md/widget:grid-cols-4 @md/widget:gap-3">
          {buckets.map((bucket) => (
            <li
              key={bucket.label}
              className={cn(
                "min-w-0 flex-wrap items-center gap-1.5 @md/widget:flex @md/widget:flex-col @md/widget:flex-nowrap @md/widget:items-stretch",
                // Narrow boxes skip a stage with nothing in it.
                bucket.items.length > 0 ? "flex" : "hidden",
              )}
            >
              <p className="flex items-baseline justify-between gap-1 text-xs text-muted-foreground">
                <span>
                  {bucket.label}
                  <span className="@md/widget:hidden">:</span>
                </span>
                <span className="hidden font-medium tabular-nums text-foreground @md/widget:inline">
                  {bucket.items.length}
                </span>
              </p>
              {bucket.items.map((item) => (
                <Link
                  key={item.trackId}
                  href={`/tracks/${item.trackId}?tab=suno`}
                  className="max-w-full rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title={item.goal}
                >
                  <Badge
                    variant={bucket.variant}
                    className="max-w-full gap-1 hover:brightness-95 dash-stack:min-h-9"
                  >
                    <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      {item.trackName}
                      {item.count != null && item.count > 0 && ` · ${item.count}`}
                    </span>
                  </Badge>
                </Link>
              ))}
              {bucket.items.length === 0 && (
                <span className="hidden text-xs text-muted-foreground/70 @md/widget:inline">
                  Nothing here
                </span>
              )}
            </li>
          ))}
        </ul>
      </WidgetBody>
    </>
  );
}
