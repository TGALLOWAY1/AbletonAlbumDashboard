import Link from "next/link";
import { Sparkles, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyPathButton } from "@/components/copy-path-button";
import type { Recommendation } from "@/lib/recommend";

export function RecommendationCard({ rec }: { rec: Recommendation | null }) {
  if (!rec) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="flex flex-col gap-3 p-6 text-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            What should you work on now?
          </div>
          <p className="text-muted-foreground">
            No active tracks yet. Add one to get a recommendation.
          </p>
          <Button asChild size="sm" variant="outline" className="self-start">
            <Link href="/tracks/new">Add a track</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          What should you work on now?
        </div>

        <div className="flex flex-col gap-1">
          <Link
            href={`/tracks/${rec.track.id}`}
            className="text-2xl font-semibold leading-tight hover:underline"
          >
            {rec.track.name}
          </Link>
          <Badge variant="primary" className="self-start">
            {rec.reason}
          </Badge>
        </div>

        {rec.primaryAction ? (
          <p className="text-sm text-muted-foreground">
            Suggested action:{" "}
            <span className="text-foreground">
              {rec.primaryAction.description}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No primary action yet — open the track to set one.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/focus/${rec.track.id}`}>
              <Play className="h-4 w-4" />
              Start focus session
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/tracks/${rec.track.id}`}>Open detail</Link>
          </Button>
          {rec.track.als_file_path && (
            <CopyPathButton path={rec.track.als_file_path} size="md" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
