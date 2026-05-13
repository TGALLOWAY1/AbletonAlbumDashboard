import Link from "next/link";
import {
  CalendarClock,
  Disc3,
  LayoutTemplate,
  Repeat,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComingSoon } from "@/components/coming-soon";
import { Settings as SettingsIcon } from "lucide-react";
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
          Albums and dashboard preferences.
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
            <Link href="/albums">Manage albums</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Calendar planning
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <SettingsTile
            href="/settings/session-types"
            icon={CalendarClock}
            title="Session types"
            description="Categories shown on the calendar (Sound Design, Arrangement, etc.) with colors."
          />
          <SettingsTile
            href="/settings/session-templates"
            icon={LayoutTemplate}
            title="Session templates"
            description="Reusable session shapes with default duration and todo lists."
          />
          <SettingsTile
            href="/settings/recurring-blocks"
            icon={Repeat}
            title="Recurring blocks"
            description="Auto-populate the calendar each week (e.g., every Tue 9–11am)."
          />
        </CardContent>
      </Card>

      <ComingSoon
        icon={SettingsIcon}
        title="Preferences"
        description="Default focus duration, recommendation weights, and display preferences. (Single-user app, no auth.)"
      />
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
  icon: typeof CalendarClock;
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
