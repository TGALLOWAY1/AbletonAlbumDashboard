"use client";

import { useState } from "react";
import { FolderHeart, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DirTree } from "@/components/samples/dir-tree";
import { dirKey, type DirSelection, type LockedDest } from "@/lib/samples/types";

export function FavoritesLibrary({
  root,
  lockedDest,
  onPickRoot,
  onLock,
  onUnlock,
}: {
  root: FileSystemDirectoryHandle | null;
  lockedDest: LockedDest | null;
  onPickRoot: () => void;
  onLock: (dest: LockedDest) => void;
  onUnlock: () => void;
}) {
  const [candidate, setCandidate] = useState<LockedDest | null>(null);
  const [candidateKey, setCandidateKey] = useState<string | null>(null);

  const handleSelect = (sel: DirSelection) => {
    const label =
      sel.segments.length === 0 ? sel.rootName : sel.segments.join(" / ");
    setCandidate({ segments: sel.segments, label });
    setCandidateKey(dirKey(sel.rootName, sel.segments));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Favorites</h2>
        {root && (
          <Button variant="ghost" size="sm" onClick={onPickRoot}>
            Change
          </Button>
        )}
      </div>

      {!root ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <FolderHeart className="h-8 w-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Choose a folder to use as your Favorites library. Accepted samples
            are copied here.
          </p>
          <Button variant="outline" size="sm" onClick={onPickRoot}>
            Set Favorites folder
          </Button>
        </div>
      ) : (
        <>
          <div className="border-b border-border p-2">
            {lockedDest ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate text-xs font-medium">
                    {lockedDest.label}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUnlock}
                  aria-label="Unlock destination"
                >
                  <LockOpen className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!candidate}
                onClick={() => candidate && onLock(candidate)}
              >
                <Lock className="h-3.5 w-3.5" />
                {candidate
                  ? `Lock "${candidate.label}"`
                  : "Select a folder to lock"}
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-auto p-2">
            <DirTree
              rootName={root.name}
              rootHandle={root}
              selectedKey={candidateKey}
              onSelect={handleSelect}
            />
          </div>
        </>
      )}
    </div>
  );
}
