"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  formatTag,
  MAX_TAGS_PER_RESOURCE,
  parseTagInput,
  RESOURCE_TAG_SUGGESTIONS,
  toggleTag,
} from "@/lib/resource-tags";

/**
 * The tag field shared by the Add and Edit resource dialogs: the suggested
 * vocabulary as toggling chips, plus a box for anything it doesn't cover.
 *
 * The suggestions are a shortcut, not a list of allowed values — there is no
 * check constraint behind tags (migration 0032) precisely so a new word costs
 * nothing. Tags the user has typed are shown as chips too, ahead of the
 * suggestions they didn't pick, so the selection always reads back in one row.
 */
export function ResourceTagPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const full = value.length >= MAX_TAGS_PER_RESOURCE;

  // Selected-but-not-suggested words first, then the offered vocabulary. A
  // chip never moves as you toggle it: both halves keep a stable order.
  const suggestions = RESOURCE_TAG_SUGGESTIONS as readonly string[];
  const custom = value.filter((tag) => !suggestions.includes(tag));
  const chips = [...custom, ...suggestions];

  function commitDraft() {
    const added = parseTagInput(draft);
    if (added.length === 0) {
      setDraft("");
      return;
    }
    let next = value;
    for (const tag of added) {
      if (next.length >= MAX_TAGS_PER_RESOURCE) break;
      if (!next.includes(tag)) next = [...next, tag];
    }
    onChange(next);
    setDraft("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      // Enter inside a dialog form would submit the whole thing.
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="resource-tag-input">Tags</Label>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((tag) => {
          const selected = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled || (full && !selected)}
              aria-pressed={selected}
              onClick={() => onChange(toggleTag(value, tag))}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors disabled:opacity-50",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {formatTag(tag)}
              {selected ? (
                <X className="h-3 w-3" aria-hidden />
              ) : (
                <Plus className="h-3 w-3 opacity-60" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
      <Input
        id="resource-tag-input"
        value={draft}
        disabled={disabled || full}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        // Whatever is half-typed when the dialog is saved still counts.
        onBlur={commitDraft}
        placeholder={
          full
            ? `That's the ${MAX_TAGS_PER_RESOURCE}-tag limit`
            : "Add your own — Enter or comma to save"
        }
        aria-describedby="resource-tag-hint"
        maxLength={120}
      />
      <p id="resource-tag-hint" className="text-xs text-muted-foreground">
        {value.length > 0
          ? `${value.map(formatTag).join(", ")} · used to filter and group the gallery.`
          : "Instrument or role — bass, drums, pads, FX. Used to filter and group the gallery."}
      </p>
    </div>
  );
}

/**
 * The tags a dialog holds, appended the way the server actions read them back
 * (`formData.getAll("tags")`). Both dialogs build their FormData by hand, so
 * this is the one place that knows the field name.
 */
export function appendTagFields(formData: FormData, tags: string[]) {
  for (const tag of tags) formData.append("tags", tag);
}
