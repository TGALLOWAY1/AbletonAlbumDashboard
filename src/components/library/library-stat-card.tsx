import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LibraryStatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4",
        className,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:h-9 sm:w-9">
          <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </span>
        <span className="text-xl font-semibold tabular-nums leading-none sm:text-2xl">
          {value}
        </span>
      </div>
      {hint && (
        <div className="hidden text-[11px] text-muted-foreground sm:block">
          {hint}
        </div>
      )}
    </div>
  );
}
