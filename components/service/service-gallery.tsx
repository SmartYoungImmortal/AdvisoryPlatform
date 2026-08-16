"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The cover, as a 16:9 gallery instead of a single crop.
 *
 * The Figma frame draws a "1/6" counter over a still, which is a promise the
 * screen could not keep — there was one photo and no way to reach the others.
 * This is that counter made true: a scroll-snap track, one page per photo, with
 * the index read off the scroll position rather than kept in a second state that
 * can drift from what is on screen.
 *
 * 16:9 rather than the frame's fixed 240px — the reference marketplaces all
 * publish covers at that ratio, so a fixed height would crop every one of them.
 */
export function ServiceGallery({
  photos,
}: {
  readonly photos: readonly StaticImageData[];
}) {
  const t = useTranslations("service");
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  return (
    <div className="relative w-full shrink-0">
      <div
        className="flex w-full snap-x snap-mandatory overflow-x-auto"
        onScroll={() => {
          const track = trackRef.current;
          if (!track) return;
          setIndex(Math.round(track.scrollLeft / track.clientWidth));
        }}
        ref={trackRef}
      >
        {photos.map((photo, i) => (
          <Image
            alt=""
            className="aspect-video w-full shrink-0 snap-center object-cover"
            key={photo.src}
            priority={i === 0}
            src={photo}
          />
        ))}
      </div>

      {photos.length > 1 ? (
        <span className="absolute right-4 bottom-3 flex items-start rounded-full bg-scrim/55 px-2.5 py-1 text-xs font-normal whitespace-nowrap text-on-media">
          {t("photoCounter", { current: index + 1, total: photos.length })}
        </span>
      ) : null}
    </div>
  );
}
