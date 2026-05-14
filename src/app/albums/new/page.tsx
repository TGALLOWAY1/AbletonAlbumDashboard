import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoverImageUpload } from "@/components/cover-image-upload";
import { SubmitButton } from "@/components/submit-button";
import { createAlbum } from "@/app/actions/album";
import { isAlbumsTableMissing } from "@/lib/data/album";
import { OWNER_ID } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function NewAlbumPage() {
  const albumsMissing = await isAlbumsTableMissing();

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New album</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/albums">Cancel</Link>
        </Button>
      </div>

      {albumsMissing && (
        <Card className="mb-4 border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">Albums feature not enabled yet</p>
            <p className="mt-1 text-muted-foreground">
              Apply{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">
                supabase/migrations/0010_albums.sql
              </code>{" "}
              to your Supabase project to enable album creation.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Album details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAlbum} className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Untitled album"
                maxLength={120}
              />
            </div>

            <div className="grid gap-2">
              <Label>Cover</Label>
              <CoverImageUpload
                name="cover_image_url"
                pathPrefix={`album/${OWNER_ID}`}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input id="start_date" name="start_date" type="date" />
              <p className="text-xs text-muted-foreground">
                When this album becomes the focus. Used to order the upcoming
                gallery.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="ghost">
                <Link href="/albums">Cancel</Link>
              </Button>
              <SubmitButton pendingText="Creating…">Create album</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
