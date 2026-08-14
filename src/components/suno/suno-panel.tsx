"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addSunoCandidate,
  closeExperiment,
  deleteExperiment,
  markExperimentSent,
} from "@/app/actions/suno-experiments";
import { getSignedUrl } from "@/app/actions/versions";
import { readAudioDuration } from "@/components/audio/read-audio-duration";
import { VersionItem } from "@/components/audio/version-item";
import {
  SunoExperimentDialog,
  type SunoTrackMeta,
} from "@/components/suno/suno-experiment-dialog";
import { SunoCandidateItem } from "@/components/suno/suno-candidate-item";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { MAX_CANDIDATES_PER_EXPERIMENT, type SunoExperimentStatus } from "@/lib/suno";
import { useToast } from "@/components/toast";
import type { SunoExperimentWithCandidates } from "@/lib/data/suno";
import type { VersionRow } from "@/lib/types";

const STATUS_LABELS: Record<SunoExperimentStatus, string> = {
  ready_to_send: "Ready to send",
  waiting_for_results: "Waiting on Suno",
  reviewing: "Reviewing",
  selected: "Keeper picked",
  integrated: "Integrated",
  discarded: "Discarded",
};

/**
 * The Suno round-trip surface for one track. Shared between /tracks/[id]
 * (variant "desktop") and /m/[trackId] (variant "mobile") — the variant
 * only affects sizing, never behavior.
 */
export function SunoPanel({
  meta,
  variant,
  experiment,
  versions,
}: {
  meta: SunoTrackMeta;
  variant: "desktop" | "mobile";
  experiment: SunoExperimentWithCandidates | null;
  versions: VersionRow[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const buttonSize = variant === "mobile" ? "md" : "sm";

  if (!experiment) {
    const hasSource = versions.some((v) => v.source !== "suno");
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <PanelHeading />
          <p className="text-sm text-muted-foreground">
            Bounce a version, send it to Suno with a clear goal, and review
            what comes back as Keep / Mine / Reject — useful results become
            Ableton tasks.
          </p>
          <div>
            <Button
              size={buttonSize}
              onClick={() => setCreateOpen(true)}
              disabled={!hasSource}
            >
              <Sparkles className="h-4 w-4" />
              Start Suno experiment
            </Button>
          </div>
          {!hasSource && (
            <p className="text-xs text-muted-foreground">
              Upload a bounce in Versions first — the experiment needs a source
              file to send.
            </p>
          )}
          <SunoExperimentDialog
            meta={meta}
            versions={versions}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <ExperimentView
      meta={meta}
      variant={variant}
      experiment={experiment}
    />
  );
}

function PanelHeading({ status }: { status?: SunoExperimentStatus }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Suno round-trip
      </h3>
      {status && <Badge variant="accent">{STATUS_LABELS[status]}</Badge>}
    </div>
  );
}

function ExperimentView({
  meta,
  variant,
  experiment,
}: {
  meta: SunoTrackMeta;
  variant: "desktop" | "mobile";
  experiment: SunoExperimentWithCandidates;
}) {
  const status = experiment.status as SunoExperimentStatus;
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [closeDialog, setCloseDialog] = useState<
    "integrated" | "discarded" | null
  >(null);
  const [outcomeNote, setOutcomeNote] = useState("");
  const [integrationTask, setIntegrationTask] = useState("");
  const { toast } = useToast();
  const buttonSize = variant === "mobile" ? "md" : "sm";

  const candidateCount = experiment.candidates.length;
  const hasKeeper = experiment.candidates.some((c) => c.decision === "keep");
  const canUpload =
    (status === "waiting_for_results" || status === "reviewing") &&
    candidateCount < MAX_CANDIDATES_PER_EXPERIMENT;

  const run = (fn: () => Promise<void>) => {
    start(async () => {
      try {
        await fn();
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(experiment.prompt ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy the prompt — copy it manually.");
    }
  };

  const downloadSource = () => {
    if (!experiment.sourceVersion) return;
    run(async () => {
      const url = await getSignedUrl(experiment.sourceVersion!.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    });
  };

  const uploadCandidates = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const key = `${meta.trackId}/suno/${experiment.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const supabase = getBrowserSupabase();
        const { error } = await supabase.storage
          .from("track-audio")
          .upload(key, file, { contentType: file.type });
        if (error) throw error;
        const duration = await readAudioDuration(file);
        await addSunoCandidate({
          experimentId: experiment.id,
          trackId: meta.trackId,
          label: file.name.replace(/\.[^.]+$/, ""),
          storagePath: key,
          durationSeconds: duration,
        });
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submitClose = () => {
    if (!closeDialog) return;
    run(async () => {
      await closeExperiment({
        experimentId: experiment.id,
        trackId: meta.trackId,
        outcome: closeDialog,
        outcomeNote: outcomeNote.trim() || undefined,
        integrationTaskDescription:
          closeDialog === "integrated"
            ? integrationTask.trim() || undefined
            : undefined,
      });
      setCloseDialog(null);
      setOutcomeNote("");
      setIntegrationTask("");
    });
  };

  const removeUnsent = () => {
    if (!confirm("Delete this experiment? Nothing has been sent yet.")) return;
    run(() => deleteExperiment(experiment.id, meta.trackId));
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <PanelHeading status={status} />

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Goal
          </span>
          <p className="text-sm font-medium">{experiment.goal}</p>
        </div>

        {status === "ready_to_send" && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Prompt
              </span>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-3 text-xs">
                {experiment.prompt}
              </pre>
            </div>
            {experiment.sourceVersion && (
              <p className="text-xs text-muted-foreground">
                Source: {experiment.sourceVersion.label}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size={buttonSize} variant="outline" onClick={copyPrompt}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy prompt"}
              </Button>
              <Button
                size={buttonSize}
                variant="outline"
                onClick={downloadSource}
                disabled={pending || !experiment.sourceVersion}
              >
                <Download className="h-4 w-4" />
                Download source
              </Button>
              <Button size={buttonSize} variant="outline" asChild>
                <a
                  href="https://suno.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Suno
                </a>
              </Button>
              <Button
                size={buttonSize}
                onClick={() =>
                  run(() => markExperimentSent(experiment.id, meta.trackId))
                }
                disabled={pending}
              >
                <Send className="h-4 w-4" />
                Mark as sent
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={removeUnsent}
                disabled={pending}
                aria-label="Delete experiment"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              In Suno: upload the source, paste the prompt, run Cover 2–4
              times, then come back with the downloads.
            </p>
          </>
        )}

        {canUpload && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor={`suno-upload-${experiment.id}`}
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                Drop Suno results here
              </Label>
              <span className="text-xs text-muted-foreground">
                {candidateCount} of {MAX_CANDIDATES_PER_EXPERIMENT}
              </span>
            </div>
            <input
              id={`suno-upload-${experiment.id}`}
              type="file"
              accept="audio/*"
              multiple
              disabled={uploading}
              onChange={(e) => {
                void uploadCandidates(e.target.files);
                e.target.value = "";
              }}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-surface-2/80"
            />
            {uploading && (
              <p className="text-xs text-muted-foreground">
                <Upload className="mr-1 inline h-3 w-3" />
                Uploading…
              </p>
            )}
          </div>
        )}

        {(status === "reviewing" || status === "selected") &&
          candidateCount >= MAX_CANDIDATES_PER_EXPERIMENT &&
          experiment.candidates.some((c) => c.decision === "unreviewed") && (
            <p className="text-xs text-warning">
              Candidate limit reached — review these before generating more.
            </p>
          )}

        {(status === "reviewing" || status === "selected") && (
          <div className="flex flex-col gap-2">
            {experiment.sourceVersion && (
              <>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Source (A/B against each candidate)
                </span>
                <VersionItem
                  version={experiment.sourceVersion}
                  trackId={meta.trackId}
                  showDelete={false}
                />
              </>
            )}
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Candidates
            </span>
            {experiment.candidates.map((c) => (
              <SunoCandidateItem
                key={c.id}
                candidate={c}
                trackId={meta.trackId}
                experimentStatus={status}
                hasKeeper={hasKeeper && c.decision !== "keep"}
              />
            ))}
          </div>
        )}

        {status !== "ready_to_send" && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {status === "selected" && (
              <Button
                size={buttonSize}
                onClick={() => setCloseDialog("integrated")}
                disabled={pending}
              >
                Mark integrated…
              </Button>
            )}
            <Button
              size={buttonSize}
              variant="ghost"
              onClick={() => setCloseDialog("discarded")}
              disabled={pending}
            >
              Discard experiment…
            </Button>
          </div>
        )}

        <Dialog
          open={closeDialog !== null}
          onOpenChange={(o) => !o && setCloseDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {closeDialog === "integrated"
                  ? "Mark experiment integrated"
                  : "Discard experiment"}
              </DialogTitle>
              <DialogDescription>
                {closeDialog === "integrated"
                  ? "The idea made it into Ableton. Rejected candidates' audio is cleaned up."
                  : "Nothing useful came back. Unreviewed candidates are rejected and their audio cleaned up."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="close-note">
                  {closeDialog === "integrated"
                    ? "What did you actually keep?"
                    : "Why did this fail? (optional)"}
                </Label>
                <Textarea
                  id="close-note"
                  value={outcomeNote}
                  onChange={(e) => setOutcomeNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={
                    closeDialog === "integrated"
                      ? "e.g. Recreated the answering phrase with my own Serum patch"
                      : "e.g. All candidates changed the arrangement too much — next time send a shorter section"
                  }
                />
              </div>
              {closeDialog === "integrated" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="close-task">
                    Remaining Ableton work (optional — becomes a task)
                  </Label>
                  <Textarea
                    id="close-task"
                    value={integrationTask}
                    onChange={(e) => setIntegrationTask(e.target.value)}
                    maxLength={300}
                    rows={2}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCloseDialog(null)}>
                Cancel
              </Button>
              <Button
                variant={closeDialog === "discarded" ? "danger" : "default"}
                onClick={submitClose}
                disabled={pending}
              >
                {pending
                  ? "Closing…"
                  : closeDialog === "integrated"
                    ? "Mark integrated"
                    : "Discard"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
