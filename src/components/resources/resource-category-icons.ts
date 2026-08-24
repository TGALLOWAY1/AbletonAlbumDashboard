import {
  AudioWaveform,
  Brain,
  FolderOpen,
  Gauge,
  type LucideIcon,
  Radio,
  Sliders,
  Waves,
} from "lucide-react";
import type { ResourceCategoryId } from "@/lib/data/resources";

// Icons are resolved client-side from the serializable category id. Do not add
// icon components to the data in src/lib/data/resources.ts — that data crosses
// the server -> client component boundary as props, and React cannot serialize
// functions/components across it.
export const RESOURCE_CATEGORY_ICONS: Record<ResourceCategoryId, LucideIcon> = {
  "production-guides": AudioWaveform,
  "sound-design": Waves,
  "mixing-mastering": Sliders,
  "live-performance": Radio,
  "workflow-mindset": Brain,
  "tools-plugins": Gauge,
  "file-organization": FolderOpen,
};
