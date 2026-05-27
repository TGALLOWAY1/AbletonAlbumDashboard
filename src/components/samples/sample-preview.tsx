"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Check, Clipboard, Pause, Play, Square, X } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { fileToObjectUrl } from "@/lib/samples/fs-access";
import type { ReviewStatus } from "@/lib/types";
import type { SampleVM } from "@/lib/samples/types";

export type PreviewHandle = { toggle: () => void };

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—:—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const SamplePreview = forwardRef<
  PreviewHandle,
  {
    sample: SampleVM | null;
    status: ReviewStatus;
    onAdd: (vm: SampleVM) => void;
    onReject: (vm: SampleVM) => void;
  }
>(function SamplePreview({ sample, status, onAdd, onReject }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useImperativeHandle(ref, () => ({
    toggle: () => {
      const ws = wsRef.current;
      if (!ws || !ready) return;
      if (ws.isPlaying()) ws.pause();
      else ws.play();
    },
  }));

  useEffect(() => {
    setReady(false);
    setPlaying(false);
    setDuration(null);
    if (!sample || !containerRef.current) return;

    let cancelled = false;
    let ws: WaveSurfer | null = null;
    let objectUrl: string | null = null;

    (async () => {
      try {
        objectUrl = await fileToObjectUrl(sample.handle);
        if (cancelled || !containerRef.current) return;
        ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: "#4a5568",
          progressColor: "#4ade80",
          cursorColor: "#fbbf24",
          barWidth: 2,
          barRadius: 2,
          height: 72,
          normalize: true,
        });
        wsRef.current = ws;
        ws.on("ready", () => {
          setReady(true);
          setDuration(ws?.getDuration() ?? null);
          ws?.play().catch(() => {});
        });
        ws.on("play", () => setPlaying(true));
        ws.on("pause", () => setPlaying(false));
        ws.on("finish", () => setPlaying(false));
        ws.load(objectUrl);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
      ws?.destroy();
      wsRef.current = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sample]);

  const copyPath = async () => {
    if (!sample) return;
    try {
      await navigator.clipboard.writeText(sample.relPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  if (!sample) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a sample to preview.
      </div>
    );
  }

  const ws = wsRef.current;

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{sample.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {sample.relPath}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>{sample.type}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => (playing ? ws?.pause() : ws?.play())}
          disabled={!ready}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => ws?.stop()}
          disabled={!ready}
          aria-label="Stop"
        >
          <Square className="h-4 w-4" />
        </Button>
        <div ref={containerRef} className="min-w-0 flex-1" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={status === "added_to_favorites" ? "accent" : "default"}
          size="sm"
          onClick={() => onAdd(sample)}
        >
          <Check className="h-4 w-4" />
          Add to Favorites
          <kbd className="ml-1 rounded bg-black/20 px-1 text-[10px]">A</kbd>
        </Button>
        <Button variant="outline" size="sm" onClick={() => onReject(sample)}>
          <X className="h-4 w-4" />
          Mark Reviewed
          <kbd className="ml-1 rounded bg-black/20 px-1 text-[10px]">S</kbd>
        </Button>
        <Button variant="ghost" size="sm" onClick={copyPath}>
          <Clipboard className="h-4 w-4" />
          {copied ? "Copied" : "Copy original path"}
        </Button>
      </div>
    </div>
  );
});
