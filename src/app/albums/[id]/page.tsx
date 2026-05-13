import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Disc3, Star, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoverImageUpload } from "@/components/cover-image-upload";
import { TrackCard } from "@/components/track-card";
import {
  deleteAlbum,
  setActiveAlbum,
  updateAlbum,
} from "@/app/actions/album";
import { getAlbum } from "@/lib/data/album";
import { getTracksByAlbum } from "@/lib/data/tracks";
import { OWNER_ID } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  const tracks = await getTracksByAlbum(album.id);
  const startLabel = album.start_date
    ? format(parseISO(album.start_date), "MMMM d, yyyy")
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15">
            {album.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-foreground/25">
                <Disc3 className="h-8 w-8" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {album.title?.trim() || "Untitled album"}
              </h1>
              {album.is_active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  <Star className="h-3 w-3" /> Active
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
              {startLabel ? ` · starts ${startLabel}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/albums">All albums</Link>
          </Button>
          {!album.is_active && (
            <form
              action={async () => {
                "use server";
                await setActiveAlbum(album.id);
              }}
            >
              <Button type="submit" size="sm">
                <Star className="h-4 w-4" />
                Set active
              </Button>
            </form>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAlbum} className="flex flex-col gap-5">
            <input type="hidden" name="id" value={album.id} />

            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={album.title ?? ""}
                placeholder="Untitled album"
                maxLength={120}
              />
            </div>

            <div className="grid gap-2">
              <Label>Cover</Label>
              <CoverImageUpload
                name="cover_image_url"
                pathPrefix={`album/${OWNER_ID}/${album.id}`}
                defaultUrl={album.cover_image_url}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={album.start_date ?? ""}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tracks
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/tracks/new">Add track</Link>
          </Button>
        </div>
        {tracks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No tracks in this album yet. Open any track and assign it to{" "}
              <span className="font-medium">
                {album.title?.trim() || "this album"}
              </span>
              , or create a new one.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Delete this album. Tracks in it stay in your library but become
            unassigned.
          </p>
          <form
            action={async () => {
              "use server";
              await deleteAlbum(album.id);
              redirect("/albums");
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
              Delete album
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
