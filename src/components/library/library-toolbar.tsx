"use client";

import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LibraryCategory } from "@/lib/data/library-items";

export type SortKey = "recent" | "rating" | "name-asc" | "name-desc";
export type ViewMode = "list" | "grid";

const TABS: { value: LibraryCategory | "all"; label: string }[] = [
  { value: "all", label: "All Items" },
  { value: "audio", label: "Audio" },
  { value: "midi", label: "MIDI" },
  { value: "preset", label: "Presets" },
  { value: "idea", label: "Project Ideas" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "drum", label: "Drums" },
  { value: "bass", label: "Bass" },
  { value: "lead", label: "Lead" },
  { value: "atmos", label: "Atmosphere" },
  { value: "vocal", label: "Vocal" },
  { value: "fx", label: "FX" },
  { value: "chord", label: "Chord Loop" },
  { value: "midi", label: "MIDI" },
];

const KEY_OPTIONS = [
  { value: "all", label: "All Keys" },
  { value: "C maj", label: "C maj" },
  { value: "C# min", label: "C# min" },
  { value: "D min", label: "D min" },
  { value: "E min", label: "E min" },
  { value: "F min", label: "F min" },
  { value: "F# min", label: "F# min" },
  { value: "G maj", label: "G maj" },
  { value: "G min", label: "G min" },
  { value: "A min", label: "A min" },
];

const BPM_OPTIONS = [
  { value: "all", label: "All BPM" },
  { value: "0-90", label: "Under 90" },
  { value: "90-110", label: "90 – 110" },
  { value: "110-130", label: "110 – 130" },
  { value: "130-150", label: "130 – 150" },
  { value: "150-300", label: "150+" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Sort: Recently Added" },
  { value: "rating", label: "Sort: Rating" },
  { value: "name-asc", label: "Sort: Name A→Z" },
  { value: "name-desc", label: "Sort: Name Z→A" },
];

export function LibraryToolbar({
  tab,
  onTabChange,
  search,
  onSearchChange,
  type,
  onTypeChange,
  musicKey,
  onKeyChange,
  bpm,
  onBpmChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: {
  tab: LibraryCategory | "all";
  onTabChange: (value: LibraryCategory | "all") => void;
  search: string;
  onSearchChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  musicKey: string;
  onKeyChange: (value: string) => void;
  bpm: string;
  onBpmChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={tab}
        onValueChange={(v) => onTabChange(v as LibraryCategory | "all")}
      >
        <TabsList className="border-0 bg-transparent p-0">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-3 pb-2.5 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search library..."
            className="pl-9"
          />
        </div>

        <div className="w-36">
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-32">
          <Select value={musicKey} onValueChange={onKeyChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KEY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <Select value={bpm} onValueChange={onBpmChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BPM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="w-52">
            <Select
              value={sort}
              onValueChange={(v) => onSortChange(v as SortKey)}
            >
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

          <div className="flex h-9 items-center rounded-md border border-border bg-surface-2 p-0.5">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => onViewChange("grid")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
                view === "grid"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => onViewChange("list")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
                view === "list"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
