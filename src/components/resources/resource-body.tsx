"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ResourceItem } from "@/lib/data/resources";
import {
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
} from "@/lib/youtube";

// Markdown content comes from the DB, so a corrupt value could throw during
// render. Catch it locally instead of letting it bubble to the page boundary.
class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[resources] markdown render failed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
          Couldn&apos;t render this resource&apos;s content.
        </p>
      );
    }
    return this.props.children;
  }
}

export function ResourceBody({ resource }: { resource: ResourceItem }) {
  if (resource.sourceKind === "markdown") {
    return (
      <MarkdownErrorBoundary>
        <div className="rounded-md border border-border bg-surface-2 p-4 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mb-3 [&_h1]:mt-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-surface [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
          <ReactMarkdown>{resource.content ?? ""}</ReactMarkdown>
        </div>
      </MarkdownErrorBoundary>
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
