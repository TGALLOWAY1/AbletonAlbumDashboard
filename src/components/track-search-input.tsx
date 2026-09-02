"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mergeQuery } from "@/lib/view-mode";
import { serializeTrackQuery } from "@/lib/track-search";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

/**
 * Name/tag search for /tracks. Typing updates local state immediately (so the
 * input never feels laggy) and pushes to the URL ~250ms after the user stops
 * typing, via `router.replace` so a search doesn't spam browser history one
 * navigation per keystroke.
 */
export function TrackSearchInput({
  value,
  preserveQuery,
  className,
}: {
  value: string;
  /** Query string owned by other controls (filters, view, sort). */
  preserveQuery?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = React.useState(value);
  // Queries this component has itself pushed to the URL and not yet seen come
  // back as `value`. A server-rendered page can lag a keystroke or two behind
  // the input, so when an *older* search of ours commits while a newer draft is
  // pending, that `value` must not replace the draft. Anything not in this list
  // is a genuine outside change — back/forward, another control clearing the
  // query — and does win.
  const ownNavigations = React.useRef<string[]>([]);
  // The most recent search we sent, and the `navigate` it went through.
  // `navigate` changes identity whenever the other controls' params change,
  // so comparing it tells "already sent with these params" apart from "sent,
  // but a filter or sort has moved since and it needs sending again".
  const inFlight = React.useRef<{
    q: string;
    nav: (q: string) => void;
  } | null>(null);

  // An effect rather than the adjust-during-render pattern, because deciding
  // whether the new URL is ours means reading the refs above, which is not
  // allowed during render.
  React.useEffect(() => {
    const idx = ownNavigations.current.indexOf(value);
    if (idx === -1) {
      ownNavigations.current = [];
      inFlight.current = null;
      setDraft(value);
    } else {
      // Ours: drop it and every older one it superseded, keep the draft.
      ownNavigations.current = ownNavigations.current.slice(idx + 1);
    }
  }, [value]);

  const navigate = React.useCallback(
    (q: string) => {
      const qs = mergeQuery(preserveQuery, serializeTrackQuery(q));
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, preserveQuery, router],
  );

  const send = React.useCallback(
    (q: string) => {
      ownNavigations.current.push(q);
      inFlight.current = { q, nav: navigate };
      navigate(q);
    },
    [navigate],
  );

  // `navigate` is a dependency on purpose: it carries the other controls'
  // query params, so if a filter or sort changes during the debounce the timer
  // restarts with the new params instead of navigating with stale ones and
  // undoing that change. It also re-runs when an older search of ours commits
  // (`value` changes but the draft stays); the in-flight check keeps that from
  // re-sending a search that is already on its way with the same params.
  React.useEffect(() => {
    if (draft === value) return;
    const last = inFlight.current;
    if (last && last.q === draft && last.nav === navigate) return;
    const timer = setTimeout(() => send(draft), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, navigate, send]);

  const clear = () => {
    setDraft("");
    send("");
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search tracks"
        aria-label="Search tracks by name or tag"
        className="h-9 pl-8 pr-8"
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
