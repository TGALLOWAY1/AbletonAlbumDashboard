import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoverImageUpload } from "@/components/cover-image-upload";
import { updateTrack } from "@/app/actions/tracks";
import { getTrack } from "@/lib/data/tracks";
import { listAlbums } from "@/lib/data/album";

export const dynamic = "force-dynamic";

export default async function EditTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [track, albums] = await Promise.all([getTrack(id), listAlbums()]);
  if (!track) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit track</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/tracks/${track.id}`}>Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTrack} className="flex flex-col gap-5">
            <input type="hidden" name="id" value={track.id} />

            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={track.name}
                required
                maxLength={120}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={track.tags.join(", ")}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="song_key">Key</Label>
                <Input
                  id="song_key"
                  name="song_key"
                  defaultValue={track.song_key ?? ""}
                  placeholder="e.g. Am, F#m, C"
                  maxLength={20}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bpm">BPM</Label>
                <Input
                  id="bpm"
                  name="bpm"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  defaultValue={track.bpm ?? ""}
                  placeholder="e.g. 140"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Cover image</Label>
              <CoverImageUpload
                name="cover_image_url"
                pathPrefix={`covers/${track.id}`}
                defaultUrl={track.cover_image_url}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="album_id">Album</Label>
              <select
                id="album_id"
                name="album_id"
                defaultValue={track.album_id ?? ""}
                className="flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-foreground"
              >
                <option value="">No album</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.title?.trim() || "Untitled album") +
                      (a.is_active ? " · active" : "")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="als_file_path">Ableton project file (.als)</Label>
              <Input
                id="als_file_path"
                name="als_file_path"
                type="text"
                defaultValue={track.als_file_path ?? ""}
                placeholder="/Users/you/Music/Ableton/Track Name.als"
              />
              <p className="text-xs text-muted-foreground">
                Paste the absolute path to the .als file. The detail page will
                show an &ldquo;Open in Finder&rdquo; button that copies it to
                your clipboard.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="ghost">
                <Link href={`/tracks/${track.id}`}>Cancel</Link>
              </Button>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
