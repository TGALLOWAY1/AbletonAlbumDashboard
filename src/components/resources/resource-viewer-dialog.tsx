"use client";

import * as React from "react";
import { ExternalLink, Trash2 } from "lucide-react";
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
import { ResourceBody } from "./resource-body";
import { ResourceTypeBadge } from "./resource-type-badge";
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
