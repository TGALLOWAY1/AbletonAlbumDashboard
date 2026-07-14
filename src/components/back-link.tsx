"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  hasInAppHistory,
  popCurrent,
  previousPath,
  readNavStack,
  writeNavStack,
} from "@/lib/nav-stack";
import { cn } from "@/lib/utils";

/**
 * History-aware back control. When the nav stack (see src/lib/nav-stack.ts)
 * shows real in-app history it performs `router.back()`, so e.g.
 * album → track → back returns to the album. On a deep link or fresh tab it
 * pushes `fallback` instead. Renders a plain `<Link href={fallback}>` so
 * modified clicks (new tab) and no-JS still work.
 */
export function BackLink({
  fallback,
  label = "Back",
  variant = "labeled",
  className,
}: {
  fallback: string;
  label?: string;
  variant?: "labeled" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (new tab / window) follow the fallback href.
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    const stack = readNavStack();
    const prev = previousPath(stack, pathname);
    if (hasInAppHistory(stack) && prev !== null && prev !== pathname) {
      // Pop the current page first — after `back()` the tracker re-runs on
      // the destination and dedupes against the (now-top) previous entry.
      writeNavStack(popCurrent(stack, pathname));
      router.back();
    } else {
      router.push(fallback);
    }
  };

  if (variant === "icon") {
    return (
      <Link
        href={fallback}
        onClick={handleClick}
        aria-label={label}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
          className,
        )}
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <Link
      href={fallback}
      onClick={handleClick}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), className)}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
