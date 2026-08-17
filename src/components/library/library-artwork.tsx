"use client";

import * as React from "react";
import { MiniWaveform } from "@/components/library/mini-waveform";
import { cn } from "@/lib/utils";

/**
 * An asset's visual identity: its uploaded artwork, or — when there is none,
 * or the upload 404s — a waveform generated deterministically from its id, so
 * the same asset always draws the same bars and stays recognisable at a glance.
 */
export function LibraryArtwork({
  id,
  artworkUrl,
  className,
  waveformBars = 40,
  waveformHeight = 44,
}: {
  id: string;
  artworkUrl?: string;
  className?: string;
  waveformBars?: number;
  waveformHeight?: number;
}) {
  // Remember which URL failed rather than a bare boolean, so a card React
  // recycles for a different asset doesn't stay stuck on the fallback.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const showArtwork = Boolean(artworkUrl) && failedUrl !== artworkUrl;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-surface-2 to-accent/10",
        className,
      )}
    >
      {showArtwork ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artworkUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(artworkUrl ?? null)}
        />
      ) : (
        <div className="w-full px-3">
          <MiniWaveform
            id={id}
            bars={waveformBars}
            height={waveformHeight}
            className="text-primary/45"
          />
        </div>
      )}
    </div>
  );
}
