export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "recent", label: "Last worked" },
  { value: "progress", label: "Progress" },
  { value: "name", label: "Name" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
