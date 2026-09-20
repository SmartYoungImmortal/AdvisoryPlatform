import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The stand-in photography this page is set with.
 *
 * There is no shoot for an advisory marketplace, and the R2 bucket
 * (`lib/assets/r2.ts`) holds only the design's own assets, so the bands that
 * need a photograph borrow one from picsum. The seed is what makes that
 * tolerable: `picsum.photos/seed/<seed>/<w>/<h>` is deterministic, so the same
 * band gets the same frame on every load, in every environment, forever. A
 * random `picsum.photos/800/600` would reshuffle the whole page on each request
 * and no two screenshots would agree.
 *
 * Seeds are named after what the band is about rather than after the picture
 * that comes back, because nobody can choose the picture. They are placeholders
 * and they are meant to be replaced one for one by a real shot at the same
 * dimensions.
 *
 * `picsum.photos` is listed in `images.remotePatterns` (`next.config.ts`);
 * `next/image` refuses an unlisted host. `images.unoptimized` is already true,
 * so the URL below is what ends up in the `src` attribute untouched.
 *
 * Width and height are required, not optional: they are the intrinsic size of
 * the frame picsum returns, which is what lets the browser hold the box before
 * the bytes arrive. Every call site states them, so nothing on this page reflows
 * as it loads.
 */
export function AboutPhoto({
  seed,
  width,
  height,
  alt,
  className,
  priority = false,
}: {
  /** Describes the band, e.g. `advisory-consultation-desk`. */
  readonly seed: string;
  readonly width: number;
  readonly height: number;
  /** What the picture says. Never a restatement of the heading beside it. */
  readonly alt: string;
  readonly className?: string;
  /** The hero only: it is the largest paint on the page. */
  readonly priority?: boolean;
}) {
  return (
    <Image
      alt={alt}
      className={cn("object-cover", className)}
      height={height}
      priority={priority}
      src={`https://picsum.photos/seed/${seed}/${width}/${height}`}
      width={width}
    />
  );
}
