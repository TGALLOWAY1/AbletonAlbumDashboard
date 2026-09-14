import { FileText, Link as LinkIcon, NotebookPen, Play } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { cn } from "@/lib/utils";
import {
  RESOURCE_TYPE_LABELS,
  type ResourceItem,
  type ResourceSourceKind,
} from "@/lib/data/resources";
import { RESOURCE_POSTER_GRADIENTS } from "./resource-colors";

/**
 * A resource's artwork, always filling its frame.
 *
 * A YouTube link brings its own thumbnail and a user can set one on anything
 * else — but a PDF and a markdown note have no picture, and most of the
 * library is one or the other. Rather than leave two thirds of a poster wall
 * as grey boxes with an icon in the middle, those get a **generated cover**:
 * the category's colourway, its source's icon, and the title set on it, so a
 * shelf of uploads still reads as a shelf of covers.
 *
 * `fill`-style, like `CoverArt` itself: the caller owns the frame, must be
 * `relative`, and must give it dimensions.
 */
export type PosterVariant = "poster" | "tile";

export function ResourcePosterArt({
  resource,
  sizes,
  variant = "poster",
  className,
}: {
  resource: ResourceItem;
  /** CSS `sizes` for the slot — required by `CoverArt`, and the whole point of it. */
  sizes: string;
  /**
   * `poster` sets the title on the artwork, for the 2:3 shelf where the cover
   * is all there is. `tile` leaves it off: the gallery card prints the title
   * underneath already, and a cover repeating it says the same thing twice in
   * the space of one card.
   */
  variant?: PosterVariant;
  className?: string;
}) {
  if (resource.thumbnailUrl) {
    return (
      <CoverArt
        src={resource.thumbnailUrl}
        alt=""
        sizes={sizes}
        className={className}
      />
    );
  }
  return (
    <GeneratedCover
      resource={resource}
      variant={variant}
      className={className}
    />
  );
}

const SOURCE_ICONS: Record<
  ResourceSourceKind,
  React.ComponentType<{ className?: string }>
> = {
  pdf: FileText,
  markdown: NotebookPen,
  url: LinkIcon,
};

const SOURCE_LABELS: Record<ResourceSourceKind, string> = {
  pdf: "PDF",
  markdown: "Note",
  url: "Link",
};

/**
 * The stand-in cover.
 *
 * Out of flow (`absolute inset-0`) so it swaps one-for-one with `CoverArt`,
 * which is `fill`. The title is part of the artwork rather than a caption —
 * that is what makes a wall of these scannable — so it is `aria-hidden` and
 * the surrounding link carries the accessible name.
 */
function GeneratedCover({
  resource,
  variant,
  className,
}: {
  resource: ResourceItem;
  variant: PosterVariant;
  className?: string;
}) {
  const Icon =
    resource.sourceKind === "url" ? Play : SOURCE_ICONS[resource.sourceKind];

  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 flex flex-col bg-gradient-to-br p-3 text-white",
        variant === "poster" ? "justify-between" : "justify-center",
        RESOURCE_POSTER_GRADIENTS[resource.categoryId],
        className,
      )}
    >
      {/* A soft highlight in one corner, so a flat gradient reads as printed
          stock rather than as a missing image. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.35),transparent_55%)]" />

      {variant === "tile" ? (
        <div className="relative flex flex-col items-center gap-1.5">
          <Icon className="h-7 w-7 drop-shadow-sm" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80">
            {SOURCE_LABELS[resource.sourceKind]}
          </span>
        </div>
      ) : (
        <>
          <div className="relative flex items-center justify-between gap-2">
            <Icon className="h-5 w-5 drop-shadow-sm" />
            <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
              {SOURCE_LABELS[resource.sourceKind]}
            </span>
          </div>

          <div className="relative flex flex-col gap-1">
            {/* `break-words`: at three posters across a phone a cover is
                ~110px wide, and a long title's first word is wider than that —
                without it the word overflows and is clipped mid-letter. */}
            <span className="line-clamp-4 break-words text-[11px] font-semibold leading-tight drop-shadow-sm sm:text-[13px]">
              {resource.title}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-wider text-white/75">
              {RESOURCE_TYPE_LABELS[resource.type]}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
