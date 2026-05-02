"use client";

import { Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TAG_OPTIONS = [
  "Drop",
  "Bass",
  "Melodic",
  "Dark",
  "Wavetable",
  "Atmosphere",
];

const MOOD_OPTIONS = [
  { value: "all", label: "All" },
  { value: "driving", label: "Driving" },
  { value: "uplifting", label: "Uplifting" },
  { value: "dreamy", label: "Dreamy" },
  { value: "warm", label: "Warm" },
  { value: "epic", label: "Epic" },
];

const GENRE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "electronic", label: "Electronic" },
  { value: "synthwave", label: "Synthwave" },
  { value: "house", label: "House" },
  { value: "ambient", label: "Ambient" },
  { value: "lo-fi", label: "Lo-fi" },
];

const KEY_OPTIONS = [
  { value: "all", label: "All" },
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

export type LibraryFilters = {
  tags: string[];
  mood: string;
  genre: string;
  energy: number;
  key: string;
  bpmMin: number;
  bpmMax: number;
  ratingMin: number;
  source: string;
  favoritesOnly: boolean;
};

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  tags: [],
  mood: "all",
  genre: "all",
  energy: 100,
  key: "all",
  bpmMin: 60,
  bpmMax: 180,
  ratingMin: 0,
  source: "all",
  favoritesOnly: false,
};

export function LibraryFiltersCard({
  filters,
  onChange,
  onClear,
  sources,
}: {
  filters: LibraryFilters;
  onChange: (next: LibraryFilters) => void;
  onClear: () => void;
  sources: string[];
}) {
  const update = <K extends keyof LibraryFilters>(
    key: K,
    value: LibraryFilters[K],
  ) => onChange({ ...filters, [key]: value });

  const toggleTag = (tag: string) => {
    update(
      "tags",
      filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag],
    );
  };

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Filters
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-primary hover:underline"
        >
          Clear all
        </button>
      </div>

      <Section label="Tags">
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((tag) => {
            const active = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </Section>

      <Section label="Mood">
        <Select
          value={filters.mood}
          onValueChange={(v) => update("mood", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section label="Genre">
        <Select
          value={filters.genre}
          onValueChange={(v) => update("genre", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENRE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section
        label="Energy"
        right={<span className="tabular-nums">{filters.energy}</span>}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={filters.energy}
          onChange={(e) => update("energy", Number(e.target.value))}
          className="library-range w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Low</span>
          <span>High</span>
        </div>
      </Section>

      <Section label="Key">
        <Select value={filters.key} onValueChange={(v) => update("key", v)}>
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
      </Section>

      <Section
        label="BPM Range"
        right={
          <span className="tabular-nums">
            {filters.bpmMin} – {filters.bpmMax}
          </span>
        }
      >
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="w-7">Min</span>
            <input
              type="range"
              min={60}
              max={180}
              value={filters.bpmMin}
              onChange={(e) => {
                const next = Math.min(filters.bpmMax, Number(e.target.value));
                update("bpmMin", next);
              }}
              className="library-range w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="w-7">Max</span>
            <input
              type="range"
              min={60}
              max={180}
              value={filters.bpmMax}
              onChange={(e) => {
                const next = Math.max(filters.bpmMin, Number(e.target.value));
                update("bpmMax", next);
              }}
              className="library-range w-full"
            />
          </label>
        </div>
      </Section>

      <Section label="Rating">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  update("ratingMin", filters.ratingMin === n ? 0 : n)
                }
                aria-label={`At least ${n} stars`}
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-colors",
                    n <= filters.ratingMin
                      ? "fill-primary text-primary"
                      : "fill-transparent text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">and up</span>
        </div>
      </Section>

      <Section label="Source Project">
        <Select
          value={filters.source}
          onValueChange={(v) => update("source", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm text-foreground">Show only favorites</span>
        <span
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            filters.favoritesOnly ? "bg-primary" : "bg-border",
          )}
        >
          <input
            type="checkbox"
            checked={filters.favoritesOnly}
            onChange={(e) => update("favoritesOnly", e.target.checked)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform",
              filters.favoritesOnly ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </span>
      </label>
    </div>
  );
}

function Section({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {right && <span className="text-foreground">{right}</span>}
      </div>
      {children}
    </div>
  );
}
