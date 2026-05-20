"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioLines, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_ITEMS, isNavActive } from "@/components/nav-items";
import { cn } from "@/lib/utils";

export function MobileNavDrawer() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = React.useState(false);

  // Close drawer whenever the route changes (link tap navigates the app).
  const lastPath = React.useRef(pathname);
  React.useEffect(() => {
    if (lastPath.current !== pathname) {
      setOpen(false);
      lastPath.current = pathname;
    }
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 p-0">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <AudioLines className="h-5 w-5" />
          </span>
          <SheetTitle className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide">
              FINISH FIVE
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Finish more music.
            </span>
          </SheetTitle>
        </div>
        <nav className="flex flex-col gap-0.5 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-base transition-colors",
                  active
                    ? "bg-primary/12 text-primary font-medium"
                    : "text-foreground/80 hover:bg-surface-2",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
