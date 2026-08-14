"use client";

import { useTransition } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteVersion } from "@/app/actions/versions";
import {
  formatDuration,
  useWaveform,
} from "@/components/audio/use-waveform";
import { useToast } from "@/components/toast";
import type { VersionRow } from "@/lib/types";

export function VersionItem({
  version,
  trackId,
  showDelete = true,
  parentLabel,
  sunoAction,
}: {
  version: VersionRow;
  trackId: string;
  showDelete?: boolean;
  /** Label of the version this one is a Suno variation of. */
  parentLabel?: string;
  /** Optional per-row affordance (e.g. "Get Suno variations"). */
  sunoAction?: React.ReactNode;
}) {
  const { containerRef, ready, playing, duration, toggle } = useWaveform(
    version.storage_path,
    version.duration_seconds,
  );
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const remove = () => {
    if (!confirm(`Delete version "${version.label}"?`)) return;
    start(async () => {
      try {
        await deleteVersion(version.id, trackId);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
      <Button
        variant="outline"
        size="icon"
        onClick={toggle}
        disabled={!ready || pending}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <div className="truncate text-sm font-medium">{version.label}</div>
            {version.source === "suno" && (
              <Badge variant="accent">Suno</Badge>
            )}
            {version.review_status === "keeper" && (
              <Badge variant="primary">Keeper</Badge>
            )}
            {version.review_status === "mined" && <Badge>Mined</Badge>}
            {parentLabel && <Badge>Variation of {parentLabel}</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDuration(duration)}
          </div>
        </div>
        <div ref={containerRef} className="mt-1 w-full" />
      </div>
      {sunoAction}
      {showDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={remove}
          disabled={pending}
          aria-label="Delete version"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
