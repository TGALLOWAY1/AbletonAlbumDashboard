"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionTypeRow } from "@/lib/types";

export function SessionTypePicker({
  types,
  value,
  onChange,
  className,
}: {
  types: SessionTypeRow[];
  value: string | null;
  onChange: (id: string | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {types.map((t) => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(selected ? null : t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selected
                ? "border-transparent text-white"
                : "border-border bg-surface text-foreground hover:bg-surface-2",
            )}
            style={
              selected
                ? { backgroundColor: t.color, borderColor: t.color }
                : undefined
            }
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            {t.name}
            {selected && <Check className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
  );
}
