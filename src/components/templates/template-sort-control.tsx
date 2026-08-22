"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEMPLATE_SORT_OPTIONS, type TemplateSort } from "@/lib/template-sort";

export type { TemplateSort };

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
          {TEMPLATE_SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
