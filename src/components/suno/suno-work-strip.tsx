import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SunoWorkItem, SunoWorkSummary } from "@/lib/data/suno";

// Server component: a compact strip of open Suno round-trips, one chip per
// experiment, deep-linking to the track's Suno surface. Renders nothing when
// there is no open Suno work — the dashboard stays quiet by default.
export function SunoWorkStrip({ summary }: { summary: SunoWorkSummary }) {
  const buckets: Array<{
    label: string;
    items: SunoWorkItem[];
    variant: "default" | "accent" | "warning" | "primary";
  }> = [
    { label: "Ready to send", items: summary.readyToSend, variant: "default" },
    { label: "Waiting on Suno", items: summary.waiting, variant: "accent" },
    { label: "Needs review", items: summary.needsReview, variant: "warning" },
    {
      label: "Ready to integrate",
      items: summary.readyToIntegrate,
      variant: "primary",
    },
  ];
  const total = buckets.reduce((acc, b) => acc + b.items.length, 0);
  if (total === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Suno round-trips · {total}
      </h2>
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
        {buckets
          .filter((b) => b.items.length > 0)
          .map((bucket) => (
            <div
              key={bucket.label}
              className="flex flex-wrap items-center gap-1.5"
            >
              <span className="text-xs text-muted-foreground">
                {bucket.label}:
              </span>
              {bucket.items.map((item) => (
                <Link
                  key={item.trackId}
                  href={`/tracks/${item.trackId}?tab=suno`}
                  className="max-w-full"
                  title={item.goal}
                >
                  <Badge
                    variant={bucket.variant}
                    className="max-w-full gap-1 hover:bg-surface-2/80"
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {item.trackName}
                      {item.count != null && item.count > 0 && ` · ${item.count}`}
                    </span>
                  </Badge>
                </Link>
              ))}
            </div>
          ))}
      </div>
    </section>
  );
}
