import { FocusRunner } from "@/components/focus-runner";
import { getAllTracks } from "@/lib/data/tracks";
import { getSessionTypes } from "@/lib/data/session-types";

export const dynamic = "force-dynamic";

export default async function NewFocusPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const [sessionTypes, tracks] = await Promise.all([
    getSessionTypes(),
    getAllTracks(),
  ]);

  const sessionType = sp.type
    ? (sessionTypes.find((t) => t.id === sp.type) ?? null)
    : null;

  return (
    <FocusRunner
      track={null}
      primaryAction={null}
      sessionType={sessionType}
      sessionTypes={sessionTypes}
      tracks={tracks}
    />
  );
}
