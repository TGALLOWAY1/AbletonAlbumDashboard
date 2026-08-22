"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListMusic,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavTab = {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

// Exported so the nav-consistency test can assert every mobile tab has a
// matching entry (href + label) in the sidebar's NAV_ITEMS.
export const MOBILE_NAV_TABS: MobileNavTab[] = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    match: (p) => p === "/",
  },
  {
    label: "Tracks",
    href: "/tracks",
    icon: ListMusic,
    // The mobile track detail route lives at /m/[trackId], and the library
    // absorbed the albums shelf, so both count as "Tracks" here even though
    // neither URL starts with /tracks.
    match: (p) =>
      p.startsWith("/tracks") || p.startsWith("/m/") || p.startsWith("/albums"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    match: (p) => p.startsWith("/settings"),
  },
];

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_6px_rgba(0,0,0,0.04)] md:hidden"
      aria-label="Primary"
    >
      {/* Columns follow the tab count rather than a hard-coded class, so
          adding or dropping a tab can't leave a gap in the bar. */}
      <ul
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${MOBILE_NAV_TABS.length}, minmax(0, 1fr))`,
        }}
      >
        {MOBILE_NAV_TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.5 : 2}
                  fill={active && tab.label === "Home" ? "currentColor" : "none"}
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
