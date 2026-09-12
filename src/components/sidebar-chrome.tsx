"use client";

import { usePathname } from "next/navigation";
import { SidebarFocusLink } from "@/components/sidebar-focus-link";

export function SidebarChrome({
  focusPanel,
}: {
  focusPanel: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLibrary = pathname?.startsWith("/library") ?? false;

  if (isLibrary) return <SidebarFocusLink />;

  return <>{focusPanel}</>;
}
