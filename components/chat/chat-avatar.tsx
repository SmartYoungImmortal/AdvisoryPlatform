import Image, { type StaticImageData } from "next/image";

import { sarahJenskins as sarah } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * Figma "Skeleton / Placeholder Avatar" — a round box with the source photo scaled
 * and offset by the crop Figma reports, rather than a plain object-cover.
 */
export function ChatAvatar({
  src = sarah,
  alt = "",
  size,
  crop = true,
  presence,
  className,
}: {
  readonly src?: StaticImageData;
  readonly alt?: string;
  readonly size: number;
  readonly crop?: boolean;
  /**
   * The dot on the corner of the portrait. Decorative on purpose: the prototype
   * has no presence signal to be right about, and a coloured dot is never the
   * only carrier of anything a reader needs — see `StatusPill` for the states
   * that are.
   */
  readonly presence?: "online" | "away";
  readonly className?: string;
}) {
  const portrait = (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full",
        presence ? undefined : className,
      )}
      style={{ width: size, height: size }}
    >
      {crop ? (
        <Image
          alt={alt}
          className="absolute max-w-none"
          src={src}
          style={{
            width: "258.46%",
            height: "169.66%",
            left: "-90.77%",
            top: "-3.01%",
          }}
        />
      ) : (
        <Image alt={alt} className="absolute inset-0 size-full object-cover" src={src} />
      )}
    </span>
  );

  if (!presence) return portrait;

  // The dot has to sit *outside* the clipping box the crop needs, so the badge
  // is a second wrapper rather than another child of the portrait.
  return (
    <span className={cn("relative block shrink-0", className)}>
      {portrait}
      <span
        aria-hidden
        className={cn(
          "absolute end-0 bottom-0 rounded-full ring-2 ring-card",
          size >= 40 ? "size-3" : "size-2.5",
          presence === "online" ? "bg-success" : "bg-dimmed",
        )}
      />
    </span>
  );
}
