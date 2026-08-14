// Pure prompt builder for the Suno round-trip. Deterministic and concise by
// design: 2–4 lines, each a sentence, blank inputs skipped. The composed
// string is persisted on suno_experiments.prompt at creation time; only the
// goal is stored structurally.

export type SunoPromptInput = {
  genre?: string | null; // track.tags[0]
  bpm?: number | null;
  songKey?: string | null;
  goal: string;
  preserve?: string | null;
  change?: string | null;
  avoid?: string | null;
};

function sentence(text: string): string {
  const trimmed = text.trim().replace(/[.\s]+$/, "");
  return trimmed.length > 0 ? `${trimmed}.` : "";
}

export function buildSunoPrompt(input: SunoPromptInput): string {
  const lines: string[] = [];

  const styleParts: string[] = [];
  const genre = input.genre?.trim();
  if (genre) styleParts.push(genre);
  if (input.bpm != null) styleParts.push(`${input.bpm} BPM`);
  const songKey = input.songKey?.trim();
  if (songKey) styleParts.push(`in ${songKey}`);
  if (styleParts.length > 0) lines.push(sentence(styleParts.join(", ")));

  lines.push(sentence(input.goal));

  const keepChangeParts: string[] = [];
  const preserve = input.preserve?.trim();
  if (preserve) keepChangeParts.push(sentence(`Preserve: ${preserve}`));
  const change = input.change?.trim();
  if (change) keepChangeParts.push(sentence(`Change: ${change}`));
  if (keepChangeParts.length > 0) lines.push(keepChangeParts.join(" "));

  const avoid = input.avoid?.trim();
  if (avoid) lines.push(sentence(`Avoid: ${avoid}`));

  return lines.filter((l) => l.length > 0).join("\n");
}
