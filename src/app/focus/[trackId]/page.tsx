import { notFound } from "next/navigation";
import { FocusRunner } from "@/components/focus-runner";
import { getTrack, getOpenActionsForTrack } from "@/lib/data/tracks";
import { getSessionTypes } from "@/lib/data/session-types";
import { getAllTracks } from "@/lib/data/tracks";

export const dynamic = "force-dynamic";

export default async function FocusPage({
  params,
  searchParams,
}: {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { trackId } = await params;
  const sp = await searchParams;
  const track = await getTrack(trackId);
  if (!track) notFound();

  const [sessionTypes, tracks, trackTodos] = await Promise.all([
    getSessionTypes(),
    getAllTracks(),
    getOpenActionsForTrack(trackId),
  ]);

  // Carries the in-place session type picker's choice across a track switch
  // made before Start — see `FocusRunner`'s `handleTrackChange`. Once a
  // session is running the choice lives in the provider instead and this is
  // unused.
  const sessionType = sp.type
    ? (sessionTypes.find((t) => t.id === sp.type) ?? null)
    : null;

  return (
    <FocusRunner
      track={track}
      sessionType={sessionType}
      sessionTypes={sessionTypes}
      tracks={tracks}
      trackTodos={trackTodos}
    />
  );
}
