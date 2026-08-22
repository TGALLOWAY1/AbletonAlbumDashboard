"use client";

import { RatingPicker } from "@/components/ui/rating-picker";
import {
  TEMPLATE_VALUE_HIGH_LABEL,
  TEMPLATE_VALUE_LOW_LABEL,
} from "@/lib/template-value";

/**
 * The producer's own 1–5 rating for a template, with scale-end labels. Tapping
 * the selected number again clears the rating (see `RatingPicker`).
 */
export function TemplateValuePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <RatingPicker value={value} onChange={onChange} size="lg" />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{TEMPLATE_VALUE_LOW_LABEL}</span>
        <span>{TEMPLATE_VALUE_HIGH_LABEL}</span>
      </div>
    </div>
  );
}
