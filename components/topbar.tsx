"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, ChevronLeft, LogIn } from "lucide-react";

import { logo } from "@/lib/assets/r2";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The one navigation bar, on every screen.
 *
 * Figma "Nav Bar" — 16px side padding, a leading glyph, the Advisory lockup, and
 * a 22px bell — or, on the pre-auth landing frame, a sign-in link — trailing. The design packs a 63px lockup into 66px, which
 * leaves it all but touching both edges. The lockup is scaled to 56px instead, so
 * it sits inside a 64px row — shorter than the design's bar and still with real
 * breathing room. Pinning the height is what stops the lockup's own slack from
 * growing the row further.
 *
 * It has no surface of its own at the top of a screen and frosts into a
 * translucent one once the content scrolls under it — the treatment the Mochi Ice
 * site uses. A one-pixel sentinel drives the switch, so no scroll handler runs on
 * every frame. `ScreenBody` is the scroll container rather than the window, hence
 * the explicit observer root.
 *
 * Render it as the first child of `ScreenBody`; it sticks from there.
 */
/**
 * Mochi Ice frosts its bar with two stacked white gradients over the blur rather
 * than a flat fill: a vertical fade dense at the top and gone by 60%, and a
 * horizontal one that thins through the middle so the wordmark stays legible.
 * Multi-stop gradients are past what a utility can express, so this is the one
 * raw declaration — still driven off the token rather than a literal white.
 */
/**
 * Lucide's `Menu` fixes its bars at `M4 5h16 / M4 12h16 / M4 19h16` — 16 wide on
 * a 7-unit pitch — and exposes only size and stroke width, so neither the gap nor
 * the bar length can be tuned. This is that glyph with the pitch eased to 6.5 and
 * the bars run out to 18, drawn on lucide's own 24 grid with its stroke and round
 * caps so it still reads as one set with the other icons.
 */
function MenuGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 5.5h18" />
      <path d="M3 12h18" />
      <path d="M3 18.5h18" />
    </svg>
  );
}

const FROSTED = (() => {
  const white = (pct: number) => `color-mix(in srgb, var(--on-media) ${pct}%, transparent)`;
  return [
    `linear-gradient(to right, ${white(45)} 70%, transparent 85%, transparent 90%, ${white(45)} 100%)`,
    `linear-gradient(${white(85)} 0%, ${white(6)} 60%, transparent 100%)`,
  ].join(", ");
})();

export function TopBar({
  unreadNotifications = false,
  login = false,
  backHref,
  overlay = false,
  className,
}: {
  readonly unreadNotifications?: boolean;
  /**
   * Puts a sign-in link in the trailing slot instead of the notification bell.
   * For the pre-auth landing frame — every signed-in screen keeps the bell.
   */
  readonly login?: boolean;
  /** Swaps the leading menu glyph for a back chevron pointing here. */
  readonly backHref?: string;
  /**
   * Floats the bar over what follows instead of sitting above it, and reverses
   * the ink to white until it frosts. For frames that open on a photo or video.
   */
  readonly overlay?: boolean;
  readonly className?: string;
}) {
  const t = useTranslations("common");
  const [frosted, setFrosted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFrosted(!entry.isIntersecting),
      { root: sentinel.closest('[data-slot="screen-body"]'), threshold: 0 },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  const onMedia = overlay && !frosted;
  // This is a touch UI — the ghost variant's hover tint only ever fires as a
  // stuck highlight after a tap, so the bar opts out of it entirely.
  const trigger =
    "relative flex size-6 shrink-0 items-center justify-center hover:bg-transparent before:absolute before:-inset-2 before:content-['']";
  const ink = onMedia
    ? "text-on-media hover:text-on-media"
    : "text-foreground hover:text-foreground";

  return (
    <>
      <div aria-hidden className="-mb-px h-px w-full shrink-0" ref={sentinelRef} />
      {/* `h-0` lets an overlay bar hang over the content below it, so a full-bleed
          hero still starts at the very top of the frame. */}
      <div className={cn("sticky top-0 z-10 w-full shrink-0", overlay && "h-0")}>
        <div
          className={cn(
            "flex h-20 w-full items-center justify-between border-b px-4 py-2",
            // `filter` is in the list so the wordmark fades between its reversed
            // and normal colourway instead of snapping.
            "transition-[background,backdrop-filter,border-color,box-shadow,filter] duration-500 ease-in-out",
            frosted
              ? "border-on-media/20 backdrop-blur-sm"
              : "border-transparent bg-transparent",
            className,
          )}
          style={frosted ? { background: FROSTED } : undefined}
        >
          {/* Equal flex slots either side, so the wordmark lands on the centre of
              the bar whatever the two edges hold. `justify-between` alone would
              shift it whenever the leading glyph and the trailing item differ in
              width — which the sign-in link makes obvious. */}
          <div className="flex flex-1 items-center justify-start">
            {backHref ? (
              <Button
                aria-label="ย้อนกลับ"
                className={cn(trigger, ink)}
                nativeButton={false}
                render={<Link href={backHref} />}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft className="size-6" />
              </Button>
            ) : (
              <Button
                aria-label="เมนู"
                className={cn(trigger, ink, "size-9")}
                size="icon"
                variant="ghost"
              >
                <MenuGlyph className="size-7" />
              </Button>
            )}
          </div>

          {/* The asset is #18181b, so the reversed bar flattens it to white.
              Its ink sits 3px below the middle of its own box — the PLATFORM line
              and the script's descenders weight the lower half — so centring the
              box leaves the wordmark visibly low against the glyphs either side.
              The nudge is optical only, hence a transform rather than margin. */}
          <Image
            alt="Advisory Platform"
            className={cn(
              "h-14 w-auto shrink-0 -translate-y-[3px]",
              onMedia && "brightness-0 invert",
            )}
            priority
            src={logo}
          />

          <div className="flex flex-1 items-center justify-end">
            {login ? (
              <Link
                className={cn(
                  "flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap",
                  onMedia ? "text-on-media" : "text-foreground",
                )}
                href="/login"
              >
                <LogIn className="size-4 shrink-0" />
                {t("login")}
              </Link>
            ) : (
              <Button
                aria-label={t("notifications")}
                className={cn(trigger, ink)}
                nativeButton={false}
                render={<Link href="/notifications" />}
                size="icon"
                variant="ghost"
              >
                <Bell className="size-6" />
                {unreadNotifications ? (
                  <span className="absolute top-px left-[15px] size-2 rounded-full bg-primary" />
                ) : null}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
