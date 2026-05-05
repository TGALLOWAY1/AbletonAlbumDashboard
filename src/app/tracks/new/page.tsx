import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoverImageUpload } from "@/components/cover-image-upload";
import { SubmitButton } from "@/components/submit-button";
import { createTrack } from "@/app/actions/tracks";
import { countActiveTracks } from "@/lib/data/tracks";
import { MAX_ACTIVE_TRACKS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewTrackPage() {
  const activeCount = await countActiveTracks();
  const atCap = activeCount >= MAX_ACTIVE_TRACKS;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Add a track</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Track details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTrack} className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Untitled"
                required
                maxLength={120}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="house, dark, melodic"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Free text — use whatever helps you find it.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Cover image</Label>
              <CoverImageUpload
                name="cover_image_url"
                pathPrefix="covers/new"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Where does this go?</Label>
              <select
                id="status"
                name="status"
                defaultValue={atCap ? "backlog" : "active"}
                className="flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-foreground"
              >
                <option value="active" disabled={atCap}>
                  Active{" "}
                  {atCap
                    ? `(at cap of ${MAX_ACTIVE_TRACKS})`
                    : `(${activeCount}/${MAX_ACTIVE_TRACKS})`}
                </option>
                <option value="backlog">Backlog</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="ghost">
                <Link href="/">Cancel</Link>
              </Button>
              <SubmitButton pendingText="Creating…">Create track</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
