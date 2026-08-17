"use client";

import { MoreHorizontal, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LibraryPlayTile } from "@/components/library/library-play-tile";
import { cn } from "@/lib/utils";
import {
  PRESET_CATEGORY_LABELS,
  toPlayablePreset,
  type PlayableAsset,
  type Preset,
} from "@/lib/data/library";

/**
 * A preset at browse size. Name plus sound is how these get recognised, so the
 * card carries only what narrows a choice — plugin, category, and whether it's
 * one of the go-to Core sounds. No adjectives, no tag clouds.
 */
export function PresetCard({
  preset,
  queue,
  onOpen,
  onEdit,
  onAddToCollection,
  onToggleFavorite,
  onDelete,
  className,
}: {
  preset: Preset;
  queue: PlayableAsset[];
  onOpen: (preset: Preset) => void;
  onEdit: (preset: Preset) => void;
  onAddToCollection: (preset: Preset) => void;
  onToggleFavorite: (preset: Preset) => void;
  onDelete: (preset: Preset) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className="relative">
        <LibraryPlayTile
          asset={toPlayablePreset(preset)}
          queue={queue}
          corner={
            preset.favorite ? (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-warning shadow-sm"
                title="Favorite"
              >
                <Star className="h-3.5 w-3.5" fill="currentColor" />
                <span className="sr-only">Favorite</span>
              </span>
            ) : null
          }
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More actions for ${preset.name}`}
              className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(preset)}>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(preset)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggleFavorite(preset)}>
              {preset.favorite ? "Remove favorite" : "Add favorite"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAddToCollection(preset)}>
              Add to collection
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(preset)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        onClick={() => onOpen(preset)}
        className="min-w-0 rounded-md px-0.5 text-left"
        aria-label={`Open ${preset.name} details`}
      >
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">
            {preset.name}
          </span>
          {preset.core && (
            <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Core
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {preset.plugin ?? "No plugin"}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {PRESET_CATEGORY_LABELS[preset.category]}
        </span>
      </button>
    </div>
  );
}
