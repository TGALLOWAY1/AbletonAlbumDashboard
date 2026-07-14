import { BackLink } from "@/components/back-link";
import { getSessionTypes } from "@/lib/data/session-types";
import { getSessionTemplates } from "@/lib/data/session-templates";
import { SessionTemplatesEditor } from "./session-templates-editor";

export const dynamic = "force-dynamic";

export default async function SessionTemplatesPage() {
  const [types, templates] = await Promise.all([
    getSessionTypes(),
    getSessionTemplates(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <BackLink fallback="/settings" label="Back" className="-ml-2" />
        <h1 className="text-3xl font-semibold tracking-tight">
          Session templates
        </h1>
        <p className="mt-1 text-muted-foreground">
          Reusable session shapes — drop them onto the calendar in one click.
        </p>
      </header>
      <SessionTemplatesEditor
        templates={templates}
        sessionTypes={types}
      />
    </div>
  );
}
