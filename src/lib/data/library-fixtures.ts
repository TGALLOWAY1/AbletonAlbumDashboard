/**
 * Development fixtures for the Library.
 *
 * These exist so the browse / audition / collection flows can be exercised in a
 * real browser without a database, and so screenshots show a populated shelf.
 * They are NEVER written to Supabase and are only reachable when
 * `LIBRARY_FIXTURES=1` is set outside production — see `library-source.ts`,
 * which pulls this module in with a dynamic import so it stays out of the
 * production bundle.
 *
 * Two omissions are deliberate: one preset has no preview at all, and one loop
 * stack points at a URL that will 404. They exercise the "no preview" and
 * "broken preview" paths that are otherwise hard to reach.
 */
import type { LibraryCollection, LoopStack, Preset } from "@/lib/data/library";
import type { LibrarySnapshot } from "@/lib/data/library-db";

/**
 * A mono sine as a base64 WAV data URI — a genuinely decodable file, so
 * play/pause/ended/timeupdate all behave as they would with a real preview.
 *
 * 4 kHz and 8-bit keep each clip around 20 KB while staying long enough to
 * actually audition; anything shorter finishes before you can hear it.
 */
function tone(frequency: number, seconds = 5): string {
  const rate = 4000;
  const samples = Math.floor(rate * seconds);
  const bytes = new Uint8Array(44 + samples);

  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true); // 8-bit
  ascii(36, "data");
  view.setUint32(40, samples, true);

  for (let i = 0; i < samples; i++) {
    // Fade in and out so the clip doesn't click at the boundaries.
    const envelope = Math.min(1, Math.min(i, samples - i) / (rate * 0.02));
    const value = Math.sin((2 * Math.PI * frequency * i) / rate) * envelope;
    bytes[44 + i] = Math.round(128 + value * 100);
  }

  return `data:audio/wav;base64,${Buffer.from(bytes).toString("base64")}`;
}

const NOW = "2026-08-01T12:00:00.000Z";

function stamp(index: number) {
  // Descending created_at so the default "recent" sort has something to do.
  const day = String(28 - index).padStart(2, "0");
  return { createdAt: `2026-07-${day}T09:00:00.000Z`, updatedAt: NOW };
}

export function libraryFixtures(): LibrarySnapshot {
  const loopStacks: LoopStack[] = [
    {
      id: "fx-stack-neon-glide",
      name: "Neon Glide",
      previewUrl: tone(220),
      previewPath: "fixtures/neon-glide.wav",
      key: "C minor",
      bpm: 95,
      bars: 8,
      sourceProject: "Midnight EP",
      sourcePath:
        "~/Music/Ableton/Midnight EP/Midnight EP Project/Midnight.als",
      favorite: true,
      notes: "The pre-drop lift. Works under almost anything in C minor.",
      components: [
        { kind: "track", name: "Sub Bass" },
        { kind: "track", name: "Glide Lead" },
        { kind: "device", name: "Glue Compressor" },
      ],
      ...stamp(0),
    },
    {
      id: "fx-stack-late-night",
      name: "Late Night",
      previewUrl: tone(174),
      previewPath: "fixtures/late-night.wav",
      key: "F# minor",
      bpm: 88,
      bars: 16,
      sourceProject: "Basement Tapes",
      favorite: false,
      notes: "",
      components: [],
      ...stamp(1),
    },
    {
      id: "fx-stack-velvet-motion",
      name: "Velvet Motion",
      previewUrl: tone(293),
      previewPath: "fixtures/velvet-motion.wav",
      key: "A major",
      bpm: 120,
      bars: 4,
      sourceProject: "Midnight EP",
      favorite: false,
      notes: "",
      components: [],
      ...stamp(2),
    },
    {
      id: "fx-stack-ghost-town",
      name: "Ghost Town",
      // Deliberately broken: exercises the player's re-sign-then-fail path.
      previewUrl: "https://example.invalid/missing-preview.wav",
      previewPath: "fixtures/ghost-town.wav",
      key: "D minor",
      bpm: 140,
      bars: 8,
      favorite: false,
      notes: "",
      components: [],
      ...stamp(3),
    },
    {
      id: "fx-stack-paper-lanterns",
      name: "Paper Lanterns And Other Very Long Names",
      previewUrl: tone(330),
      previewPath: "fixtures/paper-lanterns.wav",
      key: "G major",
      bpm: 102,
      bars: 32,
      favorite: false,
      notes: "",
      components: [],
      ...stamp(4),
    },
  ];

  const presets: Preset[] = [
    {
      id: "fx-preset-grit-sub",
      name: "Grit Sub 02",
      plugin: "Serum 2",
      category: "Bass",
      previewUrl: tone(55),
      previewPath: "fixtures/grit-sub.wav",
      presetPath: "~/Music/Ableton/User Library/Presets/Grit Sub 02.adv",
      sourceProject: "Midnight EP",
      favorite: true,
      core: true,
      notes: "Roll off above 200Hz before layering.",
      ...stamp(0),
    },
    {
      id: "fx-preset-liquid-growl",
      name: "Liquid Growl",
      plugin: "Phase Plant",
      category: "Bass",
      previewUrl: tone(82),
      previewPath: "fixtures/liquid-growl.wav",
      favorite: false,
      core: false,
      notes: "",
      ...stamp(1),
    },
    {
      id: "fx-preset-glass-chords",
      name: "Glass Chords",
      plugin: "Serum 2",
      category: "Chords",
      previewUrl: tone(392),
      previewPath: "fixtures/glass-chords.wav",
      favorite: false,
      core: false,
      notes: "",
      ...stamp(2),
    },
    {
      id: "fx-preset-echo-pad",
      name: "Echo Pad",
      plugin: "Ableton",
      category: "Pad",
      previewUrl: tone(261),
      previewPath: "fixtures/echo-pad.wav",
      favorite: false,
      core: true,
      notes: "",
      ...stamp(3),
    },
    {
      id: "fx-preset-paper-keys",
      name: "Paper Keys",
      plugin: "Ableton",
      category: "Keys",
      previewUrl: tone(523),
      previewPath: "fixtures/paper-keys.wav",
      favorite: false,
      core: false,
      notes: "",
      ...stamp(4),
    },
    {
      id: "fx-preset-siren-lead",
      name: "Siren Lead",
      plugin: "Massive X",
      category: "Lead",
      previewUrl: tone(659),
      previewPath: "fixtures/siren-lead.wav",
      favorite: false,
      core: false,
      notes: "",
      ...stamp(5),
    },
    {
      id: "fx-preset-tape-hiss",
      name: "Tape Hiss",
      plugin: "Ableton",
      category: "Texture",
      // No preview at all: exercises the disabled play control.
      favorite: false,
      core: false,
      notes: "Layer under intros at -24dB.",
      ...stamp(6),
    },
    {
      id: "fx-preset-riser-fx",
      name: "Uplift Riser",
      plugin: "Serum 2",
      category: "FX",
      previewUrl: tone(440),
      previewPath: "fixtures/uplift-riser.wav",
      favorite: false,
      core: false,
      notes: "",
      ...stamp(7),
    },
    {
      id: "fx-preset-break-kit",
      name: "Break Kit A",
      plugin: "Drum Rack",
      category: "Drums",
      previewUrl: tone(110),
      previewPath: "fixtures/break-kit.wav",
      favorite: false,
      core: false,
      notes: "",
      ...stamp(8),
    },
  ];

  const collections: LibraryCollection[] = [
    {
      id: "fx-collection-heavy-bass",
      name: "Heavy Bass",
      description: "Everything that moves air.",
      items: [
        {
          itemId: "fx-item-1",
          type: "preset",
          id: "fx-preset-grit-sub",
          position: 0,
        },
        {
          itemId: "fx-item-2",
          type: "preset",
          id: "fx-preset-liquid-growl",
          position: 1,
        },
        {
          itemId: "fx-item-3",
          type: "loopStack",
          id: "fx-stack-ghost-town",
          position: 2,
        },
      ],
      position: 0,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "fx-collection-feel-good",
      name: "Feel Good",
      description: "Bright, major, hopeful.",
      items: [
        {
          itemId: "fx-item-4",
          type: "loopStack",
          id: "fx-stack-velvet-motion",
          position: 0,
        },
        {
          itemId: "fx-item-5",
          type: "preset",
          id: "fx-preset-paper-keys",
          position: 1,
        },
        {
          itemId: "fx-item-6",
          type: "preset",
          id: "fx-preset-glass-chords",
          position: 2,
        },
      ],
      position: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "fx-collection-ambient",
      name: "Ambient Textures",
      description: "Beds and atmospheres.",
      items: [
        {
          itemId: "fx-item-7",
          type: "preset",
          id: "fx-preset-echo-pad",
          position: 0,
        },
        {
          itemId: "fx-item-8",
          type: "preset",
          id: "fx-preset-tape-hiss",
          position: 1,
        },
      ],
      position: 2,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "fx-collection-transitions",
      name: "Transitions",
      items: [
        {
          itemId: "fx-item-9",
          type: "preset",
          id: "fx-preset-riser-fx",
          position: 0,
        },
      ],
      position: 3,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  return { loopStacks, presets, collections };
}
