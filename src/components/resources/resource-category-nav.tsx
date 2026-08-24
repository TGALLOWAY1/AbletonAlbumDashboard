import Link from "next/link";
import { LayoutGrid, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RESOURCE_CATEGORIES,
  type ResourceCategoryId,
} from "@/lib/data/resources";
import { RESOURCE_CATEGORY_ICONS } from "./resource-category-icons";

function CategoryTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // -mb-px lets the active underline sit on top of the row's divider.
        "-mb-px flex shrink-0 flex-col items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="whitespace-nowrap text-xs font-medium">{label}</span>
    </Link>
  );
}

/**
 * The one category switcher, shared by /resources and every category page:
 * "All" is the landing page, each other tab is that category's own page. The
 * active tab carries the green accent and underline. Pass `null` for the
 * landing page, where "All" is the active state.
 */
export function ResourceCategoryNav({
  activeCategoryId,
}: {
  activeCategoryId: ResourceCategoryId | null;
}) {
  return (
    <nav aria-label="Resource categories" className="-mx-1 overflow-x-auto px-1">
      <div className="flex min-w-max items-stretch gap-1 border-b border-border">
        <CategoryTab
          href="/resources"
          label="All"
          icon={LayoutGrid}
          active={activeCategoryId === null}
        />
        {RESOURCE_CATEGORIES.map((category) => (
          <CategoryTab
            key={category.id}
            href={`/resources/${category.id}`}
            label={category.title}
            icon={RESOURCE_CATEGORY_ICONS[category.id]}
            active={activeCategoryId === category.id}
          />
        ))}
      </div>
    </nav>
  );
}
