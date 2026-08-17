"use client";

import { Star } from "lucide-react";
import { LibraryPlayTile } from "@/components/library/library-play-tile";
import { cn } from "@/lib/utils";
import {
  loopStackSubtitle,
  toPlayableLoopStack,
  type LoopStack,
  type PlayableAsset,
} from "@/lib/data/library";

/**
 * A Loop Stack at browse size: artwork you can audition, its length, its name,
 * and the two facts that decide whether it fits — key and tempo. Everything
 * else lives in the detail sheet.
 */
export function LoopStackCard({
  stack,
  queue,
  onOpen,
  className,
}: {
  stack: LoopStack;
  queue: PlayableAsset[];
  onOpen: (stack: LoopStack) => void;
  className?: string;
}) {
  const subtitle = loopStackSubtitle(stack);

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <LibraryPlayTile
        asset={toPlayableLoopStack(stack)}
        queue={queue}
        corner={
          <>
            {stack.favorite && (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-warning shadow-sm"
                title="Favorite"
              >
                <Star className="h-3.5 w-3.5" fill="currentColor" />
                <span className="sr-only">Favorite</span>
              </span>
            )}
            {stack.bars != null && (
              <span className="rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground shadow-sm">
                {stack.bars} bars
              </span>
            )}
          </>
        }
      />

      <button
        type="button"
        onClick={() => onOpen(stack)}
        className="min-w-0 rounded-md px-0.5 text-left"
        aria-label={`Open ${stack.name} details`}
      >
        <span className="block truncate text-sm font-medium leading-tight">
          {stack.name}
        </span>
        <span className="mt-0.5 block truncate text-xs tabular-nums text-muted-foreground">
          {subtitle || "No key or tempo set"}
        </span>
      </button>
    </div>
  );
}
