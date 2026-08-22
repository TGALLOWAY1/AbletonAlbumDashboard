"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  count,
  children,
}: {
  /** Album id, or the backlog sentinel — the localStorage key for this group. */
  groupId: string;
  label: string;
  /** Album detail route; omitted for the backlog group. */
  href?: string | null;
  /** Album-level genre, shown beside the heading. */
  genre?: string | null;
  count: number;
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
          <span className="truncate">{label}</span>
          <span className="shrink-0 font-medium tabular-nums text-muted-foreground/80">
            {count}
          </span>
        </button>
        {genre && <Badge variant="primary">{genre}</Badge>}
        {href && (
          <Link
            href={href}
            className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Open album
          </Link>
        )}
      </div>
      {/* `hidden` rather than unmounting: the server already rendered these
          rows, and keeping them mounted makes expanding instant. */}
      <div id={panelId} hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}
