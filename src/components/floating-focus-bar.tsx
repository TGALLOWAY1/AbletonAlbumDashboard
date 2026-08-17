"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Pause, Play, Square, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusSession } from "@/components/focus-session-provider";
import { cn } from "@/lib/utils";

export function FloatingFocusBar() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const ctx = useFocusSession();

  const active = ctx.phase === "running" || ctx.phase === "paused";
  if (!active) return null;

  const focusPath = ctx.trackId ? `/focus/${ctx.trackId}` : "/focus/new";
  if (pathname === focusPath) return null;

  // The Library pins its own persistent mini-player along the bottom edge
  // (above the mobile nav, flush to the viewport on desktop). Lift this pill
  // clear of it there so the two pieces of fixed bottom chrome don't overlap.
  const inLibrary = pathname.startsWith("/library");

  const handleStop = () => {
    ctx.stop();
    router.push(focusPath);
  };

  return (
    <div
      className={cn(
        "fixed right-4 z-50",
        inLibrary ? "bottom-44 md:bottom-20" : "bottom-24 md:bottom-4",
      )}
      role="status"
      aria-label="Focus session running"
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 shadow-lg">
        <Link
          href={focusPath}
          className="flex min-w-0 items-center gap-2 pr-1"
          aria-label="Return to focus session"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {ctx.phase === "running" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-60" />
            )}
            <span className="relative h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="min-w-0 max-w-[10rem] truncate text-sm font-medium">
            {ctx.trackName ?? "Focus"}
          </span>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {formatMMSS(ctx.elapsedMs)}
          </span>
        </Link>

        {ctx.phase === "running" ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Pause session"
            onClick={ctx.pause}
            className="h-8 w-8"
          >
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Resume session"
            onClick={ctx.resume}
            className="h-8 w-8"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Stop session and log"
          onClick={handleStop}
          className="h-8 w-8"
        >
          <Square className="h-4 w-4" />
        </Button>

        <Link
          href={focusPath}
          aria-label="Return to focus session"
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function formatMMSS(totalMs: number) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
