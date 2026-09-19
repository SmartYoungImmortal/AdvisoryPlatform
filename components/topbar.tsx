"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { Bell, ChevronLeft, LogIn } from "lucide-react";

import { logo } from "@/lib/assets/r2";
import { avatarImage, initials } from "@/lib/mock-db/avatars";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

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
 * Two stacked white gradients over the blur rather than a flat fill: a base
 * layer across the width, and a vertical fade over it, dense at the top and gone
 * by 60%.
 *
 * The base layer used to thin to nothing between 85% and 90% to keep the wash
 * off the trailing bell. That notch is what showed as a clear patch under one
 * corner, so the layer is now even across the width — same two gradients,
 * without the hole. It has to stay: it is what carries the bottom half of the
 * bar, which the vertical fade has already run out on by 60%.
 *
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

/**
 * The wordmark, with a light sweeping across it.
 *
 * The lockup reads as flat ink on a flat bar, and it is the one piece of brand
 * on every screen. A specular sweep is what makes a surface look coated: a
 * narrow bright band raked at 105° that crosses the mark and leaves, then waits
 * long enough (3.6s) that it registers as a glint rather than as a loop.
 *
 * The band is a second copy of the mark, flattened to white and revealed through
 * a moving gradient mask, so the light only ever lands on the glyphs — a
 * gradient painted over the box would put a white bar across the whole nav.
 *
 * It is built this way round because the obvious way round does not work: the
 * logo is an SVG served from R2, and a cross-origin image used as `mask-image`
 * is blocked, which silently masks the element out entirely — the sweep renders
 * nothing at all. A gradient mask has no origin to fail on.
 *
 * The mask position rides on a custom property rather than being tweened
 * directly, because it has to drive the `-webkit-` alias in the same frame.
 *
 * The mask is deliberately *narrower* than the mark (60%). A percentage
 * `mask-position` resolves against `container − mask`, so an oversized mask
 * gives a negative basis: the first cut of this animated a 260%-wide mask, which
 * ran the light right-to-left and kept it off the glyphs for most of the tween —
 * technically animating, effectively invisible. At 60% the basis is +40%, so
 * −60% → 260% carries the band from just off the left edge to just off the
 * right, once, in the direction it is supposed to travel.
 *
 * Reversed, the mark is already white and there is nothing brighter to light it
 * with, so the sweep is left off rather than faked with a dark streak — that
 * reads as a smear, not a shine.
 */
function Lockup({ reversed }: { readonly reversed: boolean }) {
  const sheen = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = sheen.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el,
          { "--sheen-x": "-60%" },
          {
            "--sheen-x": "260%",
            duration: 1.2,
            ease: "power2.inOut",
            repeat: -1,
            repeatDelay: 2.6,
          },
        );
      });

      return () => mm.revert();
    },
    { dependencies: [reversed] },
  );

  return (
    // The ink sits 3px below the middle of its own box — the PLATFORM line and
    // the script's descenders weight the lower half — so centring the box leaves
    // the wordmark visibly low against the glyphs either side. The nudge is
    // optical only, hence a transform rather than margin.
    // Figma's desktop nav (1564:24845) sets the lockup 20px tall in a 68px bar.
    // That is the flat wordmark; this asset is the script over PLATFORM, so it
    // needs the height its two lines ask for — 36px lands the script on the same
    // cap height as the frame's mark without crowding the 68px row.
    <span className="relative block h-14 shrink-0 -translate-y-[3px] lg:h-9 lg:translate-y-0">
      {/* The asset is #18181b, so the reversed bar flattens it to white. */}
      <Image
        alt="Advisory Platform"
        className={cn("h-14 w-auto lg:h-9", reversed && "brightness-0 invert")}
        priority
        src={logo}
      />
      {reversed ? null : (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          ref={sheen}
          style={
            {
              "--sheen-x": "-60%",
              maskImage: SHEEN_BAND,
              maskPosition: "var(--sheen-x) 0%",
              maskRepeat: "no-repeat",
              maskSize: "60% 70%",
              WebkitMaskImage: SHEEN_BAND,
              WebkitMaskPosition: "var(--sheen-x) 0%",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "60% 70%",
            } as CSSProperties
          }
        >
          <Image
            alt=""
            className="h-14 w-auto brightness-0 invert"
            priority
            src={logo}
          />
        </span>
      )}
    </span>
  );
}

/** The light itself: a narrow band raked at 105°, opaque only where it lands. */
const SHEEN_BAND =
  "linear-gradient(105deg, transparent 8%, rgb(0 0 0 / 35%) 32%, #000 50%, rgb(0 0 0 / 35%) 68%, transparent 92%)";

/**
 * Figma "Avatar" (1564:24865) — the 36px portrait at the right of the desktop
 * nav, the way back to the reader's own profile. It only exists from `lg`: the
 * phone frame keeps the profile on its tab bar, and the nav there has no room.
 *
 * Signed out there is no portrait to draw, so nothing renders and the bell (or
 * the sign-in link) holds the edge on its own.
 */
function NavAvatar() {
  const t = useTranslations("common");
  const session = useSession();
  if (session.status !== "authenticated") return null;

  const { account } = session;
  const image = avatarImage(account.avatar);

  return (
    <Link
      aria-label={t("profile")}
      // A ring that appears on hover, so the portrait is visibly a control. It
      // was the one item in the desktop bar with no state at all.
      className="hidden shrink-0 rounded-full ring-2 ring-transparent transition-[box-shadow,--tw-ring-color] duration-150 hover:ring-border motion-reduce:transition-none lg:block"
      href="/profile"
    >
      {image ? (
        <Image
          alt=""
          className="size-9 rounded-full object-cover"
          height={36}
          src={image}
          width={36}
        />
      ) : (
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
        >
          {initials(account)}
        </span>
      )}
    </Link>
  );
}

const FROSTED = (() => {
  const white = (pct: number) => `color-mix(in srgb, var(--on-media) ${pct}%, transparent)`;
  return [
    `linear-gradient(to right, ${white(45)} 0%, ${white(45)} 100%)`,
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
   * This page is reachable by a guest, so the trailing slot falls back to a
   * sign-in link **when there is no session**.
   *
   * It is not "always show sign in". It used to be, and because `NavAvatar`
   * renders on its own whenever a session exists, a signed-in reader on one of
   * these pages got a sign-in link and their own portrait side by side — two
   * controls stating the opposite thing. A signed-in reader now gets the bell and
   * the portrait here exactly as they do everywhere else.
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
  const nav = useTranslations("navigation");
  const pathname = usePathname();
  const [frosted, setFrosted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Read here as well as in `NavAvatar`, so the two halves of the trailing slot
  // agree about whether anyone is signed in. `useSession` is a subscription to
  // the same store, not a second source of truth.
  const signedIn = useSession().status === "authenticated";

  // Figma's desktop nav carries four: find an advisor, bookings, chat, about.
  const links = [
    { label: t("findAdvisor"), href: "/search" },
    { label: nav("bookings"), href: "/bookings" },
    { label: nav("chat"), href: "/chat" },
    { label: t("about"), href: "/landing#about" },
  ];

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
  // The opt-out is now scoped to the phone. A pointer has no reason to lose
  // hover feedback, and the desktop bar had none at all: every control on it
  // answered a click with nothing, which is most of why it read as unfinished
  // beside the phone bar. From `lg` each glyph gets a real 36px target with a
  // hover ground, and `before:inset-0` retires the phone's invisible 40px
  // padded hit area, which would otherwise make the new grounds overlap.
  const trigger = cn(
    "relative flex size-6 shrink-0 items-center justify-center before:absolute before:-inset-2 before:content-['']",
    "max-lg:hover:bg-transparent",
    "lg:size-9 lg:rounded-lg lg:transition-colors lg:duration-150 lg:before:inset-0 lg:hover:bg-accent motion-reduce:lg:transition-none",
  );
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
            // Figma "Top Nav" (1564:24844): 68px on the card surface behind a
            // real border, not the phone bar's glass. The wash is an inline
            // gradient, which a class cannot outrank, hence the `!` pair.
            // A hairline alone left the bar floating on a ground that is now a
            // real step darker; the resting elevation is what seats it.
            "lg:h-17 lg:border-border lg:bg-card! lg:bg-none! lg:px-0 lg:py-4 lg:shadow-card lg:backdrop-blur-none",
            className,
          )}
          style={frosted ? { background: FROSTED } : undefined}
        >
          {/* Equal flex slots either side, so the wordmark lands on the centre of
              the bar whatever the two edges hold. `justify-between` alone would
              shift it whenever the leading glyph and the trailing item differ in
              width — which the sign-in link makes obvious.

              From `lg` the frame stops centring it: the lockup goes hard left at
              the 120px page inset, the links follow it, and the actions hold the
              right edge — so the row becomes logo, nav, actions inside a 1440
              container. */}
          <div className="flex w-full items-center justify-between lg:mx-auto lg:max-w-[1440px] lg:justify-start lg:px-10 xl:px-30">
            <div
              className={cn(
                "flex flex-1 items-center justify-start",
                backHref ? "lg:flex-none lg:pr-4" : "lg:hidden",
              )}
            >
              {backHref ? (
                <Button
                  aria-label={t("back")}
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
                  aria-label={t("menu")}
                  className={cn(trigger, ink, "size-9")}
                  size="icon"
                  variant="ghost"
                >
                  <MenuGlyph className="size-7" />
                </Button>
              )}
            </div>

            {/* The lockup is the way home from anywhere — the convention every
                site the readers already use follows, and the only one this app had
                no affordance for once the back chevron came off the detail bar. */}
            <Link className="shrink-0" href="/">
              <Lockup reversed={onMedia} />
            </Link>

            {/* Figma "Links" (1564:24858) — 48px after the lockup, 28px apart,
                14/20 medium, the current section in full ink. No phone frame
                draws them, so they start at `lg`. */}
            <nav className="hidden lg:flex lg:min-w-px lg:flex-1 lg:items-center lg:gap-7 lg:pl-12">
              {links.map(({ label, href }) => {
                const path = href.split("#")[0];
                const current =
                  path === "/"
                    ? pathname === "/"
                    : pathname === path || pathname.startsWith(`${path}/`);
                return (
                  <Link
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      // 16 rather than 14. This nav only exists from `lg`, and it
                      // was set at the phone's smallest body size — the only text
                      // on a 68px bar, reading like a footnote.
                      "relative text-base leading-5 font-medium whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none",
                      // The section the reader is in was stated by ink alone, at
                      // 14px, against a colour one step away. It now carries
                      // weight and a 2px rule under it, so the bar says where you
                      // are without being read word by word.
                      "after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-colors after:content-['']",
                      current
                        ? "font-semibold text-foreground after:bg-primary"
                        : "text-muted-foreground after:bg-transparent hover:text-foreground hover:after:bg-border",
                    )}
                    href={href}
                    key={href}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-1 items-center justify-end lg:flex-none lg:gap-4">
              {login && !signedIn ? (
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
              {/* Figma "Actions" (1564:24863) pairs the bell with a 36px
                  portrait. The phone frame has no room for it and keeps the
                  profile on its tab bar, which is why this is `lg`-only. */}
              <NavAvatar />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
