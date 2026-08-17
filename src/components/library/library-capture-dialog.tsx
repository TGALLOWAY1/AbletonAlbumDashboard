"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Layers, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/toast";
import {
  LibraryMediaFields,
  type LibraryMedia,
} from "@/components/library/library-media-fields";
import { CollectionCheckboxes } from "@/components/library/collection-checkboxes";
import {
  addToCollection,
  createLoopStack,
  createPreset,
  removeFromCollection,
  updateLoopStack,
  updatePreset,
} from "@/app/actions/library";
import {
  PRESET_CATEGORIES,
  PRESET_CATEGORY_LABELS,
  collectionsContaining,
  type LibraryCollection,
  type LoopStack,
  type Preset,
  type PresetCategory,
} from "@/lib/data/library";
import { cn } from "@/lib/utils";

export type CaptureTarget =
  | { mode: "create"; type?: "loopStack" | "preset" }
  | { mode: "edit"; type: "loopStack"; stack: LoopStack }
  | { mode: "edit"; type: "preset"; preset: Preset };

/**
 * Capture asks one question first — Loop Stack or Preset — then shows only the
 * fields that type actually needs. Name is the only requirement; everything
 * else is optional, because the point is to get the idea saved before the
 * session moves on.
 */
export function LibraryCaptureDialog({
  target,
  collections,
  onOpenChange,
}: {
  target: CaptureTarget | null;
  collections: LibraryCollection[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {target && (
          // Radix unmounts this on close, so the chooser and every form field
          // start fresh each time capture opens.
          <CaptureBody
            target={target}
            collections={collections}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CaptureBody({
  target,
  collections,
  onOpenChange,
}: {
  target: CaptureTarget;
  collections: LibraryCollection[];
  onOpenChange: (open: boolean) => void;
}) {
  const [chosen, setChosen] = React.useState<"loopStack" | "preset" | null>(
    target.type ?? null,
  );
  const editing = target.mode === "edit";

  return (
    <>
      {!chosen ? (
        <>
          <DialogHeader>
            <DialogTitle>What are you saving?</DialogTitle>
            <DialogDescription>
              Loop Stacks are musical sections. Presets are sounds.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <TypeChoice
              icon={Layers}
              title="Loop Stack"
              body="An 8-bar idea, a drop, a section worth reusing."
              onClick={() => setChosen("loopStack")}
            />
            <TypeChoice
              icon={Sparkles}
              title="Preset"
              body="A bass, a pad, a lead you'll reach for again."
              onClick={() => setChosen("preset")}
            />
          </div>
        </>
      ) : chosen === "loopStack" ? (
        <LoopStackForm
          stack={
            target?.mode === "edit" && target.type === "loopStack"
              ? target.stack
              : undefined
          }
          collections={collections}
          editing={editing}
          onDone={() => onOpenChange(false)}
        />
      ) : (
        <PresetForm
          preset={
            target?.mode === "edit" && target.type === "preset"
              ? target.preset
              : undefined
          }
          collections={collections}
          editing={editing}
          onDone={() => onOpenChange(false)}
        />
      )}
    </>
  );
}

function TypeChoice({
  icon: Icon,
  title,
  body,
  onClick,
}: {
  icon: typeof Layers;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50 hover:bg-surface-2"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{body}</span>
    </button>
  );
}

/**
 * Applies collection membership changes after a save. Collections reference
 * assets, so this only ever adds or removes join rows — the asset is untouched.
 */
async function syncCollections(
  assetId: string,
  type: "loopStack" | "preset",
  collections: LibraryCollection[],
  selectedIds: string[],
) {
  const before = collectionsContaining(collections, assetId);
  const beforeIds = new Set(before.map((c) => c.id));
  const afterIds = new Set(selectedIds);

  await Promise.all([
    ...selectedIds
      .filter((id) => !beforeIds.has(id))
      .map((id) => addToCollection(id, [{ type, id: assetId }])),
    ...before
      .filter((c) => !afterIds.has(c.id))
      .flatMap((c) => {
        const item = c.items.find((i) => i.id === assetId);
        return item ? [removeFromCollection(item.itemId)] : [];
      }),
  ]);
}

function useCaptureSubmit(onDone: () => void) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (run: () => Promise<string>) => {
    setSaving(true);
    setError(null);
    try {
      const message = await run();
      toast(message);
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return { saving, error, submit };
}

function LoopStackForm({
  stack,
  collections,
  editing,
  onDone,
}: {
  stack?: LoopStack;
  collections: LibraryCollection[];
  editing: boolean;
  onDone: () => void;
}) {
  const [name, setName] = React.useState(stack?.name ?? "");
  const [media, setMedia] = React.useState<LibraryMedia>({
    previewPath: stack?.previewPath ?? null,
    artworkUrl: stack?.artworkUrl ?? null,
  });
  const [key, setKey] = React.useState(stack?.key ?? "");
  const [bpm, setBpm] = React.useState(stack?.bpm?.toString() ?? "");
  const [bars, setBars] = React.useState(stack?.bars?.toString() ?? "");
  const [sourceProject, setSourceProject] = React.useState(
    stack?.sourceProject ?? "",
  );
  const [sourcePath, setSourcePath] = React.useState(stack?.sourcePath ?? "");
  const [notes, setNotes] = React.useState(stack?.notes ?? "");
  const [favorite, setFavorite] = React.useState(stack?.favorite ?? false);
  const [selected, setSelected] = React.useState<string[]>(
    stack ? collectionsContaining(collections, stack.id).map((c) => c.id) : [],
  );

  const [uploading, setUploading] = React.useState(false);
  const { saving, error, submit } = useCaptureSubmit(onDone);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async () => {
      const input = {
        name,
        previewPath: media.previewPath,
        artworkUrl: media.artworkUrl,
        key,
        bpm: bpm.trim() ? Number(bpm) : null,
        bars: bars.trim() ? Number(bars) : null,
        sourceProject,
        sourcePath,
        notes,
        favorite,
      };
      const id = stack
        ? (await updateLoopStack(stack.id, input), stack.id)
        : (await createLoopStack(input)).id;
      await syncCollections(id, "loopStack", collections, selected);
      return editing ? `Saved “${name}”` : `Captured “${name}”`;
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {editing ? "Edit Loop Stack" : "New Loop Stack"}
        </DialogTitle>
        <DialogDescription>
          Only a name is required — fill in the rest when you have it.
        </DialogDescription>
      </DialogHeader>

      <Field label="Name" required>
        {(id) => (
          <Input
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Neon Glide"
            autoFocus
            required
          />
        )}
      </Field>

      <LibraryMediaFields
        folder="loop-stacks"
        value={media}
        onChange={setMedia}
        onUploadingChange={setUploading}
      />

      <div className="grid grid-cols-3 gap-3">
        <Field label="Key">
          {(id) => (
            <Input
              id={id}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="C minor"
            />
          )}
        </Field>
        <Field label="BPM">
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              max={400}
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="95"
            />
          )}
        </Field>
        <Field label="Bars">
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              value={bars}
              onChange={(e) => setBars(e.target.value)}
              placeholder="8"
            />
          )}
        </Field>
      </div>

      <Field label="Source project">
        {(id) => (
          <Input
            id={id}
            value={sourceProject}
            onChange={(e) => setSourceProject(e.target.value)}
            placeholder="Midnight EP"
          />
        )}
      </Field>

      <Field label="Source path">
        {(id) => (
          <Input
            id={id}
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
            placeholder="~/Music/Ableton/Midnight EP Project/…"
          />
        )}
      </Field>

      <Field label="Notes">
        {(id) => (
          <Textarea
            id={id}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything you'd forget by next session."
          />
        )}
      </Field>

      <FavoriteToggle checked={favorite} onChange={setFavorite} />

      <CollectionCheckboxes
        collections={collections}
        selected={selected}
        onChange={setSelected}
      />

      <FormFooter
        saving={saving}
        uploading={uploading}
        error={error}
        editing={editing}
        onCancel={onDone}
      />
    </form>
  );
}

function PresetForm({
  preset,
  collections,
  editing,
  onDone,
}: {
  preset?: Preset;
  collections: LibraryCollection[];
  editing: boolean;
  onDone: () => void;
}) {
  const [name, setName] = React.useState(preset?.name ?? "");
  const [media, setMedia] = React.useState<LibraryMedia>({
    previewPath: preset?.previewPath ?? null,
    artworkUrl: preset?.artworkUrl ?? null,
  });
  const [plugin, setPlugin] = React.useState(preset?.plugin ?? "");
  const [category, setCategory] = React.useState<PresetCategory>(
    preset?.category ?? "Other",
  );
  const [presetPath, setPresetPath] = React.useState(preset?.presetPath ?? "");
  const [sourceProject, setSourceProject] = React.useState(
    preset?.sourceProject ?? "",
  );
  const [notes, setNotes] = React.useState(preset?.notes ?? "");
  const [favorite, setFavorite] = React.useState(preset?.favorite ?? false);
  const [core, setCore] = React.useState(preset?.core ?? false);
  const [selected, setSelected] = React.useState<string[]>(
    preset
      ? collectionsContaining(collections, preset.id).map((c) => c.id)
      : [],
  );

  const [uploading, setUploading] = React.useState(false);
  const { saving, error, submit } = useCaptureSubmit(onDone);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async () => {
      const input = {
        name,
        plugin,
        category,
        previewPath: media.previewPath,
        artworkUrl: media.artworkUrl,
        presetPath,
        sourceProject,
        notes,
        favorite,
        core,
      };
      const id = preset
        ? (await updatePreset(preset.id, input), preset.id)
        : (await createPreset(input)).id;
      await syncCollections(id, "preset", collections, selected);
      return editing ? `Saved “${name}”` : `Captured “${name}”`;
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit preset" : "New preset"}</DialogTitle>
        <DialogDescription>
          Only a name is required — fill in the rest when you have it.
        </DialogDescription>
      </DialogHeader>

      <Field label="Name" required>
        {(id) => (
          <Input
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Grit Sub 02"
            autoFocus
            required
          />
        )}
      </Field>

      <LibraryMediaFields
        folder="presets"
        value={media}
        onChange={setMedia}
        onUploadingChange={setUploading}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Plugin">
          {(id) => (
            <Input
              id={id}
              value={plugin}
              onChange={(e) => setPlugin(e.target.value)}
              placeholder="Serum 2"
            />
          )}
        </Field>
        <Field label="Category">
          {(id) => (
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as PresetCategory)}
            >
              <SelectTrigger id={id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {PRESET_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>

      <Field label="Preset path">
        {(id) => (
          <Input
            id={id}
            value={presetPath}
            onChange={(e) => setPresetPath(e.target.value)}
            placeholder="~/Music/Ableton/User Library/Presets/…"
          />
        )}
      </Field>

      <Field label="Source project">
        {(id) => (
          <Input
            id={id}
            value={sourceProject}
            onChange={(e) => setSourceProject(e.target.value)}
            placeholder="Midnight EP"
          />
        )}
      </Field>

      <Field label="Notes">
        {(id) => (
          <Textarea
            id={id}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything you'd forget by next session."
          />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <FavoriteToggle checked={favorite} onChange={setFavorite} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={core}
            onChange={(e) => setCore(e.target.checked)}
            className="h-4 w-4 accent-[oklch(0.58_0.15_150)]"
          />
          Core sound — one of my go-tos
        </label>
      </div>

      <CollectionCheckboxes
        collections={collections}
        selected={selected}
        onChange={setSelected}
      />

      <FormFooter
        saving={saving}
        uploading={uploading}
        error={error}
        editing={editing}
        onCancel={onDone}
      />
    </form>
  );
}

/**
 * Takes a render function so the generated id can be applied to the control
 * itself — a label rendered as a bare sibling isn't associated with anything,
 * and screen readers announce the field as unlabelled.
 */
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: (id: string) => React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={id}
        className={cn(
          required && "after:ml-0.5 after:text-danger after:content-['*']",
        )}
      >
        {label}
      </Label>
      {children(id)}
    </div>
  );
}

function FavoriteToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[oklch(0.58_0.15_150)]"
      />
      Favorite
    </label>
  );
}

function FormFooter({
  saving,
  uploading,
  error,
  editing,
  onCancel,
}: {
  saving: boolean;
  /** Submitting mid-upload would save the previous media value and strand the
   * finished upload as an unreferenced object. */
  uploading: boolean;
  error: string | null;
  editing: boolean;
  onCancel: () => void;
}) {
  return (
    <>
      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {uploading
            ? "Uploading…"
            : saving
              ? "Saving…"
              : editing
                ? "Save changes"
                : "Capture"}
        </Button>
      </DialogFooter>
    </>
  );
}
