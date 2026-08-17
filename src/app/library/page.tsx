import { LibraryBrowser } from "@/components/library/library-browser";
import { loadLibrarySnapshot } from "@/lib/data/library-source";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const { loopStacks, presets, collections } = await loadLibrarySnapshot();

  return (
    <LibraryBrowser
      loopStacks={loopStacks}
      presets={presets}
      collections={collections}
    />
  );
}
