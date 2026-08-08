import Image from "next/image";

import { logo } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * Figma "Logo" block — a 402 x 100 band (24px top, 8px bottom) holding the centred
 * Advisory / PLATFORM lockup, whose ink measures 124px wide in the auth frames.
 */
export function BrandLockup({ className }: { readonly className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[100px] w-full shrink-0 flex-col items-center justify-center overflow-clip pt-6 pb-2 text-center",
        className,
      )}
    >
      <Image alt="Advisory Platform" className="h-[70px] w-auto" priority src={logo} />
    </div>
  );
}
