"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, Plus, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { addStepNote } from "@/app/actions/step-notes";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import {
  prepareImageUpload,
  readImageDimensions,
} from "@/lib/image-downscale";
import {
  MAX_STEP_NOTE_TITLE,
  STEP_NOTE_IMAGE_BUCKET,
  STEP_NOTE_IMAGE_MAX_EDGE,
  STEP_NOTE_KIND_LABELS,
  stepNoteImageKey,
  type StepNoteKind,
} from "@/lib/step-notes";
import type { FinishingStepKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: {
  key: StepNoteKind;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "markdown", icon: FileText },
  { key: "image", icon: ImagePlus },
];

type UploadedImage = {
  path: string;
  url: string;
  width: number | null;
  height: number | null;
  name: string;
};

/**
 * Add a note to one finishing step. The same shape as `AddResourceDialog`,
 * narrowed to the two kinds a step note can be: a markdown body typed here,
 * or an image uploaded here. Like that dialog it renders its own trigger —
 * the notes page is a server component, and an element handed into Radix's
 * `asChild` Slot from one hydrates without the props the Slot injects.
 *
 * An image uploads the moment it is picked, so the preview is the real
 * object and Save is just the row. Backing out after that removes the object
 * again, best-effort, so a changed mind does not leave a file behind.
 */
export function AddStepNoteDialog({
  trackId,
  stepKey,
  variationId,
  stepLabel,
}: {
  trackId: string;
  stepKey: FinishingStepKey;
  variationId: string | null;
  stepLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<StepNoteKind>("markdown");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [image, setImage] = React.useState<UploadedImage | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function discardUpload(current: UploadedImage | null) {
    if (!current) return;
    // The object is public and its key is ours; a failed removal is an
    // orphan in a bucket, not something the user can see. Fire and forget.
    void getBrowserSupabase()
      .storage.from(STEP_NOTE_IMAGE_BUCKET)
      .remove([current.path]);
  }

  function reset(keepUpload = false) {
    if (!keepUpload) discardUpload(image);
    setTab("markdown");
    setTitle("");
    setContent("");
    setImage(null);
    setUploading(false);
    setError(null);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    // Closing runs the reset, and the reset removes an unsaved upload. While
    // a save is in flight that upload may be about to become a row, and
    // while an upload is in flight there is nothing to remove yet — so the
    // dialog stays put (Escape, the overlay and the close control included)
    // until the request has answered.
    if (!next && (submitting || uploading)) return;
    setOpen(next);
    if (!next) reset();
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file (png, jpg, webp, gif, avif).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = getBrowserSupabase();
      // A screenshot off a phone is several megabytes and thousands of
      // pixels wide; shrink it once here, generously, so the text in it
      // stays legible at the width the page will show it.
      const prepared = await prepareImageUpload(file, STEP_NOTE_IMAGE_MAX_EDGE);
      const dims = await readImageDimensions(prepared.body);
      const key = stepNoteImageKey(trackId, prepared.extension);
      const { error: upErr } = await supabase.storage
        .from(STEP_NOTE_IMAGE_BUCKET)
        .upload(key, prepared.body, {
          contentType: prepared.contentType,
          // Unique key per upload, so the bytes never change — same reason
          // covers cache for a year.
          cacheControl: "31536000",
          upsert: false,
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage
        .from(STEP_NOTE_IMAGE_BUCKET)
        .getPublicUrl(key);
      // Replacing a picked image drops the previous object.
      discardUpload(image);
      setImage({
        path: key,
        url: data.publicUrl,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        name: file.name,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    discardUpload(image);
    setImage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const base = { trackId, variationId, stepKey, title };
      const result =
        tab === "markdown"
          ? await addStepNote({ ...base, kind: "markdown", content })
          : image
            ? await addStepNote({
                ...base,
                kind: "image",
                imagePath: image.path,
                imageWidth: image.width,
                imageHeight: image.height,
              })
            : { error: "Upload an image before saving." };
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      // The action revalidated this page; refresh so the list behind the
      // dialog shows the new note straight away. A saved image is now owned
      // by the row, so the reset must not remove it — but one picked and
      // then abandoned for a markdown note is nobody's, so it goes.
      if (tab === "markdown") discardUpload(image);
      router.refresh();
      setOpen(false);
      reset(true);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add note
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a note</DialogTitle>
          <DialogDescription>
            For &ldquo;{stepLabel}&rdquo; — write it in markdown, or upload an
            image.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div
            role="tablist"
            aria-label="Note kind"
            className="flex gap-1 rounded-md border border-border bg-surface-2 p-1"
          >
            {TABS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => {
                  setTab(key);
                  setError(null);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  tab === key
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {STEP_NOTE_KIND_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="step-note-title">Title (optional)</Label>
            <Input
              id="step-note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_STEP_NOTE_TITLE}
              placeholder={
                tab === "markdown"
                  ? "e.g. Palette v2 from ChatGPT"
                  : "e.g. Suno favorites, 12 Sep"
              }
            />
          </div>

          {tab === "markdown" && (
            <div className="grid gap-2">
              <Label htmlFor="step-note-content">Markdown content</Label>
              <Textarea
                id="step-note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
                placeholder={
                  "Paste the palette, the tips, the list — standard markdown is supported."
                }
              />
            </div>
          )}

          {tab === "image" && (
            <div className="grid gap-2">
              <Label htmlFor="step-note-image">Image file</Label>
              <Input
                id="step-note-image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                disabled={uploading}
                onChange={handleImageChange}
              />
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="min-w-0 truncate">
                  {uploading
                    ? "Uploading…"
                    : image
                      ? image.name
                      : `PNG, JPG, WEBP, GIF, AVIF · up to 10MB · resized to ${STEP_NOTE_IMAGE_MAX_EDGE}px`}
                </span>
                {image && !uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearImage}
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              {image && (
                // The preview is the uploaded object itself — a plain <img>
                // because it is a transient preview, not a stored image the
                // optimizer should be caching.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt=""
                  className="max-h-64 w-auto max-w-full rounded-md border border-border bg-surface-2"
                />
              )}
            </div>
          )}

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
              disabled={submitting || uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                uploading ||
                (tab === "markdown" ? content.trim().length === 0 : !image)
              }
            >
              {submitting ? "Saving…" : "Save note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
