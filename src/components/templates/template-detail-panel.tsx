"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ExternalLink,
  Folder,
  FolderOpen,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MiniWaveform } from "@/components/library/mini-waveform";
import {
  TEMPLATE_CATEGORY_LABELS,
  type AudioPreview,
  type TemplateItem,
} from "@/lib/data/templates";
import type { TemplateAction } from "./types";
import { TemplateNotesEditor } from "./template-notes-editor";
import { TemplateThumbnail } from "./template-thumbnail";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso));
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const TemplateDetailPanel = React.forwardRef<
  HTMLTextAreaElement,
  {
    item: TemplateItem | null;
    onBack: () => void;
    onAction: (action: TemplateAction, item: TemplateItem) => void;
    onNotesChange: (id: string, notes: string) => void;
    onPreviewPlay: (item: TemplateItem, preview: AudioPreview) => void;
  }
>(function TemplateDetailPanel(
  { item, onBack, onAction, onNotesChange, onPreviewPlay },
  notesRef,
) {
  if (!item) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground shadow-sm">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Template Detail
        </h3>
        <p className="mt-2">
          Select a template card to preview its details, audio examples, and notes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Templates
        </button>
        <Link
          href={`/templates/${item.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open as new page
        </Link>
      </div>

      <TemplateThumbnail seed={item.id} showPlay={false} />

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
        <div>
          <Badge variant="primary">
            {TEMPLATE_CATEGORY_LABELS[item.category]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>

      <Section title="Audio Preview">
        {item.audioPreviews.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No audio previews for this template.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {item.audioPreviews.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-2.5 py-2"
              >
                <button
                  type="button"
                  onClick={() => onPreviewPlay(item, p)}
                  aria-label={`Play ${p.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
                >
                  <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {p.name}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatDuration(p.durationSec)}
                    </span>
                  </div>
                  <MiniWaveform id={p.id} bars={80} height={20} />
                </div>
              </div>
            ))}
            {item.audioPreviews.length > 4 && (
              <button
                type="button"
                className="self-end text-xs font-medium text-primary hover:underline"
                onClick={() => onPreviewPlay(item, item.audioPreviews[0])}
              >
                View all {item.audioPreviews.length} previews
              </button>
            )}
          </div>
        )}
      </Section>

      <Section title="Notes">
        <TemplateNotesEditor
          ref={notesRef}
          value={item.notes}
          onChange={(v) => onNotesChange(item.id, v)}
        />
      </Section>

      <Section title="File Location">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2/60 px-2.5 py-2">
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-xs text-foreground">
            {item.filePath}
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1 justify-center"
            onClick={() => onAction("open-in-finder", item)}
          >
            <FolderOpen className="h-4 w-4" />
            Open in Finder
          </Button>
          <Button
            className="flex-1 justify-center"
            onClick={() => onAction("open-template", item)}
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Open Template
          </Button>
        </div>
      </Section>

      <Section title="Info">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Meta label="Created" value={formatDate(item.createdAt)} />
          <Meta label="Last Modified" value={formatDate(item.updatedAt)} />
        </dl>
      </Section>
    </div>
  );
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}
