import Link from "next/link";
import { Plus } from "lucide-react";
import { TrackCard } from "@/components/track-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllTracks } from "@/lib/data/tracks";
import { TRACK_STATUSES, type TrackWithDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  backlog: "Backlog",
  completed: "Completed",
  archived: "Archived",
};

export default async function AllTracksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const tracks = await getAllTracks();
  const statusFilter = (
    params.status && TRACK_STATUSES.includes(params.status as never)
      ? params.status
      : "all"
  ) as string;
  const tagFilter = (params.tag ?? "").trim().toLowerCase();

  const allTags = Array.from(
    new Set(tracks.flatMap((t) => t.tags.map((x) => x.toLowerCase()))),
  ).sort();

  const filtered = tracks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (tagFilter && !t.tags.some((x) => x.toLowerCase() === tagFilter))
      return false;
    return true;
  });

  const grouped = new Map<string, TrackWithDetails[]>();
  filtered.forEach((t) => {
    const list = grouped.get(t.status) ?? [];
    list.push(t);
    grouped.set(t.status, list);
  });

  const order = ["active", "backlog", "completed", "archived"];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">All tracks</h1>
          <p className="mt-1 text-muted-foreground">
            Library view — beyond the active five.
          </p>
        </div>
        <Button asChild>
          <Link href="/tracks/new">
            <Plus className="h-4 w-4" />
            Add Track
          </Link>
        </Button>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <FilterPill href="/tracks" active={statusFilter === "all"}>
            All
          </FilterPill>
          {TRACK_STATUSES.map((s) => {
            const usp = new URLSearchParams();
            usp.set("status", s);
            if (tagFilter) usp.set("tag", tagFilter);
            return (
              <FilterPill
                key={s}
                href={`/tracks?${usp.toString()}`}
                active={statusFilter === s}
              >
                {STATUS_LABELS[s] ?? s}
              </FilterPill>
            );
          })}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Tag
            </span>
            <FilterPill
              href={
                statusFilter === "all"
                  ? "/tracks"
                  : `/tracks?status=${statusFilter}`
              }
              active={!tagFilter}
            >
              All
            </FilterPill>
            {allTags.map((tag) => {
              const usp = new URLSearchParams();
              if (statusFilter !== "all") usp.set("status", statusFilter);
              usp.set("tag", tag);
              return (
                <FilterPill
                  key={tag}
                  href={`/tracks?${usp.toString()}`}
                  active={tagFilter === tag}
                >
                  #{tag}
                </FilterPill>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            No tracks match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {order
            .filter((s) => grouped.has(s))
            .map((s) => (
              <section key={s}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {STATUS_LABELS[s] ?? s}
                  <Badge variant="default">{grouped.get(s)?.length ?? 0}</Badge>
                </h2>
                <div className="flex flex-col gap-3">
                  {grouped.get(s)?.map((t) => (
                    <TrackCard key={t.id} track={t} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1 text-xs transition-colors " +
        (active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-surface-2 text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}
