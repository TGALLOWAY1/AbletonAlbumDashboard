"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { deleteVersion, getSignedUrl } from "@/app/actions/versions";
import { useToast } from "@/components/toast";
import type { VersionRow } from "@/lib/types";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—:—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VersionItem({
  version,
  trackId,
  showDelete = true,
}: {
  version: VersionRow;
  trackId: string;
  showDelete?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(
    version.duration_seconds,
  );
  const [pending, start] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    let ws: WaveSurfer | null = null;
    (async () => {
      try {
        const url = await getSignedUrl(version.storage_path);
        if (cancelled || !containerRef.current) return;
        ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: "#4a5568",
          progressColor: "#4ade80",
          cursorColor: "#fbbf24",
          barWidth: 2,
          barRadius: 2,
          height: 56,
          normalize: true,
        });
        wsRef.current = ws;
        ws.on("ready", () => {
          setReady(true);
          setDuration(ws?.getDuration() ?? null);
        });
        ws.on("play", () => setPlaying(true));
        ws.on("pause", () => setPlaying(false));
        ws.on("finish", () => setPlaying(false));
        ws.load(url);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      ws?.destroy();
      wsRef.current = null;
    };
  }, [version.storage_path]);

  const toggle = () => {
    const ws = wsRef.current;
    if (!ws || !ready) return;
    if (playing) ws.pause();
    else ws.play();
  };

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
          <div className="truncate text-sm font-medium">{version.label}</div>
          <div className="text-xs text-muted-foreground">
            {formatDuration(duration)}
          </div>
        </div>
        <div ref={containerRef} className="mt-1 w-full" />
      </div>
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
