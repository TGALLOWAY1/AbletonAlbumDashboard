"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/toast";
import {
  LibraryMediaFields,
  type LibraryMedia,
} from "@/components/library/library-media-fields";
import { createCollection, updateCollection } from "@/app/actions/library";
import type { LibraryCollection } from "@/lib/data/library";

/** Create or rename a collection. Membership is managed elsewhere. */
export function CollectionFormDialog({
  open,
  collection,
  onOpenChange,
}: {
  open: boolean;
  collection?: LibraryCollection;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {/* Radix unmounts this subtree on close, so the form's state starts
            fresh every time the dialog opens — no reset effect needed. */}
        <CollectionForm collection={collection} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function CollectionForm({
  collection,
  onOpenChange,
}: {
  collection?: LibraryCollection;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const nameId = React.useId();
  const descriptionId = React.useId();
  const [name, setName] = React.useState(collection?.name ?? "");
  const [description, setDescription] = React.useState(
    collection?.description ?? "",
  );
  const [media, setMedia] = React.useState<LibraryMedia>({
    previewPath: null,
    artworkUrl: collection?.artworkUrl ?? null,
  });
  const [pending, setPending] = React.useState(false);
  // Submitting mid-upload would save the previous artwork and strand the
  // finished upload as an unreferenced object.
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const input = { name, description, artworkUrl: media.artworkUrl };
      if (collection) await updateCollection(collection.id, input);
      else await createCollection(input);
      router.refresh();
      toast(collection ? `Saved “${name}”` : `Created “${name}”`);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {collection ? "Edit collection" : "New collection"}
        </DialogTitle>
        <DialogDescription>
          Collections group Loop Stacks and presets you reach for together —
          Heavy Bass, Ambient Textures, Transitions.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor={nameId}
          className="after:ml-0.5 after:text-danger after:content-['*']"
        >
          Name
        </Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Heavy Bass"
          autoFocus
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={descriptionId}>Description</Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What belongs in here?"
        />
      </div>

      <LibraryMediaFields
        folder="collections"
        value={media}
        onChange={setMedia}
        showPreview={false}
        onUploadingChange={setUploading}
      />

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || uploading}>
          {uploading
            ? "Uploading…"
            : pending
              ? "Saving…"
              : collection
                ? "Save changes"
                : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
