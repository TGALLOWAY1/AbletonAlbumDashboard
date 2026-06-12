"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";

const addSchema = z.object({
  trackId: z.string().uuid(),
  label: z.string().min(1).max(120),
  storagePath: z.string().min(1).max(400),
  durationSeconds: z.number().nullable().optional(),
});

export async function addVersionRecord(input: {
  trackId: string;
  label: string;
  storagePath: string;
  durationSeconds?: number | null;
}) {
  const parsed = addSchema.parse(input);
  const supabase = getServerSupabase();
  const { error } = await supabase.from("track_versions").insert({
    track_id: parsed.trackId,
    label: parsed.label,
    storage_path: parsed.storagePath,
    duration_seconds: parsed.durationSeconds ?? null,
  });
  if (error) throw error;
  revalidateTrackSurfaces(parsed.trackId);
}

export async function deleteVersion(versionId: string, trackId: string) {
  const supabase = getServerSupabase();
  const { data: version } = await supabase
    .from("track_versions")
    .select("storage_path")
    .eq("id", versionId)
    .maybeSingle();

  if (version?.storage_path) {
    await supabase.storage.from("track-audio").remove([version.storage_path]);
  }

  const { error } = await supabase
    .from("track_versions")
    .delete()
    .eq("id", versionId);
  if (error) throw error;
  revalidateTrackSurfaces(trackId);
}

export async function getSignedUrl(storagePath: string) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.storage
    .from("track-audio")
    .createSignedUrl(storagePath, 60 * 60); // 1 hour
  if (error) throw error;
  return data.signedUrl;
}
