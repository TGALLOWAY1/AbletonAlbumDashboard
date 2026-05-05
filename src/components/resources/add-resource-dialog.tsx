"use client";

import * as React from "react";
import {
  FileText,
  ImageOff,
  Link as LinkIcon,
  Plus,
  Upload,
  Video,
  X,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_TYPE_LABELS,
  type ResourceCategoryId,
  type ResourceSourceKind,
  type ResourceType,
} from "@/lib/data/resources";
import { createResource } from "@/app/actions/resources";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
} from "@/lib/youtube";

const RESOURCE_FILES_BUCKET = "resource-files";

type Tab = ResourceSourceKind;

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "pdf", label: "PDF", icon: Upload },
  { key: "markdown", label: "Markdown", icon: FileText },
  { key: "url", label: "URL / Video", icon: LinkIcon },
];

const DEFAULT_TYPE_BY_TAB: Record<Tab, ResourceType> = {
  pdf: "guide",
  markdown: "article",
  url: "video",
};

export function AddResourceDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("pdf");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<ResourceCategoryId>(
    RESOURCE_CATEGORIES[0].id,
  );
  const [type, setType] = React.useState<ResourceType>("guide");
  const [readMinutes, setReadMinutes] = React.useState("5");

  const [storagePath, setStoragePath] = React.useState("");
  const [pdfName, setPdfName] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  const [content, setContent] = React.useState("");

  const [url, setUrl] = React.useState("");
  const [thumbnailOverride, setThumbnailOverride] = React.useState("");

  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const youTubeId = React.useMemo(
    () => (tab === "url" ? getYouTubeVideoId(url) : null),
    [tab, url],
  );
  const autoThumbnail =
    youTubeId !== null ? getYouTubeThumbnailUrl(youTubeId) : null;
  const previewThumbnail = thumbnailOverride.trim() || autoThumbnail;

  function reset() {
    setTab("pdf");
    setTitle("");
    setDescription("");
    setCategoryId(RESOURCE_CATEGORIES[0].id);
    setType("guide");
    setReadMinutes("5");
    setStoragePath("");
    setPdfName("");
    setUploading(false);
    setContent("");
    setUrl("");
    setThumbnailOverride("");
    setError(null);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    setType(DEFAULT_TYPE_BY_TAB[next]);
    setError(null);
  }

  async function handlePdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Pick a PDF file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("PDF must be under 50MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = getBrowserSupabase();
      const safeName = file.name
        .replace(/\.pdf$/i, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .slice(0, 60) || "resource";
      const key = `${Date.now()}-${crypto.randomUUID()}-${safeName}.pdf`;
      const { error: upErr } = await supabase.storage
        .from(RESOURCE_FILES_BUCKET)
        .upload(key, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      setStoragePath(key);
      setPdfName(file.name);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function clearPdf() {
    setStoragePath("");
    setPdfName("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("type", type);
      formData.set("category_id", categoryId);
      formData.set("source_kind", tab);
      formData.set("read_minutes", String(readMinutes || 5));
      if (tab === "pdf") {
        if (!storagePath) {
          setError("Upload a PDF before saving.");
          setSubmitting(false);
          return;
        }
        formData.set("storage_path", storagePath);
      } else if (tab === "markdown") {
        if (!content.trim()) {
          setError("Markdown content is required.");
          setSubmitting(false);
          return;
        }
        formData.set("content", content);
      } else if (tab === "url") {
        if (!url.trim()) {
          setError("URL is required.");
          setSubmitting(false);
          return;
        }
        formData.set("url", url.trim());
        if (thumbnailOverride.trim()) {
          formData.set("thumbnail_url", thumbnailOverride.trim());
        }
      }
      await createResource(formData);
      handleOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a resource</DialogTitle>
          <DialogDescription>
            Upload a PDF, jot down a markdown note, or save a YouTube video or
            article link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="flex gap-1 rounded-md border border-border bg-surface-2 p-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  tab === key
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === "pdf" && (
            <div className="grid gap-2">
              <Label>PDF file</Label>
              <Input
                type="file"
                accept="application/pdf"
                disabled={uploading}
                onChange={handlePdfChange}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {uploading
                    ? "Uploading…"
                    : pdfName
                      ? pdfName
                      : "PDF only · up to 50MB"}
                </span>
                {storagePath && !uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearPdf}
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )}

          {tab === "markdown" && (
            <div className="grid gap-2">
              <Label htmlFor="content">Markdown content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder={
                  "# Title\n\nWrite your notes here. Standard markdown is supported."
                }
              />
            </div>
          )}

          {tab === "url" && (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="url">Link URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="thumbnail">
                  Thumbnail URL{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional · auto-detected for YouTube)
                  </span>
                </Label>
                <Input
                  id="thumbnail"
                  type="url"
                  value={thumbnailOverride}
                  onChange={(e) => setThumbnailOverride(e.target.value)}
                  placeholder="https://…/preview.jpg"
                />
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Preview
                </span>
                <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-surface-2">
                  {previewThumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewThumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                      {youTubeId === null && url ? (
                        <>
                          <LinkIcon className="h-6 w-6" />
                          <span className="text-xs">External link</span>
                        </>
                      ) : (
                        <>
                          <ImageOff className="h-6 w-6" />
                          <span className="text-xs">
                            Paste a YouTube link or thumbnail URL to preview
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {youTubeId && (
                    <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                      <Video className="h-3.5 w-3.5" />
                      YouTube
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Complete Drum Sound Design Workflow"
              required
              maxLength={200}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Short summary shown on cards and in the list."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={categoryId}
                onValueChange={(v) =>
                  setCategoryId(v as ResourceCategoryId)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ResourceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(RESOURCE_TYPE_LABELS) as [
                      ResourceType,
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="read_minutes">Read time (min)</Label>
              <Input
                id="read_minutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                value={readMinutes}
                onChange={(e) => setReadMinutes(e.target.value)}
              />
            </div>
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
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? "Saving…" : "Save resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
