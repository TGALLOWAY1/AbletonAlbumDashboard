import {
  BarChart3,
  BookOpen,
  Calendar,
  Disc3,
  Headphones,
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
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/albums", label: "Albums", icon: Disc3 },
  { href: "/tracks", label: "All Tracks", icon: ListMusic },
  { href: "/library", label: "Library", icon: Library },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/sessions", label: "Focus Sessions", icon: Headphones },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
