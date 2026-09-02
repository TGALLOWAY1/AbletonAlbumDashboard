"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mergeQuery } from "@/lib/view-mode";
import {
  formatTag,
  serializeTagParam,
  toggleTag,
} from "@/lib/resource-tags";

/**
 * The tag filter: one chip per tag anything on this surface actually carries,
 * multi-select, ANDed.
 *
 * The selection lives in the URL as repeated `?tag=` params rather than in
 * component state, so "sound design, tagged bass" is a link the user can keep
 * — the same reason `/tracks` keeps its view preference there. Chips are
 * therefore plain links: the page stays a server component and the browser's
 * back button walks the filter history.
 *
 * `preserveQuery` carries whatever *other* params the surface owns (the group
 * toggle), merged rather than overwritten, so neither control drops the other.
 */
export function ResourceTagChips({
  basePath,
  tags,
  selected,
  preserveQuery,
}: {
  basePath: string;
  tags: { tag: string; count: number }[];
  selected: string[];
  preserveQuery?: string;
}) {
  if (tags.length === 0 && selected.length === 0) return null;

  function hrefFor(tags: string[]): string {
    const qs = mergeQuery(stripTagParams(preserveQuery), serializeTagParam(tags));
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div
      role="group"
      aria-label="Filter resources by tag"
      className="flex flex-wrap items-center gap-1.5"
    >
      {tags.map(({ tag, count }) => {
        const active = selected.includes(tag);
        return (
          <Link
            key={tag}
            href={hrefFor(toggleTag(selected, tag))}
            aria-pressed={active}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {formatTag(tag)}
            <span
              className={cn(
                "tabular-nums",
                active
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground/70",
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
      {selected.length > 0 && (
        <Link
          href={hrefFor([])}
          className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <X className="h-3 w-3" aria-hidden />
          Clear tags
        </Link>
      )}
    </div>
  );
}

/**
 * The other params, without any `tag` of their own — a chip's href owns that
 * key outright, and a stale copy would fight the selection it just built.
 */
function stripTagParams(query: string | undefined): string {
  if (!query) return "";
  const usp = new URLSearchParams(query);
  usp.delete("tag");
  return usp.toString();
}
