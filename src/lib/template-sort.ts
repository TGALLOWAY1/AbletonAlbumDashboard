import {
  TEMPLATE_CATEGORY_ORDER,
  type TemplateItem,
} from "@/lib/data/templates";
import { compareTemplateValue, type TemplateValues } from "@/lib/template-value";

export type TemplateSort =
  | "highest-value"
  | "recently-modified"
  | "recently-created"
  | "category"
  | "most-used";

export const TEMPLATE_SORT_OPTIONS: { value: TemplateSort; label: string }[] = [
  { value: "highest-value", label: "Sort: Highest Value" },
  { value: "recently-modified", label: "Sort: Recently Modified" },
  { value: "recently-created", label: "Sort: Recently Created" },
  { value: "category", label: "Sort: Category" },
  { value: "most-used", label: "Sort: Most Used" },
];

export const DEFAULT_TEMPLATE_SORT: TemplateSort = "highest-value";

/**
 * Comparator for the templates list. `values` holds the producer's own 1–5
 * ratings (see `src/lib/template-value.ts`); it is only consulted by the
 * "Highest Value" sort.
 */
export function compareTemplates(
  a: TemplateItem,
  b: TemplateItem,
  sort: TemplateSort,
  values: TemplateValues = {},
): number {
  switch (sort) {
    case "highest-value": {
      const byValue = compareTemplateValue(values[a.id], values[b.id]);
      if (byValue !== 0) return byValue;
      return a.name.localeCompare(b.name);
    }
    case "recently-modified":
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    case "recently-created":
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case "category": {
      const ai = TEMPLATE_CATEGORY_ORDER.indexOf(a.category);
      const bi = TEMPLATE_CATEGORY_ORDER.indexOf(b.category);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    }
    case "most-used":
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return a.name.localeCompare(b.name);
  }
}
