import type { ReviewStatus } from "@/lib/types";

export type SourceRef = { name: string; handle: FileSystemDirectoryHandle };

/** A folder selected for browsing, identified by its path from the source root. */
export type DirSelection = {
  handle: FileSystemDirectoryHandle;
  segments: string[]; // path from the displayed root, excluding the root itself
  rootName: string;
};

/** A single audio file as shown in the center list. */
export type SampleVM = {
  key: string; // sample_key: `${rootName}:${relPath}`
  name: string;
  relPath: string; // display path incl. root name, e.g. "Drums/Kicks/x.wav"
  type: string;
  handle: FileSystemFileHandle;
};

/** The locked Favorites destination that `A` / "Add" routes to. */
export type LockedDest = { segments: string[]; label: string };

export type StatusMap = Record<string, ReviewStatus>;

export function dirKey(rootName: string, segments: string[]): string {
  return [rootName, ...segments].join("/");
}
