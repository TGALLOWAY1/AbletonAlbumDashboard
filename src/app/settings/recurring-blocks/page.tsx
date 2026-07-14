import { BackLink } from "@/components/back-link";
import { getSessionTypes } from "@/lib/data/session-types";
import { getSessionTemplates } from "@/lib/data/session-templates";
import { getSessionRecurrences } from "@/lib/data/session-recurrences";
import { getAllTracks } from "@/lib/data/tracks";
import { RecurringBlocksEditor } from "./recurring-blocks-editor";

export const dynamic = "force-dynamic";

export default async function RecurringBlocksPage() {
  const [types, templates, recurrences, tracks] = await Promise.all([
    getSessionTypes(),
    getSessionTemplates(),
    getSessionRecurrences(),
    getAllTracks(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <BackLink fallback="/settings" label="Back" className="-ml-2" />
        <h1 className="text-3xl font-semibold tracking-tight">
          Recurring blocks
        </h1>
        <p className="mt-1 text-muted-foreground">
          Auto-populate the calendar each week — set it once, skip individual
          instances on the calendar.
        </p>
      </header>
      <RecurringBlocksEditor
        recurrences={recurrences}
        sessionTypes={types}
        templates={templates}
        tracks={tracks}
      />
    </div>
  );
}
