"use client";

import { Label } from "@/components/ui/label";
import type { LibraryCollection } from "@/lib/data/library";

/** Collection membership as a checkbox list, shared by the capture forms. */
export function CollectionCheckboxes({
  collections,
  selected,
  onChange,
}: {
  collections: LibraryCollection[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (collections.length === 0) return null;

  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Collections</Label>
      <div className="flex flex-wrap gap-2">
        {collections.map((collection) => {
          const checked = selected.includes(collection.id);
          return (
            <label
              key={collection.id}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-2 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(collection.id)}
                className="sr-only"
              />
              {collection.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}
