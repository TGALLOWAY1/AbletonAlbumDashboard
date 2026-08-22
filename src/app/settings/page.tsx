import Link from "next/link";
import { Disc3, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listAlbums } from "@/lib/data/album";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const albums = await listAlbums();
  const activeAlbum = albums.find((a) => a.is_active) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Albums and home preferences.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Disc3 className="h-4 w-4 text-primary" />
            Albums
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {albums.length === 0 ? (
              <>You haven&apos;t created any albums yet.</>
            ) : activeAlbum ? (
              <>
                Active album:{" "}
                <span className="font-medium text-foreground">
                  {activeAlbum.title?.trim() || "Untitled album"}
                </span>{" "}
                · {albums.length} total
              </>
            ) : (
              <>{albums.length} albums · no active album set</>
            )}
          </div>
          <Button asChild size="sm">
            <Link href="/tracks">Manage albums</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <SettingsTile
            href="/settings/session-types"
            icon={Timer}
            title="Session types"
            description="Categories for focus and logged sessions (Sound Design, Arrangement, etc.) with colors."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTile({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Timer;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3 text-sm transition-colors hover:bg-surface-2"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium">{title}</span>
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Link>
  );
}
