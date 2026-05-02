"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones } from "lucide-react";

export function SidebarChrome({
  focusPanel,
  quote,
}: {
  focusPanel: React.ReactNode;
  quote: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLibrary = pathname?.startsWith("/library") ?? false;

  if (isLibrary) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Focus Mode
        </div>
        <Link
          href="/sessions"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Headphones className="h-4 w-4" />
          Start Focus Session
        </Link>
      </div>
    );
  }

  return (
    <>
      {focusPanel}
      {quote}
    </>
  );
}
