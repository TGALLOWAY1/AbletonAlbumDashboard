"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listEntries, type DirEntry } from "@/lib/samples/fs-access";
import { dirKey, type DirSelection } from "@/lib/samples/types";

function TreeNode({
  name,
  handle,
  segments,
  rootName,
  selectedKey,
  onSelect,
  defaultExpanded = false,
}: {
  name: string;
  handle: FileSystemDirectoryHandle;
  segments: string[];
  rootName: string;
  selectedKey: string | null;
  onSelect: (sel: DirSelection) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [children, setChildren] = useState<DirEntry[] | null>(null);

  const myKey = dirKey(rootName, segments);
  const selected = selectedKey === myKey;
  const label = segments.length === 0 ? rootName : name;

  useEffect(() => {
    if (!expanded || children) return;
    let cancelled = false;
    listEntries(handle)
      .then(({ dirs }) => {
        if (!cancelled) setChildren(dirs);
      })
      .catch(() => {
        if (!cancelled) setChildren([]);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, children, handle]);

  const indent = segments.length * 12 + 4;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded py-1 pr-1 text-sm hover:bg-surface-2",
          selected && "bg-surface-2 text-primary",
        )}
        style={{ paddingLeft: indent }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-muted-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => onSelect({ handle, segments, rootName })}
        >
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </button>
      </div>
      {expanded && (
        <div>
          {children?.map((c) => (
            <TreeNode
              key={c.name}
              name={c.name}
              handle={c.handle}
              segments={[...segments, c.name]}
              rootName={rootName}
              selectedKey={selectedKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DirTree({
  rootName,
  rootHandle,
  selectedKey,
  onSelect,
}: {
  rootName: string;
  rootHandle: FileSystemDirectoryHandle;
  selectedKey: string | null;
  onSelect: (sel: DirSelection) => void;
}) {
  return (
    <TreeNode
      name={rootName}
      handle={rootHandle}
      segments={[]}
      rootName={rootName}
      selectedKey={selectedKey}
      onSelect={onSelect}
      defaultExpanded
    />
  );
}
