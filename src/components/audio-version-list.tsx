"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { addVersionRecord } from "@/app/actions/versions";
import { VersionItem } from "@/components/audio/version-item";
import { useToast } from "@/components/toast";
import type { VersionRow } from "@/lib/types";

export function AudioVersionList({
  trackId,
  versions,
}: {
  trackId: string;
  versions: VersionRow[];
}) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

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

      const duration = await readAudioDuration(file).catch(() => null);
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
                <VersionItem version={v} trackId={trackId} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}
