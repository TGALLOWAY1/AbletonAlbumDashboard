"use client";

import * as React from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResourceItem } from "@/lib/data/resources";
import { ResourceTypeBadge } from "./resource-type-badge";
import {
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
} from "@/lib/youtube";
import { deleteResource } from "@/app/actions/resources";

export function ResourceViewerDialog({
  resource,
  onClose,
}: {
  resource: ResourceItem | null;
  onClose: () => void;
}) {
  const open = resource !== null;
  // Reset transient state whenever the viewer is closed/swapped to a different
  // resource by keying these values to the current id.
  const id = resource?.id ?? null;
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const lastIdRef = React.useRef<string | null>(null);
  if (lastIdRef.current !== id) {
    lastIdRef.current = id;
    if (busy) setBusy(false);
    if (error) setError(null);
  }

  const isSeed = resource?.id.startsWith("seed-") ?? false;

  async function handleDelete() {
    if (!resource || isSeed) return;
    if (!confirm("Delete this resource? This can't be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteResource(resource.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {resource && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <ResourceTypeBadge type={resource.type} />
                <span className="text-xs text-muted-foreground">
                  {resource.readMinutes} min read
                </span>
              </div>
              <DialogTitle>{resource.title}</DialogTitle>
              {resource.description && (
                <DialogDescription>{resource.description}</DialogDescription>
              )}
            </DialogHeader>

            <ResourceBody resource={resource} />

            {error && (
              <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <DialogFooter className="sm:justify-between">
              <div>
                {!isSeed && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={busy}
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(resource.url ||
                  (resource.sourceKind === "pdf" && resource.url)) && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={resource.url ?? undefined}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in new tab
                    </a>
                  </Button>
                )}
                <Button type="button" onClick={onClose}>
                  Close
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResourceBody({ resource }: { resource: ResourceItem }) {
  if (resource.sourceKind === "markdown") {
    return (
      <div className="rounded-md border border-border bg-surface-2 p-4 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mb-3 [&_h1]:mt-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-surface [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
        <ReactMarkdown>{resource.content ?? ""}</ReactMarkdown>
      </div>
    );
  }
  if (resource.sourceKind === "pdf") {
    if (!resource.url) {
      return (
        <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
          PDF unavailable.
        </p>
      );
    }
    return (
      <iframe
        src={resource.url}
        title={resource.title}
        className="h-[60vh] w-full rounded-md border border-border bg-white"
      />
    );
  }
  if (resource.sourceKind === "url") {
    const ytId = resource.url ? getYouTubeVideoId(resource.url) : null;
    if (ytId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-black">
          <iframe
            src={getYouTubeEmbedUrl(ytId)}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-4">
        {resource.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resource.thumbnailUrl}
            alt=""
            className="aspect-video w-full rounded-md object-cover"
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <a
            href={resource.url ?? undefined}
            target="_blank"
            rel="noreferrer noopener"
            className="break-all text-sm text-primary hover:underline"
          >
            {resource.url}
          </a>
        </div>
      </div>
    );
  }
  return null;
}
