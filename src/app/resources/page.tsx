import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ResourcesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Resources</h1>
        <p className="mt-1 text-muted-foreground">
          Reference tracks, sample packs, presets, and reading.
        </p>
      </header>
      <ComingSoon
        icon={BookOpen}
        title="Curated reference library"
        description="A single place to drop reference tracks, technique notes, and sample/preset links you keep coming back to."
      />
    </div>
  );
}
