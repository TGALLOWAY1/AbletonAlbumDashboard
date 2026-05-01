"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "recent", label: "Last worked" },
  { value: "progress", label: "Progress" },
  { value: "name", label: "Name" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function TrackSortControl({ current }: { current: SortValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setSort = (value: SortValue) => {
    const next = new URLSearchParams(params.toString());
    if (value === "recommended") next.delete("sort");
    else next.set("sort", value);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === current)?.label ?? "Recommended";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-2">
        <span className="text-muted-foreground">Sort by:</span>
        <span className="font-medium">{currentLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => setSort(opt.value)}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
