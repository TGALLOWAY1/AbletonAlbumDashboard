import Link from "next/link";
import {
  ChevronRight,
  FileText,
  ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import type { ResourceItem } from "@/lib/data/resources";
import { formatTag } from "@/lib/resource-tags";

/** Enough to say what a card is about; more would compete with the title. */
const MAX_CARD_TAGS = 3;

// Opaque pastels (the shared /15-alpha tiles would go muddy over imagery),
// rotated by position so the numbered sequence reads as a curated set.
const POSITION_BADGE_CLASSES = [
  "bg-emerald-100 text-emerald-900",
  "bg-purple-100 text-purple-900",
  "bg-blue-100 text-blue-900",
  "bg-orange-100 text-orange-900",
];

export function ResourceTopicCard({
  resource,
  position,
}: {
  resource: ResourceItem;
  position: number;
}) {
  const badge =
    POSITION_BADGE_CLASSES[(position - 1) % POSITION_BADGE_CLASSES.length];
  const FallbackIcon =
    resource.sourceKind === "pdf"
      ? FileText
      : resource.sourceKind === "url"
        ? LinkIcon
        : ImageIcon;

  return (
    <Link
      href={`/resources/${resource.categoryId}/${resource.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-colors hover:border-primary/30"
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-surface-2">
        {resource.thumbnailUrl ? (
          <CoverArt
            src={resource.thumbnailUrl}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-border text-muted-foreground">
            <FallbackIcon className="h-8 w-8" aria-hidden />
          </div>
        )}
        <span
          className={`absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold shadow-sm ${badge}`}
        >
          {position}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-sm font-semibold leading-snug tracking-tight">
          {resource.title}
        </h3>
        <div className="flex flex-1 items-end justify-between gap-2">
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
            {resource.description}
          </p>
          <ChevronRight
            className="mb-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden
          />
        </div>
        {resource.tags.length > 0 && (
          // Quiet on purpose: the tags say what a card is about, they are not
          // the card's own controls — filtering happens in the chip row above
          // the gallery.
          <ul className="flex flex-wrap gap-1 pt-0.5">
            {resource.tags.slice(0, MAX_CARD_TAGS).map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-muted-foreground"
              >
                {formatTag(tag)}
              </li>
            ))}
            {resource.tags.length > MAX_CARD_TAGS && (
              <li className="px-0.5 py-0.5 text-[10px] leading-tight text-muted-foreground/70">
                +{resource.tags.length - MAX_CARD_TAGS}
              </li>
            )}
          </ul>
        )}
      </div>
    </Link>
  );
}
