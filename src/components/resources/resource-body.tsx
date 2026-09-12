"use client";

import { ExternalLink } from "lucide-react";
import { MarkdownBody } from "@/components/markdown-body";
import type { ResourceItem } from "@/lib/data/resources";
import {
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
} from "@/lib/youtube";

export function ResourceBody({ resource }: { resource: ResourceItem }) {
  if (resource.sourceKind === "markdown") {
    return (
      <MarkdownBody className="rounded-md border border-border bg-surface-2 p-4">
        {resource.content ?? ""}
      </MarkdownBody>
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
    if (!resource.url) {
      return (
        <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
          This resource has no link.
        </p>
      );
    }
    const ytId = getYouTubeVideoId(resource.url);
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
