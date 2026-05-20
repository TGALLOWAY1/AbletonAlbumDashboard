"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "@/components/nav-items";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/12 text-primary font-medium"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
