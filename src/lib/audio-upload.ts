/**
 * The `accept` string and content types for every audio upload in the app —
 * track bounces, Suno results, Library previews.
 *
 * iOS is why this is not just `"audio/*"`. Safari maps a bare `audio/*` onto a
 * narrow set of UTIs in the Files / iCloud Drive picker, so a `.wav` sitting in
 * iCloud renders **greyed out and unselectable** — which made the bounce
 * upload, and therefore the whole Suno round-trip, impossible to start from a
 * phone. Listing the extensions alongside the wildcard makes Safari match on
 * the filename instead, which it does reliably.
 *
 * The same picker is also unreliable about `File.type`: a file handed over by
 * iCloud can arrive with an empty type, or with a legacy alias like
 * `audio/x-wav` or `audio/x-m4a`. Supabase Storage validates the content type
 * against the bucket's `allowed_mime_types`, so passing `File.type` verbatim
 * turned an empty type into a rejected upload. `audioContentType` normalises
 * off the extension first, which is the part iOS gets right.
 *
 * `AUDIO_UPLOAD_MIME_TYPES` must stay a subset of the allowlists in
 * supabase/migrations/0029_audio_upload_mime_types.sql — asserted by
 * audio-upload.test.ts.
 */

import {
  MIGRATION_0029_MISSING_MESSAGE,
  isStorageMimeRejection,
  isStorageSizeRejection,
} from "@/lib/migration-errors";

/**
 * Extension → canonical content type. The keys are also what goes into the
 * picker's `accept`, so adding a format here offers it in the file browser and
 * gives it a content type in one step.
 */
export const AUDIO_MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  wav: "audio/wav",
  wave: "audio/wav",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  aifc: "audio/aiff",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  webm: "audio/webm",
};

/** Legacy and vendor spellings browsers still report, folded onto the canonical
 * type. Only consulted when the filename has no extension we recognise. */
const MIME_ALIASES: Readonly<Record<string, string>> = {
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/x-aiff": "audio/aiff",
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/mpeg3": "audio/mpeg",
  "audio/x-mpeg-3": "audio/mpeg",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/x-flac": "audio/flac",
  "audio/opus": "audio/ogg",
};

/** Used when neither the extension nor the browser's type says anything. The
 * bucket rejects it, which is the correct answer for a file that is not audio;
 * `audioUploadErrorMessage` turns that rejection into a readable sentence. */
export const FALLBACK_AUDIO_CONTENT_TYPE = "application/octet-stream";

/**
 * The picker filter: the wildcard for platforms that honour it, then every
 * extension for iOS. Order matters only cosmetically — Safari matches on any
 * entry.
 */
export const AUDIO_ACCEPT = [
  "audio/*",
  ...Object.keys(AUDIO_MIME_BY_EXTENSION).map((ext) => `.${ext}`),
].join(",");

/** Every content type an upload from this app can declare. */
export const AUDIO_UPLOAD_MIME_TYPES: readonly string[] = [
  ...new Set(Object.values(AUDIO_MIME_BY_EXTENSION)),
].sort();

/** Human-readable format list for upload hints — extensions, not MIME types. */
export const AUDIO_FORMAT_HINT = "wav, aiff, mp3, m4a, aac, flac, ogg";

function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

/**
 * The content type to upload a picked file under. Extension first (iOS gets
 * the filename right and the type wrong), the browser's own type second, and
 * a rejectable fallback last — never an empty string, which Storage refuses.
 */
export function audioContentType(file: { name: string; type?: string }): string {
  const ext = extensionOf(file.name);
  const byExtension = ext ? AUDIO_MIME_BY_EXTENSION[ext] : undefined;
  if (byExtension) return byExtension;

  const declared = (file.type ?? "").trim().toLowerCase().split(";")[0];
  if (!declared) return FALLBACK_AUDIO_CONTENT_TYPE;
  return MIME_ALIASES[declared] ?? declared;
}

/**
 * Turn a Storage upload failure into something actionable. Storage reports a
 * disallowed content type and an oversized object with messages written for an
 * API client, and the migration that widens the allowlist is applied
 * separately from the deploy (see src/lib/migration-errors.ts), so a rejected
 * AIFF has to say which file to run.
 */
export function audioUploadErrorMessage(
  error: unknown,
  contentType: string,
): string {
  if (isStorageMimeRejection(error)) {
    return AUDIO_UPLOAD_MIME_TYPES.includes(contentType)
      ? MIGRATION_0029_MISSING_MESSAGE
      : `That file isn't an audio format this app accepts (${AUDIO_FORMAT_HINT}).`;
  }
  if (isStorageSizeRejection(error)) {
    return "That file is larger than the bucket's size limit — bounce it as a smaller format, or trim it, and try again.";
  }
  return error instanceof Error ? error.message : "Couldn't upload that file.";
}
