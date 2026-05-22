"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TemplateSort =
  | "recently-modified"
  | "recently-created"
  | "category"
  | "most-used";

const SORT_OPTIONS: { value: TemplateSort; label: string }[] = [
  { value: "recently-modified", label: "Sort: Recently Modified" },
  { value: "recently-created", label: "Sort: Recently Created" },
  { value: "category", label: "Sort: Category" },
  { value: "most-used", label: "Sort: Most Used" },
];

export function TemplateSortControl({
  sort,
  onSortChange,
}: {
  sort: TemplateSort;
  onSortChange: (value: TemplateSort) => void;
}) {
  return (
    <div className="w-56">
      <Select value={sort} onValueChange={(v) => onSortChange(v as TemplateSort)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
