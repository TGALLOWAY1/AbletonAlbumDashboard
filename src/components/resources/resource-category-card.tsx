import { cn } from "@/lib/utils";
import type { ResourceCategory } from "@/lib/data/resources";
import { RESOURCE_COLOR_CLASSES } from "./resource-colors";

export function ResourceCategoryCard({
  category,
  active = false,
  onSelect,
}: {
  category: ResourceCategory;
  active?: boolean;
  onSelect?: (category: ResourceCategory) => void;
}) {
  const Icon = category.icon;
  const tile = RESOURCE_COLOR_CLASSES[category.color].tile;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(category)}
      aria-pressed={active}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border bg-surface p-4 text-left shadow-sm transition-colors",
        active
          ? "border-primary/60 bg-surface-2/40"
          : "border-border hover:border-primary/30 hover:bg-surface-2/40",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          tile,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold leading-tight tracking-tight">
          {category.title}
        </div>
        <p className="text-xs leading-snug text-muted-foreground">
          {category.description}
        </p>
      </div>
      <div className="mt-auto pt-2 text-xs text-muted-foreground">
        {category.articleCount} article
        {category.articleCount === 1 ? "" : "s"}
      </div>
    </button>
  );
}
