"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pushPath, readNavStack, writeNavStack } from "@/lib/nav-stack";

/**
 * Records every visited pathname into the sessionStorage-backed nav stack
 * (see src/lib/nav-stack.ts) so BackLink can tell real in-app history apart
 * from deep links. Renders nothing.
 */
export function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    writeNavStack(pushPath(readNavStack(), pathname));
  }, [pathname]);

  return null;
}
