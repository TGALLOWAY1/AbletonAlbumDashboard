"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_LABELS,
  INSTRUMENT_SOURCES,
  LIBRARY_CATEGORIES,
  type LibraryCategory,
  type LibraryItem,
} from "@/lib/data/library-items";
import {
  createLibraryItem,
  updateLibraryItem,
} from "@/app/actions/instruments";

const CUSTOM = "__custom__";

export function LibraryItemDialog({
  open,
  onOpenChange,
  item,
  defaultCategory = "instruments_presets",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item to edit, or null to add a new one. */
  item: LibraryItem | null;
  defaultCategory?: LibraryCategory;
  onSaved: (item: LibraryItem) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ItemForm
          key={item?.id ?? "new"}
          item={item}
          defaultCategory={defaultCategory}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  item,
  defaultCategory,
  onSaved,
  onClose,
}: {
  item: LibraryItem | null;
  defaultCategory: LibraryCategory;
  onSaved: (item: LibraryItem) => void;
  onClose: () => void;
}) {
  const isKnownSource = (value: string) =>
    (INSTRUMENT_SOURCES as readonly string[]).includes(value);

  const [name, setName] = React.useState(item?.name ?? "");
  const [category, setCategory] = React.useState<LibraryCategory>(
    item?.category ?? defaultCategory,
  );
  const [source, setSource] = React.useState<string>(
    item ? (isKnownSource(item.source) ? item.source : CUSTOM) : "Ableton",
  );
  const [customSource, setCustomSource] = React.useState(
    item && !isKnownSource(item.source) ? item.source : "",
  );
  const [notes, setNotes] = React.useState(item?.notes ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function resolveSource(): string {
    if (source === CUSTOM) {
      return customSource.trim() || "Other";
    }
    return source;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("category", category);
      formData.set("source", resolveSource());
      formData.set("notes", notes.trim());

      const saved = item
        ? await updateLibraryItem(item.id, formData)
        : await createLibraryItem(formData);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {item ? "Edit library item" : "Add a library item"}
        </DialogTitle>
        <DialogDescription>
          {item
            ? "Rename it, or change its category, source, or notes."
            : "Add an instrument, preset, drum, or FX rack to your library."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="item-name">Name</Label>
          <Input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 808 → Growl Rack"
            required
            maxLength={200}
          />
        </div>

        <div className="grid gap-2">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as LibraryCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIBRARY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENT_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM}>Custom…</SelectItem>
            </SelectContent>
          </Select>
          {source === CUSTOM && (
            <Input
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              placeholder="e.g. Diva, Omnisphere"
              maxLength={100}
              aria-label="Custom source"
            />
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="item-notes">
            Notes{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id="item-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Macro mappings, chain notes, where it lives…"
          />
        </div>

        {error && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save item"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
