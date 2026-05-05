import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoverImageUpload } from "@/components/cover-image-upload";
import { updateTrack } from "@/app/actions/tracks";
import { getTrack } from "@/lib/data/tracks";

export const dynamic = "force-dynamic";

export default async function EditTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = await getTrack(id);
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

            <div className="grid gap-2">
              <Label>Cover image</Label>
              <CoverImageUpload
                name="cover_image_url"
                pathPrefix={`covers/${track.id}`}
                defaultUrl={track.cover_image_url}
              />
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
