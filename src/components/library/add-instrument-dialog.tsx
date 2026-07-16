"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  INSTRUMENT_SOURCES,
  type LibraryItem,
  type LibraryCategory,
} from "@/lib/data/library-items";
import { createInstrument } from "@/app/actions/instruments";

const CUSTOM = "__custom__";

export function AddInstrumentDialog({
  onAdded,
}: {
  onAdded: (item: LibraryItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<LibraryCategory>("instruments_presets");
  const [source, setSource] = React.useState<string>("Ableton");
  const [customSource, setCustomSource] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function reset() {
    setName("");
    setCategory("instruments_presets");
    setSource("Ableton");
    setCustomSource("");
    setNotes("");
    setError(null);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

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
      const resolvedSource = resolveSource();
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("category", category);
      formData.set("source", resolvedSource);
      formData.set("notes", notes.trim());

      // assuming createInstrument API might be modified or flexible
      const { id } = await createInstrument(formData);
      onAdded({
        id,
        name: name.trim(),
        category: category,
        source: resolvedSource,
        notes: notes.trim() || undefined,
      });
      handleOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a library item</DialogTitle>
          <DialogDescription>
            Add an instrument, preset, drum, or FX rack to your library.
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
            <Select value={category} onValueChange={(v) => setCategory(v as LibraryCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drums">Drums</SelectItem>
                <SelectItem value="instruments_presets">Instrument / Preset</SelectItem>
                <SelectItem value="fx_racks">FX Rack</SelectItem>
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
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
