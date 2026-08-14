"use client";

import { useMemo, useState } from "react";
import { Sparkles, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { addVersionRecord } from "@/app/actions/versions";
import { readAudioDuration } from "@/components/audio/read-audio-duration";
import { VersionItem } from "@/components/audio/version-item";
import {
  SunoExperimentDialog,
  type SunoTrackMeta,
} from "@/components/suno/suno-experiment-dialog";
import { useToast } from "@/components/toast";
import type { VersionRow } from "@/lib/types";

export function AudioVersionList({
  trackId,
  versions,
  suno,
}: {
  trackId: string;
  versions: VersionRow[];
  /** Enables the per-version "Get Suno variations" affordance. `open` means
   * the track already has an open experiment (one per track). */
  suno?: { meta: SunoTrackMeta; open: boolean };
}) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sunoSourceId, setSunoSourceId] = useState<string | null>(null);
  const { toast } = useToast();

  const labelById = useMemo(
    () => new Map(versions.map((v) => [v.id, v.label])),
    [versions],
  );

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
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Versions
          </h3>
          <span className="text-xs text-muted-foreground">
            {versions.length} {versions.length === 1 ? "version" : "versions"}
          </span>
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <Input
              type="text"
              placeholder="Label (e.g. v3_drop_test)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              onClick={upload}
              disabled={!file || uploading}
              size="sm"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Up to 100MB · mp3, wav, flac, aac, ogg
          </p>
        </div>

        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No versions yet. Upload a bounce above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {versions.map((v) => (
              <li key={v.id}>
                <VersionItem
                  version={v}
                  trackId={trackId}
                  parentLabel={
                    (v.parent_version_id &&
                      labelById.get(v.parent_version_id)) ||
                    undefined
                  }
                  sunoAction={
                    suno && v.source !== "suno" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => requestVariations(v.id)}
                        aria-label="Get Suno variations"
                        title="Get Suno variations"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}

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
      </CardContent>
    </Card>
  );
}
