import { AudioLines } from "lucide-react";
import Link from "next/link";
import { MobileNavDrawer } from "@/components/mobile/mobile-nav-drawer";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-surface/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:hidden">
      <MobileNavDrawer />
      <Link
        href="/"
        className="flex items-center gap-2"
        aria-label="Finish Five — home"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <AudioLines className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-wide">
          FINISH FIVE
        </span>
      </Link>
      <div className="h-11 w-11" aria-hidden />
    </header>
  );
}
