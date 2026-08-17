import Link from "next/link";
import { Layers } from "lucide-react";
import { MiniWaveform } from "@/components/library/mini-waveform";
import { cn } from "@/lib/utils";
import type { LibraryCollection } from "@/lib/data/library";

function itemLabel(count: number) {
  if (count === 0) return "Empty";
  return count === 1 ? "1 item" : `${count} items`;
}

/**
 * A collection reads as a container, not an asset: wider than the asset cards,
 * a tinted panel rather than a square of artwork, and no play button — you
 * open it, you don't audition it.
 */
export function CollectionCard({
  collection,
  className,
}: {
  collection: LibraryCollection;
  className?: string;
}) {
  return (
    <Link
      href={`/library/collections/${collection.id}`}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="relative flex h-24 items-end overflow-hidden bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15 p-3">
        {collection.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.artworkUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center px-3 opacity-60">
            <MiniWaveform
              id={collection.id}
              bars={28}
              height={38}
              className="text-primary/40"
            />
          </div>
        )}
        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-surface/90 text-primary shadow-sm">
          <Layers className="h-4 w-4" />
        </span>
      </div>

      <div className="flex flex-col gap-0.5 p-3">
        <span className="truncate text-sm font-semibold leading-tight">
          {collection.name}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {itemLabel(collection.items.length)}
        </span>
      </div>
    </Link>
  );
}
