import {
  AudioWaveform,
  Gauge,
  LayoutTemplate,
  Music,
  SlidersHorizontal,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateCategory } from "@/lib/data/templates";

export const TEMPLATE_CATEGORY_META: Record<
  TemplateCategory,
  { icon: LucideIcon; bg: string; fg: string }
> = {
  "sound-design": {
    icon: AudioWaveform,
    bg: "bg-emerald-500/15",
    fg: "text-emerald-600",
  },
  arrangement: {
    icon: LayoutTemplate,
    bg: "bg-violet-500/15",
    fg: "text-violet-600",
  },
  mixing: {
    icon: SlidersHorizontal,
    bg: "bg-blue-500/15",
    fg: "text-blue-600",
  },
  mastering: {
    icon: Gauge,
    bg: "bg-amber-500/15",
    fg: "text-amber-600",
  },
  genre: {
    icon: Music,
    bg: "bg-rose-500/15",
    fg: "text-rose-600",
  },
  workflow: {
    icon: Workflow,
    bg: "bg-teal-500/15",
    fg: "text-teal-600",
  },
};

export function CategoryIcon({
  category,
  size = "sm",
  className,
}: {
  category: TemplateCategory;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = TEMPLATE_CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        meta.bg,
        size === "sm" ? "h-10 w-10" : "h-11 w-11",
        className,
      )}
    >
      <Icon
        className={cn(meta.fg, size === "sm" ? "h-5 w-5" : "h-5 w-5")}
        strokeWidth={2}
      />
    </span>
  );
}
