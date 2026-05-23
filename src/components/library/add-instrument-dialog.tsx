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
  INSTRUMENT_DEVICE_TYPES,
  type LibraryItem,
} from "@/lib/data/library-items";
import { createInstrument } from "@/app/actions/instruments";

const NONE = "__none__";
const CUSTOM = "__custom__";

export function AddInstrumentDialog({
  onAdded,
}: {
  onAdded: (item: LibraryItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [device, setDevice] = React.useState<string>(NONE);
  const [customDevice, setCustomDevice] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function reset() {
    setName("");
    setDevice(NONE);
    setCustomDevice("");
    setNotes("");
    setError(null);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function resolveInstrumentType(): string | undefined {
    if (device === NONE) return undefined;
    if (device === CUSTOM) {
      const trimmed = customDevice.trim();
      return trimmed || undefined;
    }
    return device;
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
      const instrumentType = resolveInstrumentType();
      const formData = new FormData();
      formData.set("name", name.trim());
      if (instrumentType) formData.set("instrument_type", instrumentType);
      formData.set("notes", notes.trim());

      const { id } = await createInstrument(formData);
      onAdded({
        id,
        name: name.trim(),
        category: "instrument",
        type: "instrument",
        instrumentType,
        key: null,
        bpm: null,
        durationSec: 0,
        sourceProject: "Instruments",
        addedAt: new Date().toISOString(),
        rating: 0,
        favorite: false,
        tags: [],
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
          Add Instrument
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an instrument</DialogTitle>
          <DialogDescription>
            Catalog an Ableton device or rack — give it a name, an optional
            device type, and any notes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="instrument-name">Name</Label>
            <Input
              id="instrument-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="808 → Growl Rack"
              required
              maxLength={200}
            />
          </div>

          <div className="grid gap-2">
            <Label>
              Type{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Select value={device} onValueChange={setDevice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {INSTRUMENT_DEVICE_TYPES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM}>Custom…</SelectItem>
              </SelectContent>
            </Select>
            {device === CUSTOM && (
              <Input
                value={customDevice}
                onChange={(e) => setCustomDevice(e.target.value)}
                placeholder="e.g. Instrument Rack — 808 to growl"
                maxLength={100}
                aria-label="Custom device type"
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instrument-notes">
              Notes{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="instrument-notes"
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
              {submitting ? "Saving…" : "Save instrument"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
