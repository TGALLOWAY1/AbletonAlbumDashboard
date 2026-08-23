import { notFound } from "next/navigation";
import { FocusRunner } from "@/components/focus-runner";
import { getTrack, getOpenActionsForTrack } from "@/lib/data/tracks";
import { getSessionTypes } from "@/lib/data/session-types";
import { getAllTracks } from "@/lib/data/tracks";

export const dynamic = "force-dynamic";

export default async function FocusPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  const track = await getTrack(trackId);
  if (!track) notFound();

  const [sessionTypes, tracks, trackTodos] = await Promise.all([
    getSessionTypes(),
    getAllTracks(),
    getOpenActionsForTrack(trackId),
  ]);

  return (
    <FocusRunner
      track={track}
      sessionTypes={sessionTypes}
      tracks={tracks}
      trackTodos={trackTodos}
    />
  );
}
