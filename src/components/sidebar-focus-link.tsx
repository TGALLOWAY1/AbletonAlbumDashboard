import Link from "next/link";
import { Headphones } from "lucide-react";

/**
 * The plainest form of the sidebar's Focus Mode block: a heading and a link
 * to start a session, needing no data. `SidebarChrome` shows it on Library
 * pages, where a track recommendation would be noise, and `SidebarFocusPanel`
 * falls back to it when its reads fail — a sidebar with one link is a
 * sidebar; a sidebar that throws is the global error page.
 */
export function SidebarFocusLink() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Focus Mode
      </div>
      <Link
        href="/focus/new"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        <Headphones className="h-4 w-4" />
        Start Focus Session
      </Link>
    </div>
  );
}
