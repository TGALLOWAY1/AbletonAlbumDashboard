import { LibraryMiniPlayer } from "@/components/library/library-mini-player";
import { LibraryPlayerProvider } from "@/components/library/library-player-provider";
import { LibraryPlayerSpacer } from "@/components/library/library-player-spacer";

/**
 * The player lives at the layout level, not in the page and not in the root
 * layout: mounting it here means playback survives navigation between
 * `/library` and a collection page, without putting an audio element on every
 * other surface in the app.
 */
export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LibraryPlayerProvider>
      {children}
      <LibraryPlayerSpacer />
      <LibraryMiniPlayer />
    </LibraryPlayerProvider>
  );
}
