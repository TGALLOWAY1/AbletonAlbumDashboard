import { describe, expect, it } from "vitest";
import { buildSunoPrompt } from "@/lib/suno-prompt";

describe("buildSunoPrompt", () => {
  it("composes all four lines when everything is present", () => {
    const prompt = buildSunoPrompt({
      genre: "Modern bass music instrumental",
      bpm: 150,
      songKey: "F minor",
      goal: "Create a stronger second-drop variation while preserving the core identity",
      preserve: "halftime groove, main bass rhythm",
      change: "introduce a more melodic answering phrase",
      avoid: "vocals, guitars, new chord progression",
    });
    expect(prompt).toBe(
      [
        "Modern bass music instrumental, 150 BPM, in F minor.",
        "Create a stronger second-drop variation while preserving the core identity.",
        "Preserve: halftime groove, main bass rhythm. Change: introduce a more melodic answering phrase.",
        "Avoid: vocals, guitars, new chord progression.",
      ].join("\n"),
    );
  });

  it("is a single goal line when no metadata or intent is given", () => {
    expect(buildSunoPrompt({ goal: "A dark rolling techno groove" })).toBe(
      "A dark rolling techno groove.",
    );
  });

  it("does not double the period on a goal that already ends with one", () => {
    expect(buildSunoPrompt({ goal: "More contrast in the drop." })).toBe(
      "More contrast in the drop.",
    );
  });

  it("omits the style line when genre, bpm, and key are all absent", () => {
    const prompt = buildSunoPrompt({
      genre: null,
      bpm: null,
      songKey: "",
      goal: "Brighter hook",
    });
    expect(prompt).toBe("Brighter hook.");
  });

  it("joins partial metadata without gaps", () => {
    expect(
      buildSunoPrompt({ bpm: 124, songKey: "F minor", goal: "brighter" }),
    ).toBe("124 BPM, in F minor.\nbrighter.");
    expect(buildSunoPrompt({ genre: "House", goal: "brighter" })).toBe(
      "House.\nbrighter.",
    );
  });

  it("renders preserve-only and change-only halves", () => {
    expect(
      buildSunoPrompt({ goal: "Goal", preserve: "the groove" }),
    ).toContain("Preserve: the groove.");
    const changeOnly = buildSunoPrompt({ goal: "Goal", change: "the lead" });
    expect(changeOnly).toContain("Change: the lead.");
    expect(changeOnly).not.toContain("Preserve:");
  });

  it("renders the avoid line only when given", () => {
    expect(buildSunoPrompt({ goal: "Goal", avoid: "vocals" })).toContain(
      "Avoid: vocals.",
    );
    expect(buildSunoPrompt({ goal: "Goal" })).not.toContain("Avoid:");
  });

  it("is deterministic and free of blank lines", () => {
    const input = {
      genre: "DnB",
      bpm: 174,
      songKey: "A minor",
      goal: "More energy",
      avoid: "guitars",
    };
    const a = buildSunoPrompt(input);
    expect(buildSunoPrompt(input)).toBe(a);
    expect(a.split("\n").every((line) => line.trim().length > 0)).toBe(true);
    expect(a.endsWith("\n")).toBe(false);
  });
});
