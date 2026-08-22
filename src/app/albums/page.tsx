import { redirect } from "next/navigation";

/**
 * The albums shelf folded into the track library.
 *
 * `/tracks` already grouped the library by album in this page's own shelf
 * order, so the two were the same list with different amounts of detail. The
 * album *detail* route (`/albums/[id]`) is still where a record is edited, so
 * only this index went away.
 *
 * Kept as a redirect rather than deleted: `/albums` was in both navs for long
 * enough to be bookmarked, and it is still the natural URL to type. A
 * temporary redirect, so browsers don't cache it past a change of heart.
 */
export default function AlbumsPage() {
  redirect("/tracks");
}
