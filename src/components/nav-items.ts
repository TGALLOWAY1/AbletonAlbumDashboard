import {
  BarChart3,
  BookOpen,
  Home,
  LayoutTemplate,
  Library,
  ListMusic,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tracks", label: "Tracks", icon: ListMusic },
  { href: "/library", label: "Library", icon: Library },
  { href: "/analytics", label: "Progress", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Routes that belong to a nav item but don't live under its href.
 *
 * The track library absorbed the albums shelf, so an album — whether the
 * detail page or the create form — highlights Tracks. Same for the mobile
 * track detail route, which is served from `/m/[trackId]`.
 */
const EXTRA_SECTION_PREFIXES: Record<string, string[]> = {
  "/tracks": ["/albums", "/m/"],
};

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (pathname === href || pathname.startsWith(href + "/")) return true;
  return (EXTRA_SECTION_PREFIXES[href] ?? []).some((prefix) =>
    pathname.startsWith(prefix),
  );
}
