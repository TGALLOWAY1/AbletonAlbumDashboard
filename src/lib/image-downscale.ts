/**
 * Client-side downscaling for uploaded artwork.
 *
 * A cover is never drawn larger than a ~640px gallery tile, but a phone photo
 * or an AI-generated square arrives at 2000-4000px and several megabytes. The
 * request-time optimizer resizes those on the way out, and re-encoding here
 * shrinks what has to be stored, re-fetched on a cache miss, and pushed
 * through the optimizer in the first place.
 *
 * The re-encode is best-effort: anything that can't be decoded, drawn, or
 * encoded smaller falls through to the original file, so a failure here can
 * never cost the user their upload.
 */

/** Long edge, in pixels, an uploaded cover is capped at. */
export const COVER_MAX_EDGE = 1600;

/** WebP quality for the re-encode — visually lossless at cover sizes. */
export const COVER_QUALITY = 0.82;

/**
 * Formats that survive a canvas round-trip. GIF loses its animation and SVG
 * loses its resolution independence, so both pass through untouched.
 */
const RESIZABLE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export function isResizableImageType(type: string): boolean {
  return RESIZABLE_TYPES.has(type.toLowerCase());
}

/** Fit `width` x `height` inside a `maxEdge` box, preserving aspect ratio. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    // Never round a dimension down to zero on an extreme aspect ratio.
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type PreparedUpload = {
  body: Blob;
  contentType: string;
  /** Extension for the storage key, matching `contentType`. */
  extension: string;
};

function passThrough(file: File): PreparedUpload {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  const extension =
    fromName && /^[a-z0-9]+$/.test(fromName) ? fromName : "bin";
  // The browser's own type, verbatim — an empty one lets storage sniff it,
   // which is the right answer for the non-image files that land here too.
  return { body: file, contentType: file.type, extension };
}

async function encodeWebp(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob | null> {
  // OffscreenCanvas keeps the work off the DOM where it exists; older Safari
  // still needs a detached <canvas>.
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/webp", quality: COVER_QUALITY });
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", COVER_QUALITY);
  });
}

/**
 * Re-encode `file` as a WebP no larger than `maxEdge` on its long side.
 * Returns the original whenever that isn't possible or isn't a win.
 */
export async function prepareImageUpload(
  file: File,
  maxEdge: number = COVER_MAX_EDGE,
): Promise<PreparedUpload> {
  if (!isResizableImageType(file.type)) return passThrough(file);
  if (typeof createImageBitmap !== "function") return passThrough(file);

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const blob = await encodeWebp(bitmap, width, height);
    // A already-small WebP can re-encode larger than it started; keeping the
    // original is then strictly better.
    if (!blob || blob.size >= file.size) return passThrough(file);
    return { body: blob, contentType: "image/webp", extension: "webp" };
  } catch {
    return passThrough(file);
  } finally {
    bitmap?.close();
  }
}
