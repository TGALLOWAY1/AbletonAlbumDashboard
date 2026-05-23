import {
  AudioWaveform,
  Blocks,
  Cloud,
  Download,
  Drum,
  Library as LibraryIcon,
  Mic2,
  Piano,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LibraryPageClient } from "@/components/library/library-page-client";
import { LibraryStatCard } from "@/components/library/library-stat-card";
import { LIBRARY_ITEMS } from "@/lib/data/library-items";
import { fetchInstruments } from "@/lib/data/instruments-db";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const instruments = await fetchInstruments();
  const items = [...LIBRARY_ITEMS, ...instruments];
  const total = items.length;
  const drum = items.filter((i) => i.type === "drum").length;
  const bass = items.filter((i) => i.type === "bass").length;
  const lead = items.filter((i) => i.type === "lead").length;
  const atmos = items.filter((i) => i.type === "atmos").length;
  const vocal = items.filter((i) => i.type === "vocal").length;
  const midi = items.filter(
    (i) => i.type === "midi" || i.category === "midi",
  ).length;
  const instrument = items.filter((i) => i.category === "instrument").length;

  const stats = [
    { label: "Total Items", value: total, icon: LibraryIcon, hint: "All items in your library" },
    { label: "Drum Loops", value: drum, icon: Drum },
    { label: "Basses", value: bass, icon: AudioWaveform },
    { label: "Leads", value: lead, icon: Sparkles },
    { label: "Atmospheres", value: atmos, icon: Cloud },
    { label: "Vocals", value: vocal, icon: Mic2 },
    { label: "MIDI Ideas", value: midi, icon: Piano },
    { label: "Instruments", value: instrument, icon: Blocks },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-muted-foreground">
            Your saved ideas, samples, loops and audio from past projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="h-4 w-4" />
            Import Audio
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Export Pack
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {stats.map((s) => (
          <LibraryStatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            hint={s.hint}
          />
        ))}
      </section>

      <LibraryPageClient items={items} />
    </div>
  );
}
