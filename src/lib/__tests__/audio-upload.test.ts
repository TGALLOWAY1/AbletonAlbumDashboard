import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_ACCEPT,
  AUDIO_MIME_BY_EXTENSION,
  AUDIO_UPLOAD_MIME_TYPES,
  FALLBACK_AUDIO_CONTENT_TYPE,
  audioContentType,
  audioUploadErrorMessage,
} from "@/lib/audio-upload";
import { MIGRATION_0029_MISSING_MESSAGE } from "@/lib/migration-errors";

const MIGRATION = readFileSync(
  path.resolve(
    __dirname,
    "../../../supabase/migrations/0029_audio_upload_mime_types.sql",
  ),
  "utf8",
);

describe("AUDIO_ACCEPT", () => {
  // The whole point: iOS greys a file out in the iCloud picker unless the
  // extension itself is listed, so `audio/*` alone made .wav unselectable.
  it("lists every extension, not just the wildcard", () => {
    expect(AUDIO_ACCEPT.split(",")[0]).toBe("audio/*");
    for (const ext of Object.keys(AUDIO_MIME_BY_EXTENSION)) {
      expect(AUDIO_ACCEPT.split(",")).toContain(`.${ext}`);
    }
  });

  it("covers the formats a bounce or a Suno download actually arrives as", () => {
    for (const ext of ["wav", "aiff", "mp3", "m4a", "flac"]) {
      expect(AUDIO_ACCEPT).toContain(`.${ext}`);
    }
  });
});

describe("audioContentType", () => {
  it("reads the extension when the browser reports no type at all", () => {
    // An iCloud file picked in mobile Safari — the case that broke uploads.
    expect(audioContentType({ name: "drop_v7.wav", type: "" })).toBe("audio/wav");
    expect(audioContentType({ name: "voice memo.m4a" })).toBe("audio/mp4");
  });

  it("is case-insensitive about the extension", () => {
    expect(audioContentType({ name: "BOUNCE.WAV", type: "" })).toBe("audio/wav");
    expect(audioContentType({ name: "Loop.AIFF", type: "" })).toBe("audio/aiff");
  });

  it("prefers the extension over a legacy type spelling", () => {
    expect(audioContentType({ name: "a.wav", type: "audio/x-wav" })).toBe(
      "audio/wav",
    );
    expect(audioContentType({ name: "a.m4a", type: "audio/x-m4a" })).toBe(
      "audio/mp4",
    );
  });

  it("canonicalises the browser's type when the name has no usable extension", () => {
    expect(audioContentType({ name: "recording", type: "audio/x-wav" })).toBe(
      "audio/wav",
    );
    expect(audioContentType({ name: "clip.", type: "audio/mp3" })).toBe(
      "audio/mpeg",
    );
  });

  it("passes an unrecognised audio type through unchanged", () => {
    expect(audioContentType({ name: "odd", type: "audio/amr" })).toBe("audio/amr");
  });

  it("never returns an empty string — Storage refuses one", () => {
    expect(audioContentType({ name: "mystery", type: "" })).toBe(
      FALLBACK_AUDIO_CONTENT_TYPE,
    );
    expect(audioContentType({ name: "mystery" })).not.toBe("");
  });

  it("strips a charset parameter", () => {
    expect(audioContentType({ name: "x", type: "audio/ogg; codecs=opus" })).toBe(
      "audio/ogg",
    );
  });
});

describe("audioUploadErrorMessage", () => {
  const mimeError = { message: "mime type audio/aiff is not supported" };

  it("names the migration when the format is one the app now sends", () => {
    expect(audioUploadErrorMessage(mimeError, "audio/aiff")).toBe(
      MIGRATION_0029_MISSING_MESSAGE,
    );
  });

  it("blames the file, not the database, for a genuine non-audio upload", () => {
    const message = audioUploadErrorMessage(
      mimeError,
      FALLBACK_AUDIO_CONTENT_TYPE,
    );
    expect(message).not.toBe(MIGRATION_0029_MISSING_MESSAGE);
    expect(message).toContain("wav");
  });

  it("explains a size rejection", () => {
    const message = audioUploadErrorMessage(
      { message: "The object exceeded the maximum allowed size" },
      "audio/wav",
    );
    expect(message).toContain("larger than");
  });

  it("passes anything else through", () => {
    expect(audioUploadErrorMessage(new Error("network down"), "audio/wav")).toBe(
      "network down",
    );
  });
});

describe("0029 migration ↔ src/lib sync", () => {
  const allowlist = [
    ...MIGRATION.matchAll(/'(audio\/[^']+)'/g),
  ].map((m) => m[1]);

  it("accepts every content type the app can declare", () => {
    for (const type of AUDIO_UPLOAD_MIME_TYPES) {
      expect(allowlist, `${type} allowed by the buckets`).toContain(type);
    }
  });

  it("keeps 0002's spellings so a pre-migration build keeps uploading", () => {
    // Deploys land before migrations, and the reverse window matters too: a
    // build still sending File.type verbatim must not start failing.
    for (const legacy of [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
      "audio/aac",
      "audio/ogg",
      "audio/webm",
    ]) {
      expect(allowlist).toContain(legacy);
    }
  });

  it("widens both audio buckets", () => {
    expect(MIGRATION).toContain("'track-audio'");
    expect(MIGRATION).toContain("'library-previews'");
  });
});
