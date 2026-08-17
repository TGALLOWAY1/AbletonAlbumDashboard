"use client";

import { Pause, Play, VolumeX } from "lucide-react";
import { LibraryArtwork } from "@/components/library/library-artwork";
import { useLibraryPlayer } from "@/components/library/library-player-provider";
import { cn } from "@/lib/utils";
import type { PlayableAsset } from "@/lib/data/library";

/**
 * The audition target shared by every asset card: the whole artwork area is
 * one big play button, with the transport state drawn over it.
 *
 * An asset with no preview renders a muted, disabled control that says so,
 * rather than a play button that looks live and does nothing.
 */
export function LibraryPlayTile({
  asset,
  queue,
  className,
  waveformBars,
  corner,
  size = "md",
}: {
  asset: PlayableAsset;
  /** The visible result set, so previous/next follows what's on screen. */
  queue: PlayableAsset[];
  className?: string;
  waveformBars?: number;
  /** Rendered over the top-right of the artwork (bars count, Core dot…). */
  corner?: React.ReactNode;
  /** "sm" for list rows, where a browse-sized control would cover the tile. */
  size?: "sm" | "md";
}) {
  const player = useLibraryPlayer();
  const playable = Boolean(asset.previewUrl);
  const playing = player.isPlaying(asset.id);
  const active = player.isCurrent(asset.id);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => player.toggle(asset, queue)}
        disabled={!playable}
        aria-label={
          playable
            ? playing
              ? `Pause ${asset.name}`
              : `Play ${asset.name}`
            : `No preview for ${asset.name}`
        }
        aria-pressed={playing}
        className={cn(
          "group relative block w-full overflow-hidden rounded-lg border transition-colors",
          active
            ? "border-primary/60"
            : "border-border hover:border-primary/40",
          !playable && "cursor-not-allowed",
        )}
      >
        <LibraryArtwork
          id={asset.id}
          artworkUrl={asset.artworkUrl}
          className="aspect-square w-full"
          waveformBars={waveformBars}
        />

        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-colors",
            active ? "bg-black/25" : "bg-black/10 group-hover:bg-black/20",
          )}
        >
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full shadow-md transition-transform",
              size === "sm" ? "h-8 w-8" : "h-12 w-12",
              playable
                ? "bg-surface/95 text-primary group-hover:scale-105"
                : "bg-surface/80 text-muted-foreground",
            )}
          >
            {(() => {
              const icon = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
              if (!playable) return <VolumeX className={icon} />;
              if (playing)
                return <Pause className={icon} fill="currentColor" />;
              return (
                <Play
                  className={cn(icon, "translate-x-[1px]")}
                  fill="currentColor"
                />
              );
            })()}
          </span>
        </span>
      </button>

      {corner && (
        <div className="absolute right-2 top-2 flex gap-1">{corner}</div>
      )}
    </div>
  );
}
