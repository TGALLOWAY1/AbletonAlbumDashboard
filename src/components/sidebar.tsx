import Link from "next/link";
import { AudioLines } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { SidebarFocusPanel } from "@/components/sidebar-focus-panel";
import { SidebarStats } from "@/components/sidebar-stats";
import { SidebarChrome } from "@/components/sidebar-chrome";

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col gap-5 border-r border-border bg-surface-2/60 px-4 py-5 sticky top-0 overflow-y-auto">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
          <AudioLines className="h-4.5 w-4.5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-wide">FINISH FIVE</span>
          <span className="text-[11px] text-muted-foreground">
            Finish more music.
          </span>
        </span>
      </Link>

      <SidebarNav />

      <SidebarChrome focusPanel={<SidebarFocusPanel />} />
      <SidebarStats />
    </aside>
  );
}
