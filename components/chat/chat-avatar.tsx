import Image, { type StaticImageData } from "next/image";

import sarah from "@/assets/avatars/sarah-jenskins.png";
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
  className,
}: {
  readonly src?: StaticImageData;
  readonly alt?: string;
  readonly size: number;
  readonly crop?: boolean;
  readonly className?: string;
}) {
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-full", className)}
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
}
