import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getOpenActionsForTrack,
  getTrack,
} from "@/lib/data/tracks";
import { getVersionsForTrack } from "@/lib/data/versions";
import { VersionItem } from "@/components/audio/version-item";
import { TrackTodoList } from "@/components/mobile/track-todo-list";

export const dynamic = "force-dynamic";

export default async function MobileTrackPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  const [track, versions, todos] = await Promise.all([
    getTrack(trackId),
    getVersionsForTrack(trackId),
    getOpenActionsForTrack(trackId),
  ]);

  if (!track) notFound();

  const tag = track.tags?.[0];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 pb-4">
      <Link
        href="/"
        className="-ml-2 inline-flex h-11 w-11 items-center justify-center text-muted-foreground"
        aria-label="Back to dashboard"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <header className="flex items-center gap-3">
        {track.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.cover_image_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-md bg-surface-2" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{track.name}</h1>
          {tag && (
            <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
              {tag}
            </p>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preview
        </h2>
        {versions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {versions.map((v) => (
              <li key={v.id}>
                <VersionItem
                  version={v}
                  trackId={track.id}
                  showDelete={false}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No preview yet. Upload a bounce on desktop.
          </p>
        )}
        {track.als_file_path && (
          <p className="truncate text-xs text-muted-foreground">
            Project: {track.als_file_path}
          </p>
        )}
      </section>

      <section>
        <TrackTodoList trackId={track.id} initial={todos} />
      </section>
    </div>
  );
}
