"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calendar as CalendarIcon,
  Home,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    match: (p) => p === "/" || p.startsWith("/tracks") || p.startsWith("/m/"),
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarIcon,
    match: (p) => p.startsWith("/calendar"),
  },
  {
    label: "Progress",
    href: "/analytics",
    icon: Activity,
    match: (p) => p.startsWith("/analytics"),
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
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
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
