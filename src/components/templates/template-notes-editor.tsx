"use client";

import * as React from "react";
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ToolbarKey = "bold" | "italic" | "bullet" | "ordered" | "link";

const TOOLBAR: { key: ToolbarKey; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { key: "bold", icon: Bold, label: "Bold" },
  { key: "italic", icon: Italic, label: "Italic" },
  { key: "bullet", icon: List, label: "Bulleted list" },
  { key: "ordered", icon: ListOrdered, label: "Numbered list" },
  { key: "link", icon: Link2, label: "Link" },
];

function applyAction(
  value: string,
  start: number,
  end: number,
  action: ToolbarKey,
): { value: string; selectionStart: number; selectionEnd: number } {
  const before = value.slice(0, start);
  const sel = value.slice(start, end);
  const after = value.slice(end);

  switch (action) {
    case "bold": {
      const inserted = `**${sel || "bold"}**`;
      return {
        value: before + inserted + after,
        selectionStart: before.length + 2,
        selectionEnd: before.length + 2 + (sel || "bold").length,
      };
    }
    case "italic": {
      const inserted = `*${sel || "italic"}*`;
      return {
        value: before + inserted + after,
        selectionStart: before.length + 1,
        selectionEnd: before.length + 1 + (sel || "italic").length,
      };
    }
    case "bullet": {
      const target = sel || "list item";
      const lines = target.split("\n");
      const inserted = lines.map((l) => `- ${l}`).join("\n");
      return {
        value: before + inserted + after,
        selectionStart: before.length,
        selectionEnd: before.length + inserted.length,
      };
    }
    case "ordered": {
      const target = sel || "list item";
      const lines = target.split("\n");
      const inserted = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
      return {
        value: before + inserted + after,
        selectionStart: before.length,
        selectionEnd: before.length + inserted.length,
      };
    }
    case "link": {
      const inserted = `[${sel || "text"}](https://)`;
      return {
        value: before + inserted + after,
        selectionStart: before.length + 1,
        selectionEnd: before.length + 1 + (sel || "text").length,
      };
    }
  }
}

export const TemplateNotesEditor = React.forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
  }
>(function TemplateNotesEditor({ value, onChange }, forwardedRef) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const handleToolbar = (action: ToolbarKey) => {
    const node = innerRef.current;
    if (!node) return;
    const start = node.selectionStart ?? value.length;
    const end = node.selectionEnd ?? value.length;
    const result = applyAction(value, start, end, action);
    onChange(result.value);
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface">
      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
        {TOOLBAR.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-label={t.label}
            onClick={() => handleToolbar(t.key)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors",
              "hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <Textarea
        ref={setRefs}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write notes about this template..."
        className="min-h-32 resize-y border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
    </div>
  );
});
