import "server-only";
import {
  fetchCollectionDetail,
  fetchLibrarySnapshot,
  type CollectionDetail,
  type LibrarySnapshot,
} from "@/lib/data/library-db";
import { resolveCollectionItems } from "@/lib/data/library";

/**
 * Where the Library's data comes from.
 *
 * Normally: Supabase. When `LIBRARY_FIXTURES=1` is set in a non-production
 * environment, a sample library is served instead so the browse, audition and
 * collection flows can be exercised end to end without touching the user's
 * real data — and, just as importantly, without ever writing sample rows into
 * it. The fixtures are pulled in with a dynamic import so they stay out of the
 * production bundle entirely.
 */
function fixturesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.LIBRARY_FIXTURES === "1"
  );
}

export async function loadLibrarySnapshot(): Promise<LibrarySnapshot> {
  if (fixturesEnabled()) {
    const { libraryFixtures } = await import("@/lib/data/library-fixtures");
    return libraryFixtures();
  }
  return fetchLibrarySnapshot();
}

export async function loadCollectionDetail(
  id: string,
): Promise<CollectionDetail | null> {
  if (fixturesEnabled()) {
    const { libraryFixtures } = await import("@/lib/data/library-fixtures");
    const snapshot = libraryFixtures();
    const collection = snapshot.collections.find((c) => c.id === id);
    if (!collection) return null;
    return {
      collection,
      items: resolveCollectionItems(
        collection,
        snapshot.loopStacks,
        snapshot.presets,
      ),
      allLoopStacks: snapshot.loopStacks,
      allPresets: snapshot.presets,
    };
  }
  return fetchCollectionDetail(id);
}
