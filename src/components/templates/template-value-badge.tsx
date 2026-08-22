"use client";

import { Star } from "lucide-react";
import { TEMPLATE_VALUE_MAX } from "@/lib/template-value";

/**
 * Read-only "how valuable is this template" marker for list rows. Renders
 * nothing when the template has not been rated, so unrated rows stay clean.
 */
export function TemplateValueBadge({ value }: { value: number | undefined }) {
  if (value === undefined) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
      title={`Value: ${value} of ${TEMPLATE_VALUE_MAX}`}
    >
      <Star className="h-3 w-3" fill="currentColor" />
      <span className="tabular-nums">
        {value}/{TEMPLATE_VALUE_MAX}
      </span>
    </span>
  );
}
