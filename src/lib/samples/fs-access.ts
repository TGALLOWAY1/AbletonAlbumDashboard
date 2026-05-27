import { isAudioFile } from "@/lib/samples/sample-key";

// The File System Access API is only partially covered by TS's DOM lib.
// Augment the bits we use so the helpers below stay typed.
type PermissionState = "granted" | "denied" | "prompt";
type FsPermissionDescriptor = { mode?: "read" | "readwrite" };

declare global {
  interface FileSystemHandle {
    queryPermission?(d?: FsPermissionDescriptor): Promise<PermissionState>;
    requestPermission?(d?: FsPermissionDescriptor): Promise<PermissionState>;
  }
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<
      FileSystemFileHandle | FileSystemDirectoryHandle
    >;
  }
  interface Window {
    showDirectoryPicker(opts?: {
      mode?: "read" | "readwrite";
    }): Promise<FileSystemDirectoryHandle>;
  }
}

export function isFsAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function pickSourceDirectory(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({ mode: "read" });
}

export function pickFavoritesRoot(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({ mode: "readwrite" });
}

export type DirEntry = {
  kind: "directory";
  name: string;
  handle: FileSystemDirectoryHandle;
};

export type FileEntry = {
  kind: "file";
  name: string;
  handle: FileSystemFileHandle;
};

export type Entries = { dirs: DirEntry[]; files: FileEntry[] };

/** Lists *direct* children of a folder, splitting subfolders from audio files. */
export async function listEntries(
  dir: FileSystemDirectoryHandle,
): Promise<Entries> {
  const dirs: DirEntry[] = [];
  const files: FileEntry[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind === "directory") {
      dirs.push({ kind: "directory", name: entry.name, handle: entry });
    } else if (isAudioFile(entry.name)) {
      files.push({ kind: "file", name: entry.name, handle: entry });
    }
  }
  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));
  return { dirs, files };
}

/** Object URL for instant local playback. Caller must revoke it on cleanup. */
export async function fileToObjectUrl(
  handle: FileSystemFileHandle,
): Promise<string> {
  const file = await handle.getFile();
  return URL.createObjectURL(file);
}

/** Walks/creates nested subdirectories under a root, returning the leaf handle. */
export async function ensureDestPath(
  root: FileSystemDirectoryHandle,
  segments: string[],
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const seg of segments) {
    if (!seg) continue;
    current = await current.getDirectoryHandle(seg, { create: true });
  }
  return current;
}

export type CopyResult = { copied: boolean; duplicate: boolean };

/**
 * Non-destructive copy: reads the source bytes and writes a new file into the
 * destination folder. Detects an existing file of the same name first.
 */
export async function copyFileToFavorites(
  src: FileSystemFileHandle,
  dest: FileSystemDirectoryHandle,
  name: string,
): Promise<CopyResult> {
  let duplicate = false;
  try {
    await dest.getFileHandle(name);
    duplicate = true;
  } catch {
    duplicate = false;
  }
  if (duplicate) return { copied: false, duplicate: true };

  const file = await src.getFile();
  const target = await dest.getFileHandle(name, { create: true });
  const writable = await target.createWritable();
  await writable.write(file);
  await writable.close();
  return { copied: true, duplicate: false };
}

export async function verifyPermission(
  handle: FileSystemHandle,
  write: boolean,
): Promise<boolean> {
  const opts: FsPermissionDescriptor = { mode: write ? "readwrite" : "read" };
  if (handle.queryPermission && (await handle.queryPermission(opts)) === "granted")
    return true;
  if (
    handle.requestPermission &&
    (await handle.requestPermission(opts)) === "granted"
  )
    return true;
  return false;
}
