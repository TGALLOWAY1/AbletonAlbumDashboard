"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  AudioLines,
  Check,
  RotateCcw,
  Sparkles,
  Star,
  TrendingUp,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VersionItem } from "@/components/audio/version-item";
import { readAudioDuration } from "@/components/audio/read-audio-duration";
import {
  SunoExperimentDialog,
  type SunoTrackMeta,
} from "@/components/suno/suno-experiment-dialog";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { addVersionRecord } from "@/app/actions/versions";
import {
  deleteTrackTodo,
  toggleTrackTodo,
} from "@/app/actions/track-todos";
import { useToast } from "@/components/toast";
import { PRODUCTION_ACTIVITIES } from "@/lib/production-activities";
import type { TrackSessionWithActivities } from "@/lib/data/sessions";
import type { ActionRow, VersionRow } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ACTIVITY_LABELS = new Map(
  PRODUCTION_ACTIVITIES.map((a) => [a.key as string, a.label]),
);

const FILTERS = ["all", "bounces", "sessions"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  bounces: "Bounces",
  sessions: "Sessions",
};

type Entry =
  | { kind: "version"; at: number; version: VersionRow }
  | { kind: "session"; at: number; session: TrackSessionWithActivities }
  | { kind: "task"; at: number; task: ActionRow };

function sessionSeconds(s: TrackSessionWithActivities): number {
  if (s.duration_seconds != null) return s.duration_seconds;
  if (s.started_at && s.ended_at) {
    const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
    return Math.max(0, Math.round(ms / 1000));
  }
  return 0;
}

/**
 * Everything that has happened to this track, on one timeline.
 *
 * Bounces, logged sessions and finished tasks used to be three separate
 * sections asking the same question ("what happened here?"), so they are one
 * pane now, ordered by when they happened. Uploading a bounce lives at the
 * bottom of the same pane because a new bounce is just the newest entry.
 */
export function TrackLogPane({
  trackId,
  versions,
  sessions,
  completedTasks,
  suno,
  variant = "desktop",
}: {
  trackId: string;
  versions: VersionRow[];
  sessions: TrackSessionWithActivities[];
  completedTasks: ActionRow[];
  suno?: { meta: SunoTrackMeta; open: boolean };
  variant?: "desktop" | "mobile";
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sunoSourceId, setSunoSourceId] = useState<string | null>(null);
  const { toast } = useToast();

  // A finished task is still editable from here: this timeline is the only
  // place completed tasks appear, so ticking one by mistake has to be
  // undoable without a trip to the database. Both actions drop the row from
  // the log — restore sends it back to the open list, delete removes it.
  const [tasks, applyTaskAction] = useOptimistic<ActionRow[], string>(
    completedTasks,
    (state, removedId) => state.filter((t) => t.id !== removedId),
  );
  const [, startTaskTransition] = useTransition();

  const restoreTask = (task: ActionRow) => {
    startTaskTransition(async () => {
      applyTaskAction(task.id);
      try {
        await toggleTrackTodo(task.id, false, trackId);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const removeTask = (task: ActionRow) => {
    if (!confirm("Permanently delete this task from the log?")) return;
    startTaskTransition(async () => {
      applyTaskAction(task.id);
      try {
        await deleteTrackTodo(task.id, trackId);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const labelById = useMemo(
    () => new Map(versions.map((v) => [v.id, v.label])),
    [versions],
  );

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = [
      ...versions.map((v) => ({
        kind: "version" as const,
        at: new Date(v.created_at).getTime(),
        version: v,
      })),
      ...sessions.map((s) => ({
        kind: "session" as const,
        at: s.started_at ? new Date(s.started_at).getTime() : 0,
        session: s,
      })),
      ...tasks.map((t) => ({
        kind: "task" as const,
        at: t.completed_at ? new Date(t.completed_at).getTime() : 0,
        task: t,
      })),
    ];
    return all.sort((a, b) => b.at - a.at);
  }, [versions, sessions, tasks]);

  const visible = entries.filter((e) => {
    if (filter === "bounces") return e.kind === "version";
    if (filter === "sessions") return e.kind === "session";
    return true;
  });

  const totalSeconds = sessions.reduce((acc, s) => acc + sessionSeconds(s), 0);

  const upload = async () => {
    if (!file) return;
    const finalLabel = label.trim() || file.name.replace(/\.[^.]+$/, "");
    const ext = file.name.split(".").pop() ?? "bin";
    const key = `${trackId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.storage
        .from("track-audio")
        .upload(key, file, { contentType: file.type });
      if (error) throw error;

      const duration = await readAudioDuration(file);
      await addVersionRecord({
        trackId,
        label: finalLabel,
        storagePath: key,
        durationSeconds: duration,
      });
      setFile(null);
      setLabel("");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const requestVariations = (versionId: string) => {
    if (!suno) return;
    if (suno.open) {
      toast("Close the current Suno experiment first.");
      return;
    }
    setSunoSourceId(versionId);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 md:px-5 md:pt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Track log
          </h2>
          <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "rounded-md px-2.5 text-[11px] font-medium transition-colors",
                  variant === "mobile" ? "h-8" : "h-[22px]",
                  filter === f
                    ? "bg-surface font-semibold text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {versions.length} {versions.length === 1 ? "bounce" : "bounces"}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </span>
          {totalSeconds > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatDuration(totalSeconds)} logged
              </span>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing logged yet. Upload a bounce or run a focus session and it
            will show up here.
          </p>
        ) : (
          <ol className="relative flex flex-col gap-3 border-l border-border pl-5">
            {visible.map((entry) => (
              <li key={entryKey(entry)} className="relative">
                <span
                  aria-hidden
                  className={cn(
                    "absolute -left-[26px] top-2 h-[11px] w-[11px] rounded-full border-2 border-background",
                    entry.kind === "version" ? "bg-primary" : "bg-border",
                  )}
                />
                {entry.kind === "version" ? (
                  <VersionItem
                    version={entry.version}
                    trackId={trackId}
                    parentLabel={
                      (entry.version.parent_version_id &&
                        labelById.get(entry.version.parent_version_id)) ||
                      undefined
                    }
                    sunoAction={
                      suno && entry.version.source !== "suno" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => requestVariations(entry.version.id)}
                          aria-label="Get Suno variations"
                          title="Get Suno variations"
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      ) : undefined
                    }
                  />
                ) : entry.kind === "session" ? (
                  <SessionEntry session={entry.session} />
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground line-through">
                      {entry.task.description}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {entry.task.completed_at
                        ? format(new Date(entry.task.completed_at), "MMM d")
                        : ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "shrink-0",
                        variant === "mobile" ? "h-11 w-11" : "h-7 w-7",
                      )}
                      onClick={() => restoreTask(entry.task)}
                      aria-label={`Reopen "${entry.task.description}"`}
                      title="Reopen this task"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "shrink-0",
                        variant === "mobile" ? "h-11 w-11" : "h-7 w-7",
                      )}
                      onClick={() => removeTask(entry.task)}
                      aria-label={`Delete "${entry.task.description}"`}
                      title="Delete this task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 md:px-5">
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
            <Input
              type="text"
              placeholder="Label (e.g. v3_drop_test)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={variant === "mobile" ? "h-11 text-base" : undefined}
            />
            <Input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={variant === "mobile" ? "h-11 text-base" : undefined}
            />
          </div>
          <Button
            onClick={upload}
            disabled={!file || uploading}
            size={variant === "mobile" ? "lg" : "sm"}
            className="w-full"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload a bounce"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Up to 100MB · mp3, wav, flac, aac, ogg
          </p>
        </div>
      </div>

      {suno && (
        <SunoExperimentDialog
          // Remount per picked source so the default lands in dialog state.
          key={sunoSourceId ?? "none"}
          meta={suno.meta}
          versions={versions}
          defaultSourceVersionId={sunoSourceId ?? undefined}
          open={sunoSourceId !== null}
          onOpenChange={(open) => {
            if (!open) setSunoSourceId(null);
          }}
        />
      )}
    </div>
  );
}

function entryKey(entry: Entry): string {
  if (entry.kind === "version") return `v-${entry.version.id}`;
  if (entry.kind === "session") return `s-${entry.session.id}`;
  return `t-${entry.task.id}`;
}

function SessionEntry({ session }: { session: TrackSessionWithActivities }) {
  const hasDetail =
    session.activities.length > 0 ||
    !!session.notes_md ||
    session.progress_impact_rating != null ||
    session.enjoyment_rating != null;

  const summary = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-medium tabular-nums text-muted-foreground">
        {session.started_at
          ? format(new Date(session.started_at), "MMM d, yyyy · HH:mm")
          : "Unknown date"}
      </span>
      <span className="flex items-center gap-1 font-semibold tabular-nums">
        <AudioLines className="h-3.5 w-3.5 text-muted-foreground" />
        {formatDuration(sessionSeconds(session))}
      </span>
    </div>
  );

  if (!hasDetail) return <div className="py-1">{summary}</div>;

  return (
    <details className="group rounded-md border border-border bg-surface-2 px-3 py-2 [&_summary]:cursor-pointer [&_summary]:list-none">
      <summary>{summary}</summary>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {session.progress_impact_rating != null && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Impact {session.progress_impact_rating}/5
          </span>
        )}
        {session.enjoyment_rating != null && (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            Enjoyed {session.enjoyment_rating}/5
          </span>
        )}
      </div>

      {session.activities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {session.activities.map((a) => (
            <Badge key={a.id} variant="default">
              {ACTIVITY_LABELS.get(a.activity_key) ?? a.activity_key}
              {a.minutes > 0 && ` · ${a.minutes}m`}
            </Badge>
          ))}
        </div>
      )}

      {session.notes_md && (
        <div className="prose prose-sm mt-2 max-w-none text-xs text-muted-foreground [&_p]:my-0.5 [&_strong]:text-foreground">
          <ReactMarkdown>{session.notes_md}</ReactMarkdown>
        </div>
      )}

      {session.activities.some((a) => a.note) && (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          {session.activities
            .filter((a) => a.note)
            .map((a) => (
              <li key={`${a.id}-note`}>
                <span className="font-medium text-foreground">
                  {ACTIVITY_LABELS.get(a.activity_key) ?? a.activity_key}:
                </span>{" "}
                {a.note}
              </li>
            ))}
        </ul>
      )}
    </details>
  );
}
