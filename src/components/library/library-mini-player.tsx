"use client";

import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { LibraryArtwork } from "@/components/library/library-artwork";
import { useLibraryPlayer } from "@/components/library/library-player-provider";
import { APP_CHROME } from "@/lib/layout-chrome";
import { cn } from "@/lib/utils";

/**
 * The persistent transport, pinned above the global bottom nav on mobile and
 * to the bottom of the viewport on desktop (where there is no bottom nav).
 * Mounted once by the Library layout so it survives navigation between
 * `/library` and a collection page.
 */
export function LibraryMiniPlayer() {
  const player = useLibraryPlayer();
  const asset = player.current;
  if (!asset) return null;

  const playing = player.status === "playing";
  const errored = player.status === "error";

  return (
    <div
      className={cn(
        // Pinned above the mobile bottom nav, and past the sidebar on md+.
        // The offsets live in layout-chrome so they stay in step with the
        // chrome they clear.
        APP_CHROME.libraryMiniPlayer,
        "border-t border-border bg-surface/95 backdrop-blur",
        "supports-[backdrop-filter]:bg-surface/85 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]",
      )}
      role="region"
      aria-label="Library preview player"
    >
      <div className="h-0.5 w-full bg-border" role="presentation" aria-hidden>
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${Math.round(player.progress * 100)}%` }}
        />
      </div>

      <div className="flex items-center gap-2.5 px-3 py-2 md:gap-3 md:px-8">
        <LibraryArtwork
          id={asset.id}
          artworkUrl={asset.artworkUrl}
          className="h-11 w-11 shrink-0 rounded-md border border-border"
          sizes="44px"
          waveformBars={14}
          waveformHeight={22}
        />

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium leading-tight"
            aria-live="polite"
          >
            {asset.name}
          </p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">
            {errored
              ? "Preview unavailable"
              : asset.subtitle || (asset.previewUrl ? "" : "No preview")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={player.previous}
            disabled={!player.hasPrevious}
            aria-label="Previous preview"
            className={transportClass}
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={player.toggleCurrent}
            disabled={!asset.previewUrl || errored}
            aria-label={playing ? `Pause ${asset.name}` : `Play ${asset.name}`}
            aria-pressed={playing}
            className="mx-0.5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary"
          >
            {playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            onClick={player.next}
            disabled={!player.hasNext}
            aria-label="Next preview"
            className={transportClass}
          >
            <SkipForward className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={player.stop}
            aria-label="Close player"
            className={cn(transportClass, "ml-1")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Secondary controls run slightly narrower than the 44px play button so the
// asset's key/tempo still fits beside them on a phone. Height stays at 44px,
// so the tap target does too.
const transportClass =
  "inline-flex h-11 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-30";
