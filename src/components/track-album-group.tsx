"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Disc3, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Album artwork at heading size. The library is the app's only album index
 * now, so a shelf should still be recognisable by its cover the way the old
 * albums page was.
 */
function GroupCover({ coverImageUrl }: { coverImageUrl?: string | null }) {
  return (
    <span className="h-6 w-6 shrink-0 overflow-hidden rounded border border-border bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15">
      {coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-foreground/25">
          <Disc3 className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  );
}

const STORAGE_KEY = "finish-five:tracks:collapsed-albums";

// localStorage is an external store, so it is read through
// useSyncExternalStore rather than mirrored into state in an effect. The
// snapshot is the raw string: a stable primitive React can compare, unlike a
// freshly parsed array. `subscribe` covers both this tab (every mounted group
// re-reads when one of them toggles) and other tabs (the `storage` event).
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode or storage disabled — collapse state is a convenience,
    // never a reason to break the page.
    return null;
  }
}

// On the server (and for the hydrating render) nothing is collapsed, so a
// page without JavaScript still shows every track.
function getServerSnapshot(): string | null {
  return null;
}

function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function setCollapsedIds(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore — see getSnapshot */
  }
  listeners.forEach((notify) => notify());
}

/**
 * One album's shelf on `/tracks`, collapsible by its heading.
 *
 * The tracks themselves are rendered on the server and passed in as children,
 * so collapsing costs no extra fetch and the page stays a server component
 * apart from this wrapper. Which groups are collapsed lives in localStorage
 * rather than the URL: it is a per-device working preference, not something
 * worth linking to (unlike the layout/size preference in `src/lib/view-mode`),
 * and it would otherwise reset on every navigation back to the library.
 */
export function TrackAlbumGroup({
  groupId,
  label,
  href,
  genre,
  coverImageUrl,
  isActive = false,
  count,
  trailing,
  children,
}: {
  /** Album id, or the backlog sentinel — the localStorage key for this group. */
  groupId: string;
  label: string;
  /** Album detail route; omitted for the backlog group. */
  href?: string | null;
  /** Album-level genre, shown beside the heading. */
  genre?: string | null;
  /** Album artwork, shown as a thumbnail in the heading. */
  coverImageUrl?: string | null;
  /** Marks the one album currently set active. */
  isActive?: boolean;
  count: number;
  /**
   * Server-rendered controls for this album (e.g. the "Set active" form, which
   * binds a server action and so cannot be built inside this client component).
   */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const raw = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const collapsed = parse(raw).includes(groupId);
  const panelId = `track-group-${groupId}`;

  function toggle() {
    const rest = parse(getSnapshot()).filter((id) => id !== groupId);
    setCollapsedIds(collapsed ? rest : [...rest, groupId]);
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls={panelId}
          className="-ml-1 flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              collapsed && "-rotate-90",
            )}
          />
          {/* The backlog group has no artwork, so the thumbnail slot is
              skipped rather than filled with a placeholder. */}
          {href && <GroupCover coverImageUrl={coverImageUrl} />}
          <span className="truncate">{label}</span>
          <span className="shrink-0 font-medium tabular-nums text-muted-foreground/80">
            {count}
          </span>
        </button>
        {/* Same pill the album detail header uses, so "active" reads the same
            wherever an album is shown. */}
        {isActive && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            <Star className="h-3 w-3" /> Active
          </span>
        )}
        {genre && <Badge variant="primary">{genre}</Badge>}
        {href && (
          <Link
            href={href}
            className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Open album
          </Link>
        )}
        {trailing}
      </div>
      {/* `hidden` rather than unmounting: the server already rendered these
          rows, and keeping them mounted makes expanding instant. */}
      <div id={panelId} hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}
