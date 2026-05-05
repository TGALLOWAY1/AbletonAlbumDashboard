"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToastProvider, useToast } from "@/components/library/toast";
import {
  type AudioPreview,
  type TemplateItem,
} from "@/lib/data/templates";
import { TemplateDetailPanel } from "./template-detail-panel";
import type { TemplateAction } from "./types";

const DESKTOP_TOAST = "Desktop integration required to open local files.";

function TemplatePageInner({ initial }: { initial: TemplateItem }) {
  const router = useRouter();
  const { toast } = useToast();
  const [item, setItem] = React.useState(initial);
  const notesRef = React.useRef<HTMLTextAreaElement | null>(null);

  const updateNotes = (_id: string, notes: string) =>
    setItem((prev) => ({
      ...prev,
      notes,
      updatedAt: new Date().toISOString(),
    }));

  const handleAction = (action: TemplateAction) => {
    switch (action) {
      case "open-template":
      case "open-in-finder":
      case "reveal-template":
        toast(DESKTOP_TOAST);
        return;
      case "duplicate":
        toast(`Duplicated "${item.name}"`);
        return;
      case "edit-notes":
        notesRef.current?.focus();
        return;
      case "archive":
        toast(`Archived "${item.name}"`);
        return;
      case "delete":
        toast(`Delete from the templates list, not the detail page.`);
        return;
      default:
        return;
    }
  };

  const handlePreviewPlay = (_t: TemplateItem, preview: AudioPreview) => {
    toast(`Playing preview: ${preview.name}`);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/templates">
            <ChevronLeft className="h-4 w-4" />
            All templates
          </Link>
        </Button>
      </div>

      <TemplateDetailPanel
        ref={notesRef}
        item={item}
        onBack={() => router.push("/templates")}
        onAction={handleAction}
        onNotesChange={updateNotes}
        onPreviewPlay={handlePreviewPlay}
      />
    </div>
  );
}

export function TemplatePageView({ template }: { template: TemplateItem }) {
  return (
    <ToastProvider>
      <TemplatePageInner initial={template} />
    </ToastProvider>
  );
}
