import type {
  ResourceCategoryId,
  ResourceColor,
  ResourceType,
} from "@/lib/data/resources";

export const RESOURCE_COLOR_CLASSES: Record<
  ResourceColor,
  { tile: string; badge: string }
> = {
  green: {
    tile: "bg-primary/15 text-primary",
    badge: "bg-primary/15 text-primary border border-primary/30",
  },
  orange: {
    tile: "bg-accent/15 text-accent",
    badge: "bg-accent/15 text-accent border border-accent/30",
  },
  purple: {
    tile: "bg-purple-100 text-purple-700",
    badge: "bg-purple-100 text-purple-700 border border-purple-200",
  },
  blue: {
    tile: "bg-blue-100 text-blue-700",
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
  },
};

export const RESOURCE_TYPE_COLOR: Record<ResourceType, ResourceColor> = {
  guide: "green",
  tutorial: "orange",
  article: "blue",
  video: "purple",
  mindset: "green",
};

/**
 * A generated poster's colourway, one per category.
 *
 * Keyed by category rather than by `ResourceColor` on purpose: three of the
 * seven categories share `green`, which is fine for a badge sitting beside a
 * title and useless on a wall of covers, where the colour is most of what
 * tells two posters apart at thumbnail size. Seven hues, seven shelves.
 */
export const RESOURCE_POSTER_GRADIENTS: Record<ResourceCategoryId, string> = {
  "production-guides": "from-emerald-500 via-emerald-600 to-emerald-900",
  "sound-design": "from-violet-500 via-violet-600 to-violet-900",
  "mixing-mastering": "from-sky-500 via-sky-600 to-sky-900",
  "live-performance": "from-rose-500 via-rose-600 to-rose-900",
  "workflow-mindset": "from-amber-500 via-amber-600 to-amber-900",
  "tools-plugins": "from-orange-500 via-orange-600 to-orange-900",
  "file-organization": "from-teal-500 via-teal-600 to-teal-900",
};
