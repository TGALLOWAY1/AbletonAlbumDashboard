import Link from "next/link";
import { Sparkles, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { CopyPathButton } from "@/components/copy-path-button";
import { progressFromStages } from "@/lib/types";
import type { Recommendation } from "@/lib/recommend";

// Dashboard hero: the one track (and one action) to work on right now.
// Rendered on both breakpoints — the dashboard is a single responsive surface.
export function NextUpCard({ rec }: { rec: Recommendation | null }) {
  if (!rec) return null;

  const progress = progressFromStages(rec.track.stages);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
      <CardContent className="flex flex-col gap-4 p-5 md:p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Next up
        </div>

        <div className="flex items-start gap-4">
          {rec.track.cover_image_url && (
            <div className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2 sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rec.track.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/tracks/${rec.track.id}`}
                className="text-xl font-semibold leading-tight hover:underline md:text-2xl"
              >
                {rec.track.name}
              </Link>
              <Badge variant="primary">{rec.reason}</Badge>
            </div>

            {rec.primaryAction ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Next action:{" "}
                <span className="text-foreground">
                  {rec.primaryAction.description}
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">
                No next action yet —{" "}
                <Link
                  href={`/tracks/${rec.track.id}`}
                  className="text-primary hover:underline"
                >
                  set one
                </Link>
                .
              </p>
            )}
          </div>

          <ProgressRing value={progress} size={56} stroke={5} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/focus/${rec.track.id}`}>
              <Play className="h-4 w-4" />
              Start focus session
            </Link>
          </Button>
          {rec.track.als_file_path && (
            <CopyPathButton path={rec.track.als_file_path} size="md" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
