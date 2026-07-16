import {
  Blocks,
  Drum,
  Library as LibraryIcon,
  Sparkles,
} from "lucide-react";
import { LibraryPageClient } from "@/components/library/library-page-client";
import { LibraryStatCard } from "@/components/library/library-stat-card";
import { fetchLibraryItems } from "@/lib/data/instruments-db";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const items = await fetchLibraryItems();
  const total = items.length;
  const drum = items.filter((i) => i.category === "drums").length;
  const instrument = items.filter((i) => i.category === "instruments_presets").length;
  const fx = items.filter((i) => i.category === "fx_racks").length;

  const stats = [
    { label: "Total Items", value: total, icon: LibraryIcon, hint: "All items in your library" },
    { label: "Drums", value: drum, icon: Drum },
    { label: "Instruments & Presets", value: instrument, icon: Blocks },
    { label: "FX Racks", value: fx, icon: Sparkles },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        <p className="mt-1 text-muted-foreground">
          Your saved ideas, presets, and audio from past projects.
        </p>
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
