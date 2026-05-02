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
        "flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm",
        className,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="text-2xl font-semibold tabular-nums leading-none">
          {value}
        </span>
      </div>
      {hint && (
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
