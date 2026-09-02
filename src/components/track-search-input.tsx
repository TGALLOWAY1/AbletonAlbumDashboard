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
  // The URL is the source of truth (a back/forward nav, or another control
  // clearing filters), so a change there overrides an in-flight local draft.
  // Adjusted during render rather than in an effect — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  const navigate = React.useCallback(
    (q: string) => {
      const qs = mergeQuery(preserveQuery, serializeTrackQuery(q));
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, preserveQuery, router],
  );

  React.useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => navigate(draft), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `value` and `navigate` intentionally excluded: this effect only fires
    // the debounced navigation for the current draft, not on every prop sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const clear = () => {
    setDraft("");
    navigate("");
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
