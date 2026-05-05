import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Clock3, Pencil, Play } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StagesChecklist } from "@/components/stages-checklist";
import { BottleneckEditor } from "@/components/bottleneck-editor";
import { NextActionEditor } from "@/components/next-action-editor";
import { NotesEditor } from "@/components/notes-editor";
import { AudioVersionList } from "@/components/audio-version-list";
import { CopyPathButton } from "@/components/copy-path-button";
import { getTrack } from "@/lib/data/tracks";
import { getVersionsForTrack } from "@/lib/data/versions";

export const dynamic = "force-dynamic";

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [track, versions] = await Promise.all([
    getTrack(id),
    getVersionsForTrack(id),
  ]);
  if (!track) notFound();

  const [genre, ...descriptors] = track.tags;

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <Link
            href={`/tracks/${track.id}/edit`}
            aria-label="Edit cover image"
            className="group relative h-36 w-36 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15"
          >
            {track.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl font-bold text-foreground/30">
                {track.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/40 text-xs font-semibold uppercase tracking-wide text-background opacity-0 transition-opacity group-hover:opacity-100">
              Edit cover
            </div>
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {track.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {genre && <Badge variant="primary">{genre}</Badge>}
              <Badge variant="default">{track.status}</Badge>
            </div>
            {descriptors.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {descriptors.join(", ")}
              </p>
            )}
            <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Created {format(new Date(track.created_at), "MMM d, yyyy")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {track.last_worked_at
                  ? `Last worked ${format(new Date(track.last_worked_at), "MMM d, yyyy")}`
                  : "Never worked on yet"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/tracks/${track.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit metadata
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/focus/${track.id}`}>
              <Play className="h-4 w-4" />
              Start focus session
            </Link>
          </Button>
        </div>
      </div>

      {track.als_file_path && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface p-3 text-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Project file
          </span>
          <span className="truncate font-mono text-xs text-foreground">
            {track.als_file_path}
          </span>
          <CopyPathButton
            path={track.als_file_path}
            size="sm"
            className="ml-auto"
          />
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="files" disabled>
            Files (soon)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <StagesChecklist trackId={track.id} stages={track.stages} />
            <div className="flex flex-col gap-4">
              <BottleneckEditor
                trackId={track.id}
                bottleneck={track.bottleneck}
              />
              <NextActionEditor
                trackId={track.id}
                action={track.primaryAction}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <NotesEditor trackId={track.id} initial={track.notes} />
        </TabsContent>

        <TabsContent value="versions">
          <AudioVersionList trackId={track.id} versions={versions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
