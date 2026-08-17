import { describe, expect, it } from "vitest";
import {
  PRESET_CATEGORIES,
  PRESET_CATEGORY_LABELS,
  isPresetCategory,
  loopStackSubtitle,
  presetSubtitle,
  toPlayablePreset,
  toPresetCategory,
  type Preset,
} from "@/lib/data/library";

describe("loopStackSubtitle", () => {
  it("joins key, BPM and bars", () => {
    expect(loopStackSubtitle({ key: "C minor", bpm: 95, bars: 8 })).toBe(
      "C minor · 95 BPM · 8 bars",
    );
  });

  it("omits missing parts without leaving stray separators", () => {
    expect(loopStackSubtitle({ bpm: 140 })).toBe("140 BPM");
    expect(loopStackSubtitle({ key: "F# major" })).toBe("F# major");
    expect(loopStackSubtitle({ key: "A minor", bars: 4 })).toBe("A minor · 4 bars");
    expect(loopStackSubtitle({})).toBe("");
  });

  it("keeps a zero BPM out of the label but shows a real one", () => {
    // 0 is not a meaningful tempo, but it is also not `null` — make sure the
    // nullish check doesn't accidentally swallow a legitimate value.
    expect(loopStackSubtitle({ bpm: 0 })).toBe("0 BPM");
    expect(loopStackSubtitle({ bars: 0 })).toBe("0 bars");
  });

  it("ignores whitespace-only keys", () => {
    expect(loopStackSubtitle({ key: "   ", bpm: 90 })).toBe("90 BPM");
  });
});

describe("presetSubtitle", () => {
  it("joins plugin and category", () => {
    expect(presetSubtitle({ plugin: "Serum 2", category: "Bass" })).toBe(
      "Serum 2 · Bass",
    );
  });

  it("falls back to the category alone when there is no plugin", () => {
    expect(presetSubtitle({ category: "Pad" })).toBe("Pad");
  });
});

describe("preset categories", () => {
  it("labels every category, pluralising Pad", () => {
    for (const category of PRESET_CATEGORIES) {
      expect(PRESET_CATEGORY_LABELS[category]).toBeTruthy();
    }
    expect(PRESET_CATEGORY_LABELS.Pad).toBe("Pads");
  });

  it("rejects the legacy Library vocabulary", () => {
    expect(isPresetCategory("drums")).toBe(false);
    expect(isPresetCategory("instruments_presets")).toBe(false);
    expect(isPresetCategory("fx_racks")).toBe(false);
    expect(isPresetCategory("Drums")).toBe(true);
  });

  it("coerces unknown or missing values to Other rather than throwing", () => {
    expect(toPresetCategory("Bass")).toBe("Bass");
    expect(toPresetCategory("nonsense")).toBe("Other");
    expect(toPresetCategory(null)).toBe("Other");
    expect(toPresetCategory(undefined)).toBe("Other");
  });
});

describe("toPlayablePreset", () => {
  const preset: Preset = {
    id: "p1",
    name: "Grit Sub 02",
    plugin: "Serum 2",
    category: "Bass",
    previewUrl: "https://example.test/p1.wav",
    previewPath: "presets/p1.wav",
    favorite: false,
    core: true,
    notes: "",
    createdAt: "",
    updatedAt: "",
  };

  it("carries everything the mini-player needs to label and play", () => {
    expect(toPlayablePreset(preset)).toEqual({
      id: "p1",
      kind: "preset",
      name: "Grit Sub 02",
      subtitle: "Serum 2 · Bass",
      artworkUrl: undefined,
      previewUrl: "https://example.test/p1.wav",
      previewPath: "presets/p1.wav",
    });
  });

  it("leaves previewUrl undefined for an asset with no preview", () => {
    const silent = { ...preset, previewUrl: undefined, previewPath: undefined };
    expect(toPlayablePreset(silent).previewUrl).toBeUndefined();
  });
});
