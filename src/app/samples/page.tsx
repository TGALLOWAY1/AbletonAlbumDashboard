import { SamplesWorkspace } from "@/components/samples/samples-workspace";
import { getSampleStatuses } from "@/lib/data/samples";

export const dynamic = "force-dynamic";

export default async function SamplesPage() {
  const initialStatuses = await getSampleStatuses();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Samples</h1>
        <p className="mt-1 text-muted-foreground">
          Browse, audition, and curate samples from your filesystem into a
          Favorites library — originals are never moved or renamed.
        </p>
      </header>

      <SamplesWorkspace initialStatuses={initialStatuses} />
    </div>
  );
}
