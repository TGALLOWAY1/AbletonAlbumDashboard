"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pause, Play, Trash2, Upload } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import {
  addVersionRecord,
  deleteVersion,
  getSignedUrl,
} from "@/app/actions/versions";
import type { VersionRow } from "@/lib/types";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—:—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VersionItem({
  version,
  trackId,
}: {
  version: VersionRow;
  trackId: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(
    version.duration_seconds,
  );
  const [pending, start] = useTransition();

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
        alert((e as Error).message);
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
      <Button
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={pending}
        aria-label="Delete version"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AudioVersionList({
  trackId,
  versions,
}: {
  trackId: string;
  versions: VersionRow[];
}) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file) return;
    const finalLabel = label.trim() || file.name.replace(/\.[^.]+$/, "");
    const ext = file.name.split(".").pop() ?? "bin";
    const key = `${trackId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.storage
        .from("track-audio")
        .upload(key, file, { contentType: file.type });
      if (error) throw error;

      const duration = await readAudioDuration(file).catch(() => null);
      await addVersionRecord({
        trackId,
        label: finalLabel,
        storagePath: key,
        durationSeconds: duration,
      });
      setFile(null);
      setLabel("");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Versions
          </h3>
          <span className="text-xs text-muted-foreground">
            {versions.length} {versions.length === 1 ? "version" : "versions"}
          </span>
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <Input
              type="text"
              placeholder="Label (e.g. v3_drop_test)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              onClick={upload}
              disabled={!file || uploading}
              size="sm"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Up to 100MB · mp3, wav, flac, aac, ogg
          </p>
        </div>

        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No versions yet. Upload a bounce above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {versions.map((v) => (
              <li key={v.id}>
                <VersionItem version={v} trackId={trackId} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}
