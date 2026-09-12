import Image from "next/image";
import { isOptimizableImageUrl } from "@/lib/image-hosts";
import type { StepNote } from "@/lib/step-notes";

/**
 * An image note, shown whole.
 *
 * Not `CoverArt` on purpose: that fills a fixed slot and crops to it, which
 * is right for artwork and wrong for a screenshot of text you need to read
 * every line of. This draws the image at its own aspect ratio, capped to the
 * column and to most of the viewport, and opens the original in a new tab
 * for zooming — on a phone, that is how a dense ChatGPT screenshot gets read.
 *
 * Still `next/image` where it can be: the stored width and height let it
 * reserve the box before the bytes arrive, and the bucket URL is on the
 * optimizer's allowlist, so a phone gets a resized WebP rather than the
 * 2048px original. A row without dimensions, or a URL the optimizer does not
 * know, degrades to a lazy `<img>` — the same box, unoptimized.
 */
export function StepNoteImage({ note }: { note: StepNote }) {
  if (!note.imageUrl) {
    return (
      <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
        Image unavailable.
      </p>
    );
  }
  const alt = note.title || "Note image";
  const frame = "h-auto max-h-[70vh] w-auto max-w-full rounded-md border border-border bg-surface-2";
  const optimizable =
    note.imageWidth != null &&
    note.imageHeight != null &&
    isOptimizableImageUrl(note.imageUrl);

  return (
    <a
      href={note.imageUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-block max-w-full"
      aria-label={`Open ${alt} full size`}
    >
      {optimizable ? (
        <Image
          src={note.imageUrl}
          alt={alt}
          width={note.imageWidth!}
          height={note.imageHeight!}
          // The notes column is 42rem wide at most; narrower than that it is
          // the viewport minus the gutters.
          sizes="(min-width: 768px) 42rem, 100vw"
          className={frame}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={note.imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={frame}
        />
      )}
    </a>
  );
}
