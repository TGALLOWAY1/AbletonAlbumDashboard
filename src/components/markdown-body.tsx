"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Stored markdown, rendered. One component for every markdown body the app
 * keeps — a resource's content, a finishing-step note — so they read the same
 * and share one guard: the text comes from the database, so a corrupt value
 * could throw during render, and that is caught here instead of at the page
 * boundary.
 */
class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[markdown] render failed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
          Couldn&apos;t render this content.
        </p>
      );
    }
    return this.props.children;
  }
}

export const MARKDOWN_BODY_CLASS =
  "text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mb-3 [&_h1]:mt-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-surface [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6";

export function MarkdownBody({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <MarkdownErrorBoundary>
      <div className={cn(MARKDOWN_BODY_CLASS, className)}>
        <ReactMarkdown>{children}</ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
}
