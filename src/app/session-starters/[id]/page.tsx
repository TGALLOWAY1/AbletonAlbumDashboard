import { notFound } from "next/navigation";
import { SessionStarterDetail } from "@/components/session-starters/detail";
import { getSessionStarters } from "@/lib/data/session-starters";
import { listTrackOptions } from "@/lib/data/tracks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guided Session · Finish Five" };

export default async function SessionStarterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { starters, available } = await getSessionStarters();
  const starter = starters.find((item) => item.id === id);
  if (!starter) notFound();
  const tracks = available ? await listTrackOptions() : [];
  return <SessionStarterDetail key={starter.id} starter={starter} available={available} tracks={tracks} neighbors={starters.filter((s) => !s.archived).map(({ id, name }) => ({ id, name }))} />;
}
