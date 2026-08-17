"use client";

import { useLibraryPlayer } from "@/components/library/library-player-provider";

/**
 * Reserves room at the end of the page while the mini-player is up, so the
 * last row of cards is never hidden behind it. The space only appears below
 * the fold, so nothing the user is looking at shifts when playback starts.
 */
export function LibraryPlayerSpacer() {
  const { current } = useLibraryPlayer();
  if (!current) return null;
  return <div className="h-16" aria-hidden />;
}
