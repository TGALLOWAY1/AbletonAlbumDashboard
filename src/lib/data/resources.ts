import {
  AudioWaveform,
  Brain,
  FolderOpen,
  Gauge,
  type LucideIcon,
  Sliders,
  Waves,
} from "lucide-react";

export type ResourceColor = "green" | "purple" | "blue" | "orange";

export type ResourceType =
  | "guide"
  | "tutorial"
  | "article"
  | "video"
  | "mindset";

export type ResourceSourceKind = "pdf" | "markdown" | "url";

export type ResourceCategoryId =
  | "production-guides"
  | "sound-design"
  | "mixing-mastering"
  | "workflow-mindset"
  | "tools-plugins"
  | "file-organization";

export interface ResourceCategory {
  id: ResourceCategoryId;
  title: string;
  description: string;
  icon: LucideIcon;
  color: ResourceColor;
  articleCount: number;
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  categoryId: ResourceCategoryId;
  sourceKind: ResourceSourceKind;
  url?: string | null;
  storagePath?: string | null;
  content?: string | null;
  thumbnailUrl?: string | null;
  readMinutes: number;
  addedAt: string;
  bookmarked?: boolean;
  featured?: boolean;
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  guide: "Guide",
  tutorial: "Tutorial",
  article: "Article",
  video: "Video",
  mindset: "Mindset",
};

export const RESOURCE_TYPES: ResourceType[] = [
  "guide",
  "tutorial",
  "article",
  "video",
  "mindset",
];

export const RESOURCE_SOURCE_KINDS: ResourceSourceKind[] = [
  "pdf",
  "markdown",
  "url",
];

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: "production-guides",
    title: "Production Guides",
    description: "Step-by-step guides for music production workflows.",
    icon: AudioWaveform,
    color: "green",
    articleCount: 0,
  },
  {
    id: "sound-design",
    title: "Sound Design",
    description: "Learn synthesis, sampling, and sound creation.",
    icon: Waves,
    color: "purple",
    articleCount: 0,
  },
  {
    id: "mixing-mastering",
    title: "Mixing & Mastering",
    description: "Tips and techniques for pro-level sound.",
    icon: Sliders,
    color: "blue",
    articleCount: 0,
  },
  {
    id: "workflow-mindset",
    title: "Workflow & Mindset",
    description: "Boost productivity and stay in the creative flow.",
    icon: Brain,
    color: "green",
    articleCount: 0,
  },
  {
    id: "tools-plugins",
    title: "Tools & Plugins",
    description: "Reviews, tutorials and recommendations.",
    icon: Gauge,
    color: "orange",
    articleCount: 0,
  },
  {
    id: "file-organization",
    title: "File Organization",
    description: "Keep your projects and samples organized.",
    icon: FolderOpen,
    color: "blue",
    articleCount: 0,
  },
];

const RESOURCE_CATEGORY_IDS = new Set<ResourceCategoryId>(
  RESOURCE_CATEGORIES.map((c) => c.id),
);

export function isResourceCategoryId(
  value: string,
): value is ResourceCategoryId {
  return RESOURCE_CATEGORY_IDS.has(value as ResourceCategoryId);
}

export function isResourceType(value: string): value is ResourceType {
  return RESOURCE_TYPES.includes(value as ResourceType);
}

export function isResourceSourceKind(
  value: string,
): value is ResourceSourceKind {
  return RESOURCE_SOURCE_KINDS.includes(value as ResourceSourceKind);
}

// Fallback seed content shown when the user has no resources yet, so the page
// is never empty on first load. As soon as a real resource is uploaded, the
// seed entries are hidden.
export const SEED_FEATURED_RESOURCES: ResourceItem[] = [
  {
    id: "seed-featured-drum-sound-design",
    title: "The Complete Drum Sound Design Workflow",
    description: "Design punchy, professional drums from scratch.",
    type: "guide",
    categoryId: "sound-design",
    sourceKind: "url",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    readMinutes: 10,
    addedAt: "2024-05-22",
    featured: true,
  },
  {
    id: "seed-featured-atmospheric-pads",
    title: "Building Atmospheric Pads in 5 Steps",
    description: "Create lush, cinematic pads using layers and motion.",
    type: "tutorial",
    categoryId: "sound-design",
    sourceKind: "markdown",
    content:
      "# Building Atmospheric Pads\n\n1. Start with a soft saw or sine layer.\n2. Add a detuned octave to fatten the body.\n3. Bring in a bell or chime layer high up.\n4. Slow modulate filters and pan.\n5. Reverb tail, then EQ the low end out.",
    readMinutes: 8,
    addedAt: "2024-05-21",
    featured: true,
  },
  {
    id: "seed-featured-mixing-drums",
    title: "Mixing Drums for Punch and Clarity",
    description: "Pro tips for balancing, EQ, and compression.",
    type: "article",
    categoryId: "mixing-mastering",
    sourceKind: "markdown",
    content:
      "# Mixing Drums\n\nFocus on transient shaping before you reach for compression. EQ kicks at 60Hz and 4kHz, snares at 200Hz and 5kHz.",
    readMinutes: 7,
    addedAt: "2024-05-19",
    featured: true,
  },
  {
    id: "seed-featured-producers-routine",
    title: "Staying Consistent: A Producer's Routine",
    description: "Build habits that help you finish more music.",
    type: "mindset",
    categoryId: "workflow-mindset",
    sourceKind: "markdown",
    content:
      "# A Producer's Routine\n\nBlock 90 minutes daily. End each session with one specific next action. Keep a finish list, not a to-do list.",
    readMinutes: 6,
    addedAt: "2024-05-17",
    featured: true,
  },
];

export const SEED_RECENT_RESOURCES: ResourceItem[] = [
  {
    id: "seed-recent-sidechain",
    title: "Sidechain Compression: The Right Way",
    description: "Use sidechaining for groove and clarity without pumping.",
    type: "article",
    categoryId: "mixing-mastering",
    sourceKind: "markdown",
    content:
      "# Sidechain Compression\n\nUse a fast attack, medium release, 4-6dB of gain reduction. Source: kick. Target: bass or pads.",
    readMinutes: 6,
    addedAt: "2024-05-20",
  },
  {
    id: "seed-recent-serum-wavetables",
    title: "Serum Basics: Wavetables Explained",
    description: "Understand wavetable synthesis from the ground up.",
    type: "tutorial",
    categoryId: "sound-design",
    sourceKind: "url",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    readMinutes: 9,
    addedAt: "2024-05-18",
  },
  {
    id: "seed-recent-reference-tracks",
    title: "Reference Tracks: How to Use Them",
    description: "Pick references and A/B effectively while mixing.",
    type: "article",
    categoryId: "mixing-mastering",
    sourceKind: "markdown",
    content:
      "# Reference Tracks\n\nLevel-match before A/B. Pick references in the same genre and tonal balance you want.",
    readMinutes: 5,
    addedAt: "2024-05-16",
  },
  {
    id: "seed-recent-creative-chords",
    title: "Creative Chord Progressions",
    description: "Move beyond I-V-vi-IV with voicings and substitutions.",
    type: "guide",
    categoryId: "production-guides",
    sourceKind: "markdown",
    content:
      "# Creative Chord Progressions\n\nTry borrowed chords from parallel modes, secondary dominants, and chromatic passing chords.",
    readMinutes: 12,
    addedAt: "2024-05-15",
  },
  {
    id: "seed-recent-arrangement-impact",
    title: "Arrangement Tips: Build with Impact",
    description: "Arrange tracks that pull listeners through every section.",
    type: "video",
    categoryId: "production-guides",
    sourceKind: "url",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    readMinutes: 11,
    addedAt: "2024-05-13",
  },
];
