"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import { Bell, ChevronLeft } from "lucide-react";

import { logo } from "@/lib/assets/r2";
import { avatarImage, initials } from "@/lib/mock-db/avatars";
import { useAppLocale } from "@/lib/i18n/locale-provider";
import { useSession, useSessionStatusHint } from "@/lib/session";
import { useUnreadDot } from "@/components/notifications/notification-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * The one navigation bar, on every screen and at every width: the desktop's
 * floating capsule, the lockup at the left and TH / EN, the bell (or "Get
 * started" for a guest) and the portrait at the right. The phone has no menu
 * of its own here; its navigation is the tab bar along the bottom.
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
 * The wordmark. The light that used to sweep only across it now crosses the
 * whole capsule (`BarSheen`).
 */
function Lockup({ reversed }: { readonly reversed: boolean }) {
  return (
    // The ink sits 3px below the middle of its own box — the PLATFORM line and
    // the script's descenders weight the lower half — so centring the box leaves
    // the wordmark visibly low against the glyphs either side. The nudge is
    // optical only, hence a transform rather than margin.
    // Figma's desktop nav (1564:24845) sets the lockup 20px tall in a 68px bar.
    // That is the flat wordmark; this asset is the script over PLATFORM, so it
    // needs the height its two lines ask for — 36px lands the script on the same
    // cap height as the frame's mark without crowding the 68px row.
    <span className="relative flex h-9 shrink-0 items-center">
      {/* The asset is #18181b, so a reversed lockup flattens it to white. The
          bar's capsule carries its own light surface at every width, so the bar
          itself never asks for that. */}
      <Image
        alt="Advisory Platform"
        className={cn("h-6 w-auto", reversed && "brightness-0 invert")}
        priority
        src={logo}
      />
    </span>
  );
}

/**
 * A light sweeping across the whole capsule: a narrow bright band raked like a
 * reflection on glass, crossing the bar once and then waiting long enough
 * (8s) that it registers as a glint rather than as a loop. It moves by
 * transform only, clipped to the capsule's own corners, and is left out for a
 * reader who has asked for less motion.
 */
function BarSheen() {
  const band = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // GSAP owns the whole transform, slant included: a starting translate
      // written in the markup was read back as a pixel offset and added to
      // every pass, which stopped some of them short of the right edge. The
      // band is a fifth of the bar, so -150% parks it off the left and 650%
      // clear of the right.
      gsap.set(band.current, { x: 0, skewX: -12, autoAlpha: 1 });
      gsap.fromTo(
        band.current,
        { xPercent: -150 },
        { xPercent: 650, duration: 1.5, ease: "power2.inOut", repeat: -1, repeatDelay: 8 },
      );
    });
    return () => mm.revert();
  });

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {/* Hidden until the animation places it, and for good without motion. */}
      <span
        className="invisible absolute inset-y-0 left-0 w-1/5 bg-linear-to-r from-transparent via-on-media/60 to-transparent"
        ref={band}
      />
    </span>
  );
}

/**
 * The language control the reference marketplaces carry at the right of the bar.
 *
 * Two real buttons now: each switches the whole app's copy in place, through
 * `LocaleProvider`, and the choice is remembered in this browser. The one in
 * use is drawn in full ink and marked `aria-pressed`; the other is muted.
 */
/**
 * TH / EN. Exported for the sign-in pages, which have no bar to carry it;
 * `className` there makes it show at every width.
 */
export function LanguageSwitch({ className }: { readonly className?: string }) {
  const t = useTranslations("common");
  const { locale, setLocale } = useAppLocale();
  const option = (value: "th" | "en", label: string) => (
    <button
      aria-pressed={locale === value}
      className={cn(
        "rounded-sm px-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        locale === value ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground",
      )}
      onClick={() => setLocale(value)}
      type="button"
    >
      {label}
    </button>
  );
  return (
    <span
      aria-label={t("language")}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 px-1 font-latin text-xs font-bold",
        className,
      )}
      role="group"
    >
      {option("th", "TH")}
      <span aria-hidden className="text-muted-foreground/60">/</span>
      {option("en", "EN")}
    </span>
  );
}

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
      // A little clear of the capsule's edge: with the capsule's own 8px of
      // padding this holds the portrait 12px in, so the round shape does not
      // crowd the corner it sits in.
      className="mr-1 block shrink-0 rounded-full ring-2 ring-transparent transition-[box-shadow,--tw-ring-color] duration-150 hover:ring-border motion-reduce:transition-none"
      href="/profile"
    >
      {image ? (
        <Image
          alt=""
          // 48px from `lg`, which is the height every other control in the
          // cluster stands at; 36 left the portrait visibly short beside them.
          className="size-10 rounded-full object-cover"
          height={40}
          src={image}
          width={40}
        />
      ) : (
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
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
  backHref,
  overlay = false,
  dock = false,
  className,
}: {
  readonly unreadNotifications?: boolean;
  /**
   * From `lg`, once the page scrolls, the capsule docks: it grows to the full
   * width, meets the top edge, loses its corners and turns a solid light grey,
   * the way the Systronic header does. Its padding grows by exactly the margin
   * it gives up, so the lockup and the actions stay on the same pixel through
   * the change. Off by default: the home hero wants the floating pill.
   */
  readonly dock?: boolean;
  /** Swaps the leading menu glyph for a back chevron pointing here. */
  readonly backHref?: string;
  /**
   * Floats the bar over what follows instead of sitting above it, for frames
   * that open on a photo or video. The capsule carries its own light surface,
   * so its ink stays dark over the photo.
   */
  readonly overlay?: boolean;
  readonly className?: string;
}) {
  const t = useTranslations("common");
  const [frosted, setFrosted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Read here as well as in `NavAvatar`, so the two halves of the trailing slot
  // agree about whether anyone is signed in. `useSession` is a subscription to
  // the same store, not a second source of truth.
  // Three states, not two. Reading the session is a round trip now that it comes
  // from `/api/v1/users/me`, so `status` is `loading` for the first render of
  // every page view. Collapsing that to "not signed in" made a signed-in reader
  // see the sign-in link and no portrait, then watch both swap — so `loading`
  // renders neither rather than guessing wrong for a whole request.
  //
  // Unless this browser has seen an answer before: then the last one stands
  // in until the request returns (`useSessionStatusHint`), so "Get started"
  // is drawn with the rest of the bar instead of a beat after it.
  const sessionStatus = useSessionStatusHint();
  const signedIn = sessionStatus === "authenticated";
  const sessionKnown = sessionStatus !== "loading";
  const showUnreadDot = useUnreadDot(signedIn, unreadNotifications);


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

  // One bar at every width: the desktop's floating capsule, with the lockup at
  // the left and TH / EN, the bell (or "Get started") and the portrait at the
  // right. The phone used to get its own full-width strip with a menu glyph and
  // a centred lockup; it now gets the same capsule, and its navigation stays on
  // the tab bar along the bottom. The capsule carries its own light surface,
  // so the ink is the same over a photo as over the page.
  const trigger =
    "relative flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-accent motion-reduce:transition-none";
  const ink = "text-foreground hover:text-foreground";

  return (
    <>
      <div aria-hidden className="-mb-px h-px w-full shrink-0" ref={sentinelRef} />
      {/* `h-0` lets an overlay bar hang over the content below it, so a full-bleed
          hero still starts at the very top of the frame. */}
      <div className={cn("sticky top-0 z-10 w-full shrink-0", overlay && "h-0")}>
        <div
          className={cn(
            // The row is only the gutter the capsule floats in: 12px on the
            // phone, the desktop's 24px from `md`. It keeps that gutter in both
            // states; the capsule is what cancels it when docking, which is the
            // only way the lockup stays on the same x through the change.
            //
            // Its height is fixed (12 + the 56/64 capsule + 12) and never
            // animates. It used to give up its vertical padding when docking,
            // which changed its height mid-scroll: everything under it was laid
            // out again on every frame of the transition and the scroll
            // stalled for half a second. The capsule's own top margin does that
            // job now, inside a box whose size does not move.
            "flex h-20 w-full items-start px-3 md:h-22 md:px-6",
            // From `lg` the bar shrinks with the page it sits on (the 1710 frame
            // zoomed down on a landscape tablet), instead of staying full size
            // above a content column that is not.
            "doc-scale",
            "transition-[padding] duration-500 ease-in-out",
            // The capsule floats clear of the top edge at every scroll
            // position, unless the page docks it (`dock`), when the row gives
            // up its side gutters so the band can meet both edges.
            dock && frosted && "px-0 md:px-0",
            className,
          )}
          style={frosted ? ({ "--bar-wash": FROSTED } as CSSProperties) : undefined}
        >
          {/* Equal flex slots either side, so the wordmark lands on the centre of
              the bar whatever the two edges hold. `justify-between` alone would
              shift it whenever the leading glyph and the trailing item differ in
              width — which the sign-in link makes obvious.

              From `lg` the frame stops centring it: the lockup goes hard left at
              the 120px page inset, the links follow it, and the actions hold the
              right edge — so the row becomes logo, nav, actions inside a 1440
              container. */}
          {/* From `xl` the links sit in the true centre of the bar, with the
              lockup hard left and the actions hard right — the shape
              mochiice-fe's header uses (`absolute left-1/2 -translate-x-1/2` on
              the nav, `flex-1` groups either side). Two equal flex-1 groups are
              what make the centre optical rather than "after the logo".

              Gated at `xl`, not `lg`: mochiice gates its own at 1512 for the same
              reason — at 1024 four links plus a lockup plus the actions have no
              room to leave a centre, so there the nav stays inline. */}
          {/* The capsule. At the top of a page it is a pill inset from both
              edges; once the content scrolls under it the pill grows to the full
              width, loses its radius and becomes the band that holds the top of
              the window — the shape the Systronic header uses, animated between
              the two states rather than swapped.

              `max-width` and `border-radius` are both lengths at either end, so
              the transition runs; `transform` is not involved, which keeps the
              text crisp throughout. */}
          <div
            className={cn(
              "relative flex w-full items-center justify-start",
              // 984 x 64 with 32px corners, measured off the reference bar, and
              // as wide as the screen allows below that. The capsule keeps that
              // box at every scroll position; only the glass behind it deepens
              // as content passes under, which is what the reference does too.
              "mt-3 h-14 rounded-[2rem] py-2 pr-2 pl-4 backdrop-blur-[20px] md:h-16 md:pl-6",
              "mx-[max(0px,calc((100%-984px)/2))]",
              "transition-[margin,padding,height,border-radius,background-color] duration-500 ease-out motion-reduce:transition-none",
              // The glass deepens as content passes under the floating pill;
              // a docked bar replaces the fill entirely (below, merged last).
              frosted ? "bg-card/55" : "bg-card/25",
              dock && frosted
                ? // Docked: the margin each side becomes padding of the same
                  // width (a percentage in either resolves against the same
                  // row), so nothing inside moves sideways. 72px tall: 88
                  // (enough that nothing moved vertically either) read as a
                  // slab, and the capsule's own 64 as cramped against the
                  // top edge; the content rises 8px, with the same easing.
                  // mochiice-fe's scrolled header (`Layout/Header.vue`): no
                  // flat fill, but `--bar-wash` (the `FROSTED` pair the row
                  // already carries, white that fades out downward over a
                  // 45% veil) on a light `blur-sm`, with a faint white rule,
                  // so the band dissolves into the page instead of ending
                  // on a hard edge.
                  "mx-0 mt-0 h-16 rounded-none border-b border-on-media/20 bg-transparent bg-[image:var(--bar-wash)] pr-[calc(max(0px,calc((100%-984px)/2))+0.5rem)] pl-[calc(max(0px,calc((100%-984px)/2))+1rem)] backdrop-blur-sm md:h-18 md:pl-[calc(max(0px,calc((100%-984px)/2))+1.5rem)]"
                : undefined,
            )}
          >
            {backHref ? (
              <div className="flex flex-none items-center pr-2 md:pr-4">
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
              </div>
            ) : null}
            {/* Only on the floating pill: docked, the bar is a full-width band
                and a glint running the width of the screen reads as a flash. */}
            {dock && frosted ? null : <BarSheen />}
            {/* The lockup is the way home from anywhere. */}
            <Link className="shrink-0" href="/">
              <Lockup reversed={false} />
            </Link>

            <div className="ml-auto flex flex-none items-center gap-1.5 md:gap-3">
              {/* `sessionKnown` gates the whole either/or: until the session has
                  answered, neither the sign-in link nor the bell is drawn, so the
                  slot is empty for one request rather than showing the wrong one.
                  The bar's height does not depend on what is in it, so nothing
                  moves when the answer lands. */}
              <LanguageSwitch />
              {/* Decided by the session alone. It used to need a `login` prop
                  per page, and every page without it showed a guest the bell
                  to notifications they cannot have. */}
              {!sessionKnown ? null : !signedIn ? (
                /* fastwork's "Get started": a black pill with white type that
                   opens sign-up, the one thing on the bar for a guest to press.
                   Signing in is a tap away on the register screen itself. */
                <Button
                  className="inline-flex h-9 rounded-full bg-hero-action px-4 text-xs font-semibold text-hero-action-foreground hover:bg-hero-action/85 md:h-10 md:px-5 md:text-sm"
                  nativeButton={false}
                  render={<Link href="/register" />}
                >
                  {t("getStarted")}
                </Button>
              ) : (
                <Button
                  aria-label={t("notifications")}
                  className={cn(
                    trigger,
                    ink,
                    // A bare glyph at every width: the capsule already carries
                    // the surface, and a ring around one icon beside the plain
                    // TH / EN pair read as two different kinds of control.
                    "size-10 rounded-full hover:bg-muted/60",
                  )}
                  nativeButton={false}
                  render={<Link href="/notifications" />}
                  size="icon"
                  variant="ghost"
                >
                  <Bell className="size-5" />
                  {showUnreadDot ? (
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-card" />
                  ) : null}
                </Button>
              )}
              {/* Figma "Actions" (1564:24863) pairs the bell with the portrait. */}
              <NavAvatar />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
