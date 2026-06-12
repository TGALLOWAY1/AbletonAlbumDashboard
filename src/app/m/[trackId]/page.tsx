import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Play } from "lucide-react";
import {
  getCompletedActionsForTrack,
  getOpenActionsForTrack,
  getTrack,
} from "@/lib/data/tracks";
import { getVersionsForTrack } from "@/lib/data/versions";
import { getSessionTypes } from "@/lib/data/session-types";
import { getSessionsForTrack } from "@/lib/data/sessions";
import { TrackSessionHistory } from "@/components/track-session-history";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrackTodoList } from "@/components/mobile/track-todo-list";
import { TrackTodoHistory } from "@/components/mobile/track-todo-history";
import { StagesChecklist } from "@/components/stages-checklist";
import { BottleneckEditor } from "@/components/bottleneck-editor";
import { NextActionEditor } from "@/components/next-action-editor";
import { NotesEditor } from "@/components/notes-editor";
import { AudioVersionList } from "@/components/audio-version-list";
import { CopyPathButton } from "@/components/copy-path-button";
import { ManualSessionEntry } from "@/components/manual-session-dialog";

export const dynamic = "force-dynamic";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

export default async function MobileTrackPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  const [track, versions, todos, completedTodos, sessionTypes, sessions] =
    await Promise.all([
      getTrack(trackId),
      getVersionsForTrack(trackId),
      getOpenActionsForTrack(trackId),
      getCompletedActionsForTrack(trackId),
      getSessionTypes(),
      getSessionsForTrack(trackId),
    ]);

  if (!track) notFound();

  const [genre, ...descriptors] = track.tags;
  const meta = [
    track.song_key ? track.song_key : null,
    track.bpm ? `${track.bpm} BPM` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 pb-4">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center text-muted-foreground"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Button asChild variant="ghost" size="sm" className="-mr-2">
          <Link
            href={`/tracks/${track.id}/edit`}
            aria-label="Edit track metadata"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <header className="flex items-start gap-3">
        {track.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.cover_image_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-md bg-surface-2" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold leading-tight">
            {track.name}
          </h1>
          {genre && (
            <div className="mt-1.5">
              <Badge variant="primary">{genre}</Badge>
            </div>
          )}
          {meta.length > 0 && (
            <p className="mt-1.5 text-xs font-medium tabular-nums text-foreground/80">
              {meta.join(" · ")}
            </p>
          )}
          {descriptors.length > 0 && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {descriptors.join(", ")}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <Button asChild size="lg" className="w-full">
          <Link href={`/focus/${track.id}`}>
            <Play className="h-4 w-4" />
            Start focus session
          </Link>
        </Button>
        <ManualSessionEntry
          trackId={track.id}
          tracks={[]}
          sessionTypes={sessionTypes}
          variant="mobile"
        />
      </div>

      <section className="flex flex-col gap-2">
        <SectionHeading>Tasks</SectionHeading>
        <TrackTodoList trackId={track.id} initial={todos} />
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>Stages</SectionHeading>
        <StagesChecklist trackId={track.id} stages={track.stages} />
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>Bottleneck</SectionHeading>
        <BottleneckEditor trackId={track.id} bottleneck={track.bottleneck} />
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>Next action</SectionHeading>
        <NextActionEditor trackId={track.id} action={track.primaryAction} />
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>Versions</SectionHeading>
        <AudioVersionList trackId={track.id} versions={versions} />
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>Notes</SectionHeading>
        <NotesEditor trackId={track.id} initial={track.notes} />
      </section>

      {track.als_file_path && (
        <section className="flex flex-col gap-2">
          <SectionHeading>Project file</SectionHeading>
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
              {track.als_file_path}
            </span>
            <CopyPathButton path={track.als_file_path} size="sm" />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <SectionHeading>Sessions</SectionHeading>
        <TrackSessionHistory sessions={sessions} />
      </section>

      <section>
        <TrackTodoHistory trackId={track.id} initial={completedTodos} />
      </section>
    </div>
  );
}
