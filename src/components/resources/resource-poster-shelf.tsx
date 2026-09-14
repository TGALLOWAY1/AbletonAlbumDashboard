import Link from "next/link";
import { LocalDate } from "@/components/local-date";
import { cn } from "@/lib/utils";
import type { ResourceItem } from "@/lib/data/resources";
import { ResourcePosterArt } from "./resource-poster-art";
import { ResourceStars } from "./resource-stars";

/**
 * Posters are 2:3 — the proportions of a film poster or a book jacket, which
 * is the shape the eye already reads as "a thing in a collection". The
 * gallery's cards are 16:11 because they carry a summary; these carry nothing
 * but the cover, so they can be tall.
 */
const POSTER_SIZES =
  "(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw";

export type ShelfCaption = "position" | "learned";

/**
 * A wall of covers: pinned resources at the top of /resources, learned ones
 * below it and at the foot of every category page.
 *
 * One component for both because they are the same object seen twice — the
 * only difference is what is printed under each poster, and that is the
 * `caption` prop. Numbering is positional (first pinned is 1), never a stored
 * field, the same rule the numbered gallery follows.
 */
export function ResourcePosterShelf({
  resources,
  caption = "position",
  emptyMessage,
  className,
}: {
  resources: ResourceItem[];
  caption?: ShelfCaption;
  /** Shown in place of the grid when there is nothing on the shelf. */
  emptyMessage?: string;
  className?: string;
}) {
  if (resources.length === 0) {
    if (!emptyMessage) return null;
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6",
        className,
      )}
    >
      {resources.map((resource, index) => (
        <li key={resource.id}>
          <Poster
            resource={resource}
            caption={caption}
            position={index + 1}
          />
        </li>
      ))}
    </ul>
  );
}

function Poster({
  resource,
  caption,
  position,
}: {
  resource: ResourceItem;
  caption: ShelfCaption;
  position: number;
}) {
  return (
    <Link
      href={`/resources/${resource.categoryId}/${resource.id}`}
      className="group flex flex-col gap-1.5"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border bg-surface-2 shadow-sm transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md">
        <ResourcePosterArt resource={resource} sizes={POSTER_SIZES} />
      </div>
      {/* Caption first, so the number stays glued to the poster whether or not
          the resource is rated. The stars go underneath rather than on the
          artwork: a generated cover sets its own title along the bottom edge,
          which is exactly where an overlay would land on top of it. */}
      <span className="truncate text-center text-[11px] leading-tight tabular-nums text-muted-foreground">
        {caption === "position" ? (
          position
        ) : resource.archivedAt ? (
          // Not `format()` here: this is a server component, so it would print
          // the *server's* calendar day and disagree with the activity map,
          // which is computed in the browser. See LocalDate.
          <LocalDate iso={resource.archivedAt} />
        ) : null}
      </span>
      <ResourceStars
        rating={resource.rating}
        size="xs"
        className="-mt-0.5 justify-center"
      />
      {/* The poster art carries the title visually, but the link still needs a
          name for anyone not looking at it. */}
      <span className="sr-only">{resource.title}</span>
    </Link>
  );
}
