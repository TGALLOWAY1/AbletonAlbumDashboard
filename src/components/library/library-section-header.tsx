import { cn } from "@/lib/utils";

/** Section label + optional "View all", using the app's uppercase heading idiom. */
export function LibrarySectionHeader({
  title,
  onViewAll,
  viewAllLabel = "View all",
  className,
}: {
  title: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="shrink-0 rounded-sm text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {viewAllLabel}
        </button>
      )}
    </div>
  );
}
