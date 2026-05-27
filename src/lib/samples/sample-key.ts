const AUDIO_EXTENSIONS = [
  "wav",
  "mp3",
  "flac",
  "aif",
  "aiff",
  "ogg",
  "m4a",
] as const;

export function isAudioFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return (AUDIO_EXTENSIONS as readonly string[]).includes(
    name.slice(dot + 1).toLowerCase(),
  );
}

/** Deterministic id used as `sample_key` in Supabase and as a stable React key. */
export function buildSampleKey(sourceName: string, relPath: string): string {
  return `${sourceName}:${relPath}`;
}

/** Coarse sample type guess from the filename, for the list "Type" column. */
export function guessSampleType(name: string): string {
  const n = name.toLowerCase();
  if (/(kick|snare|clap|hat|hihat|tom|perc|crash|ride|cymbal|808)/.test(n))
    return "Drum";
  if (/(loop)/.test(n)) return "Loop";
  if (/(bass|sub)/.test(n)) return "Bass";
  if (/(vox|vocal|acapella)/.test(n)) return "Vocal";
  if (/(fx|riser|sweep|impact|noise|foley)/.test(n)) return "FX";
  if (/(chord|stab|pad)/.test(n)) return "Chord";
  if (/(lead|melody|arp|pluck|synth)/.test(n)) return "Melody";
  return "One Shot";
}
