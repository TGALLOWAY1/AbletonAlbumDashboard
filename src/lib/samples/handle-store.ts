// Persists File System Access API directory handles across sessions. Handles
// are structured-cloneable so IndexedDB can store them directly; they can't go
// to Supabase. Permission still needs re-granting per session (verifyPermission).

const DB_NAME = "finish-five-samples";
const STORE = "handles";
const SOURCES_KEY = "sources";
const FAVORITES_KEY = "favorites-root";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSourceHandles(): Promise<FileSystemDirectoryHandle[]> {
  return (await idbGet<FileSystemDirectoryHandle[]>(SOURCES_KEY)) ?? [];
}

export async function saveSourceHandles(
  handles: FileSystemDirectoryHandle[],
): Promise<void> {
  await idbSet(SOURCES_KEY, handles);
}

export async function loadFavoritesRoot(): Promise<
  FileSystemDirectoryHandle | undefined
> {
  return idbGet<FileSystemDirectoryHandle>(FAVORITES_KEY);
}

export async function saveFavoritesRoot(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await idbSet(FAVORITES_KEY, handle);
}
