"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
  RESOURCE_TYPE_LABELS,
  type ResourceItem,
  type ResourceType,
} from "@/lib/data/resources";
import { updateResource } from "@/app/actions/resources";
import {
  appendTagFields,
  ResourceTagPicker,
} from "./resource-tag-picker";

/**
 * Edit a saved resource. A sibling of `AddResourceDialog` rather than a mode of
 * it: adding is a choice of *source* — the three tabs, the PDF upload, the
 * link preview — and none of that is editable afterwards. What is left is a
 * plain form over the row's own fields, and it shares the parts that matter
 * (`ResourceTagPicker`, the type list, the same server-action error contract).
 *
 * Like the add dialog it renders its own trigger, for the same reason: it is
 * mounted from a server-rendered page, and an element handed to Radix's
 * `asChild` Slot from there hydrates without the props the Slot injects.
 *
 * The body field follows the row's `source_kind` — the link for a url, the
 * markdown for a note — and a PDF shows neither: replacing the file is an
 * upload, not a text edit.
 */
export function EditResourceDialog({ resource }: { resource: ResourceItem }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(resource.title);
  const [description, setDescription] = React.useState(resource.description);
  const [type, setType] = React.useState<ResourceType>(resource.type);
  const [readMinutes, setReadMinutes] = React.useState(
    String(resource.readMinutes),
  );
  const [tags, setTags] = React.useState<string[]>(resource.tags);
  const [url, setUrl] = React.useState(resource.url ?? "");
  const [content, setContent] = React.useState(resource.content ?? "");
  const [thumbnailUrl, setThumbnailUrl] = React.useState(
    resource.thumbnailUrl ?? "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Reopening after a cancel must show the saved row again, not the abandoned
  // edit.
  function reset() {
    setTitle(resource.title);
    setDescription(resource.description);
    setType(resource.type);
    setReadMinutes(String(resource.readMinutes));
    setTags(resource.tags);
    setUrl(resource.url ?? "");
    setContent(resource.content ?? "");
    setThumbnailUrl(resource.thumbnailUrl ?? "");
    setError(null);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
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
      formData.set("read_minutes", String(readMinutes || 0));
      if (thumbnailUrl.trim()) {
        formData.set("thumbnail_url", thumbnailUrl.trim());
      }
      if (resource.sourceKind === "url") {
        if (!url.trim()) {
          setError("URL is required.");
          setSubmitting(false);
          return;
        }
        formData.set("url", url.trim());
      } else if (resource.sourceKind === "markdown") {
        if (!content.trim()) {
          setError("Markdown content is required.");
          setSubmitting(false);
          return;
        }
        formData.set("content", content);
      }
      appendTagFields(formData, tags);

      const result = await updateResource(resource.id, formData);
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      // The action revalidates the resource's surfaces; refresh so this page
      // shows the saved copy behind the closing dialog.
      router.refresh();
      setOpen(false);
      setSubmitting(false);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit resource</DialogTitle>
          <DialogDescription>
            {resource.sourceKind === "pdf"
              ? "Change the details and tags. The uploaded PDF stays as it is."
              : "Change the details, tags, and content of this resource."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Short summary shown on cards and in the list."
            />
          </div>

          {resource.sourceKind === "url" && (
            <div className="grid gap-2">
              <Label htmlFor="edit-url">Link URL</Label>
              <Input
                id="edit-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>
          )}

          {resource.sourceKind === "markdown" && (
            <div className="grid gap-2">
              <Label htmlFor="edit-content">Markdown content</Label>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ResourceType)}
              >
                <SelectTrigger id="edit-type">
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
              <Label htmlFor="edit-read-minutes">Read time (min)</Label>
              <Input
                id="edit-read-minutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                value={readMinutes}
                onChange={(e) => setReadMinutes(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-thumbnail">Thumbnail URL</Label>
              <Input
                id="edit-thumbnail"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <ResourceTagPicker
            value={tags}
            onChange={setTags}
            disabled={submitting}
          />

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
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
