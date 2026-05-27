"use client";

import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DirTree } from "@/components/samples/dir-tree";
import type { DirSelection, SourceRef } from "@/lib/samples/types";

export function SourceBrowser({
  sources,
  activeKey,
  onAddSource,
  onSelectFolder,
}: {
  sources: SourceRef[];
  activeKey: string | null;
  onAddSource: () => void;
  onSelectFolder: (sel: DirSelection) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Sources</h2>
        <Button variant="outline" size="sm" onClick={onAddSource}>
          <FolderPlus className="h-4 w-4" />
          Add Folder
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {sources.length === 0 ? (
          <p className="px-1 py-4 text-xs text-muted-foreground">
            No sources yet. Add a folder to start browsing samples.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {sources.map((src) => (
              <DirTree
                key={src.name}
                rootName={src.name}
                rootHandle={src.handle}
                selectedKey={activeKey}
                onSelect={onSelectFolder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
