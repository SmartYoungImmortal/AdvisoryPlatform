import { BatteryFull, Signal, Wifi } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * iOS status bar mock from the Figma frames (402 x 48, 21px side padding,
 * 13px indicator glyphs with a 7px gap).
 */
export function StatusBar({ className }: { readonly className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-12 w-full shrink-0 items-center justify-between overflow-clip px-[21px]",
        className,
      )}
    >
      <span className="font-latin shrink-0 text-[16px] leading-[24px] font-semibold tracking-[0] text-foreground">
        9:41
      </span>
      <div className="flex shrink-0 items-center gap-[7px] overflow-clip text-foreground">
        <Signal className="size-[13px]" />
        <Wifi className="size-[13px]" />
        <BatteryFull className="size-[13px]" />
      </div>
    </div>
  );
}
