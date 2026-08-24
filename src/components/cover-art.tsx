import Image from "next/image";
import { isOptimizableImageUrl } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";

/**
 * Every cover, thumbnail and piece of artwork in the app draws through this.
 *
 * Uploaded covers are full-resolution originals — a few megabytes each — and
 * most of the places they appear are 32-96px slots. A raw `<img>` makes the
 * browser fetch the whole original for every one of them, eagerly, on every
 * page that lists tracks. `next/image` instead serves a WebP resized to the
 * slot, lazily, cached at the edge.
 *
 * `sizes` is required rather than defaulted: it is the entire mechanism. Get
 * it wrong and the browser happily downloads a 640px tile for a 32px row, at
 * which point this component is doing nothing an `<img>` wasn't.
 *
 * `fill` means the caller's element is the frame, so it must establish a
 * containing block (`relative`) and its own dimensions.
 */
export function CoverArt({
  src,
  alt = "",
  sizes,
  className,
  priority = false,
  onError,
}: {
  src: string;
  /** Covers are decorative beside a visible title; default to empty alt. */
  alt?: string;
  /** CSS `sizes` describing the slot this artwork lands in. */
  sizes: string;
  className?: string;
  /** Skips lazy-loading. Only for artwork above the fold on its own page. */
  priority?: boolean;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}) {
  // `cover_image_url` is a free-text URL column, so a value can point
  // anywhere. `next/image` throws on an unconfigured host, which would take
  // out the whole page, so an unknown host degrades to a lazy <img> instead.
  if (!isOptimizableImageUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={onError}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={onError}
      className={cn("object-cover", className)}
    />
  );
}
