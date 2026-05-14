import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isAlbumsTableMissing } from "@/lib/data/album";
import { OWNER_ID } from "@/lib/owner";
import { NewAlbumForm } from "./album-form";

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

      <NewAlbumForm
        coverPathPrefix={`album/${OWNER_ID}`}
        disabled={albumsMissing}
      />
    </div>
  );
}
