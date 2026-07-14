import { BackLink } from "@/components/back-link";
import { getAllSessionTypes } from "@/lib/data/session-types";
import { SessionTypesEditor } from "./session-types-editor";

export const dynamic = "force-dynamic";

export default async function SessionTypesPage() {
  const types = await getAllSessionTypes();
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <BackLink fallback="/settings" label="Back" className="-ml-2" />
          <h1 className="text-3xl font-semibold tracking-tight">
            Session types
          </h1>
          <p className="mt-1 text-muted-foreground">
            Categories that appear on the calendar.
          </p>
        </div>
      </header>
      <SessionTypesEditor initial={types} />
    </div>
  );
}
