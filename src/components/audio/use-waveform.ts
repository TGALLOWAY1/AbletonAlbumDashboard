"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { getSignedUrl } from "@/app/actions/versions";

/**
 * Shared wavesurfer lifecycle for audio stored in the private track-audio
 * bucket: fetches a signed URL, renders the waveform into `containerRef`,
 * and exposes play/pause state. Used by VersionItem and SunoCandidateItem.
 */
export function useWaveform(
  storagePath: string,
  initialDuration: number | null = null,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(initialDuration);

  useEffect(() => {
    let cancelled = false;
    let ws: WaveSurfer | null = null;
    (async () => {
      try {
        const url = await getSignedUrl(storagePath);
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
  }, [storagePath]);

  const toggle = () => {
    const ws = wsRef.current;
    if (!ws || !ready) return;
    if (playing) ws.pause();
    else ws.play();
  };

  const pause = () => {
    wsRef.current?.pause();
  };

  return { containerRef, ready, playing, duration, toggle, pause };
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—:—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
