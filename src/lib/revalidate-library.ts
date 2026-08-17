import { revalidatePath } from "next/cache";

// Library mutations must refresh the Library landing page and every collection
// detail page, since an asset edited or deleted anywhere shows up in whichever
// collections reference it. Same convention as revalidate-track.ts: actions
// call this rather than hand-rolling a revalidatePath list.
export function revalidateLibrarySurfaces() {
  revalidatePath("/library");
  // Layout-level revalidation covers every /library/collections/[id] instance
  // without the caller needing to know which collections held the asset.
  revalidatePath("/library/collections/[id]", "page");
}
