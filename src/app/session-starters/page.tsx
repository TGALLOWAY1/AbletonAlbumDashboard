import { SessionStarterGallery } from "@/components/session-starters/gallery";
import { getSessionStarters } from "@/lib/data/session-starters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Session Starters · Finish Five" };

export default async function SessionStartersPage() {
  const { starters, available } = await getSessionStarters();
  return <SessionStarterGallery starters={starters} available={available} />;
}
