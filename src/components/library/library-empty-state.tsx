import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * What an empty section actually says. The Library never ships fixture rows
 * into a user's library, so these are the real first-run screens, not a
 * fallback nobody sees.
 */
export function LibraryEmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface/60 px-6 py-8 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
      {actionLabel && onAction && (
        <Button size="sm" className="mt-2" onClick={onAction}>
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
