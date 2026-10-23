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
import { useAppLocale } from "@/lib/i18n/locale-provider";
import { useSession } from "@/lib/session";
import { useUnreadDot } from "@/components/notifications/notification-store";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
    <span className="relative flex h-14 shrink-0 items-center lg:h-9">
      {/* The asset is #18181b, so the reversed bar flattens it to white. */}
      {/* The capsule is the brand's dark ground at every desktop width, so the
          mark reverses there whatever the phone bar is doing. */}
      <Image
        alt="Advisory Platform"
        className={cn(
          "h-8 w-auto lg:h-6",
          // Over a hero the phone bar reverses the mark to white; the capsule
          // carries its own light surface at every desktop width, so there it
          // stays in the brand's own colours.
          reversed && "brightness-0 invert lg:brightness-100 lg:invert-0",
        )}
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
            className="h-8 w-auto brightness-0 invert"
            priority
            src={logo}
          />
        </span>
      )}
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
function LanguageSwitch() {
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
      className="hidden h-10 shrink-0 items-center gap-1.5 px-1 font-latin text-xs font-bold lg:inline-flex"
      role="group"
    >
      {option("th", "TH")}
      <span aria-hidden className="text-muted-foreground/60">/</span>
      {option("en", "EN")}
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
      // A little clear of the capsule's edge: with the capsule's own 8px of
      // padding this holds the portrait 12px in, so the round shape does not
      // crowd the corner it sits in.
      className="hidden shrink-0 rounded-full ring-2 ring-transparent transition-[box-shadow,--tw-ring-color] duration-150 hover:ring-border motion-reduce:transition-none lg:mr-1 lg:block"
      href="/profile"
    >
      {image ? (
        <Image
          alt=""
          // 48px from `lg`, which is the height every other control in the
          // cluster stands at; 36 left the portrait visibly short beside them.
          className="size-9 rounded-full object-cover lg:size-10"
          height={40}
          src={image}
          width={40}
        />
      ) : (
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground lg:size-10"
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
  // The site-wide link labels live in `landing`, beside the footer that also uses
  // them — the two should never disagree about what a destination is called.
  const l = useTranslations("landing");
  const pathname = usePathname();
  const [frosted, setFrosted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Read here as well as in `NavAvatar`, so the two halves of the trailing slot
  // agree about whether anyone is signed in. `useSession` is a subscription to
  // the same store, not a second source of truth.
  // Three states, not two. Reading the session is a round trip now that it comes
  // from `/api/v1/users/me`, so `status` is `loading` for the first render of
  // every page view. Collapsing that to "not signed in" made a signed-in reader
  // see the sign-in link and no portrait, then watch both swap — so `loading`
  // renders neither rather than guessing wrong for a whole request.
  const sessionStatus = useSession().status;
  const signedIn = sessionStatus === "authenticated";
  const sessionKnown = sessionStatus !== "loading";
  const showUnreadDot = useUnreadDot(signedIn, unreadNotifications);

  // Figma's desktop nav carries four: find an advisor, bookings, chat, about.
  /**
   * The bar carried four. The footer carries eleven, so the nav was the narrowest
   * view of the site anywhere in it — and two of its four were `bookings` and
   * `chat`, which are signed-in destinations sitting in a bar a guest also sees.
   *
   * Seven now, in the order a reader meets them: find, browse, how it works, then
   * their own two, then the two the site wants to sell. Every label is a key that
   * already existed; nothing here is new copy.
   *
   * The last two are `xl`-only. At 1024 seven Thai labels at 18px plus the lockup
   * and the actions do not leave a single line, and a nav that wraps is broken —
   * so the tablet keeps five and the desktop takes all seven.
   */
  const links = [
    { label: t("findAdvisor"), href: "/search" },
    // The Thai `footerLink*` set, not the English uppercase `footer*` set — the
    // latter is the phone footer's English link list and would drop ENGLISH CAPS
    // into a Thai nav.
    { label: l("footerLinkCategories"), href: "/search/browse" },
    { label: l("footerLinkHowItWorks"), href: "/landing#how-it-works" },
    { label: nav("bookings"), href: "/bookings" },
    { label: nav("chat"), href: "/chat" },
    { label: l("footerLinkAbout"), href: "/landing#about", wide: true },
    { label: l("footerLinkBecomeAdvisor"), href: "/advisor/apply", wide: true },
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
    ? "text-on-media hover:text-on-media lg:text-foreground lg:hover:text-foreground"
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
            "transition-[background,backdrop-filter,border-color,box-shadow,filter,padding] duration-500 ease-in-out",
            frosted
              // The desktop row keeps its 24px gutter in both states — the
              // capsule is what cancels it when docking, which is the only way
              // the lockup can stay on the same x through the change.
              ? "border-on-media/20 backdrop-blur-sm lg:border-b-0 lg:bg-transparent lg:px-6 lg:backdrop-blur-none"
              : "border-transparent bg-transparent lg:border-b-0 lg:px-6 lg:backdrop-blur-none",
            // Figma "Top Nav" (1564:24844): 68px on the card surface behind a
            // real border, not the phone bar's glass. The wash is an inline
            // gradient, which a class cannot outrank, hence the `!` pair.
            // A hairline alone left the bar floating on a ground that is now a
            // real step darker; the resting elevation is what seats it.
            // The glass is kept at every width. This used to read
            // `lg:bg-card! lg:bg-none! lg:backdrop-blur-none`, which threw the
            // frosted treatment away and put a flat card band in its place — the
            // same mistake the footer was making, and the reason the phone bar
            // looked considered while the desktop one looked like a placeholder.
            // What changes with the width is the height and the layout, not the
            // material.
            //
            // 72px, not 68: the desktop bar was *shorter* than the phone's 80,
            // which is backwards, since the wider viewport is where a bar has
            // room to be a band rather than a strip.
            // From `lg` the material moves off this row and onto the capsule
            // inside it, so the row itself is only the gutter the capsule floats
            // in. The wash rides on a custom property because an inline style
            // cannot be answered by a media query, and `lg:bg-none` is what takes
            // it back off at desktop width.
            "bg-[image:var(--bar-wash)]",
            // The capsule floats clear of the top edge at every scroll
            // position now that it no longer grows into a band.
            "lg:h-auto lg:bg-none lg:py-3",
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
              "relative flex w-full items-center justify-between",
              // 984 x 64 with 32px corners, measured off the reference bar. The
              // capsule keeps that box at every scroll position — only the glass
              // behind it deepens as content passes under, which is what the
              // reference does too.
              "lg:h-16 lg:justify-start lg:rounded-[2rem] lg:py-2 lg:pr-2 lg:pl-6 lg:backdrop-blur-[20px]",
              "lg:mx-[max(0px,calc((100%-984px)/2))]",
              "lg:transition-colors lg:duration-500 lg:ease-out motion-reduce:lg:transition-none",
              frosted ? "lg:bg-card/55" : "lg:bg-card/25",
            )}
          >
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
                /* It was a `<Button>` with no handler and no href: the one
                   control on the phone bar, and pressing it did nothing. It opens
                   the navigation now — the links the desktop bar shows inline,
                   which the phone had no way to reach at all. */
                <Sheet onOpenChange={setMenuOpen} open={menuOpen}>
                  <SheetTrigger
                    aria-label={t("menu")}
                    className={cn(trigger, ink, "size-9")}
                  >
                    <MenuGlyph className="size-7" />
                  </SheetTrigger>
                  {/* A full-screen panel, not a narrow side drawer. On a 402px
                      frame a 4/5-width sheet leaves a useless 80px sliver of the
                      page behind it and forces the links into a column narrower
                      than the screen; the reference header opens
                      `inset-x-0 bottom-0 top-14` and sets its links large and
                      centred, which is what a phone menu should be. The `!`s
                      outrank `sheet`'s own `w-3/4` / `sm:max-w-sm` / `h-auto`
                      side variants. */}
                  {/* The reference's panel: the brand ground as a vertical
                      ramp rather than the page's own white, the list centred in
                      the middle of the screen at one size, and the whole sheet
                      closing on a tap anywhere off it. A translucent panel over
                      a photographic hero left the links unreadable, so this one
                      is solid. */}
                  <SheetContent
                    className="h-dvh! w-full! max-w-none! gap-0 border-0 bg-linear-to-b from-footer-surface-deep to-footer-surface p-0 text-on-media"
                    side="top"
                  >
                    <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
                    {/* A band the height of the bar it opened from, so the
                        lockup does not jump when the panel appears. */}
                    <div className="flex h-20 w-full shrink-0 items-center px-4">
                      <Link
                        className="shrink-0"
                        href="/"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Lockup reversed />
                      </Link>
                    </div>

                    {/* Centred, at 24px, 24px apart, each a 44px target, with the
                        current section stated in the accent and nothing else —
                        the shape `everyday-cat-clinic-v2`'s drawer uses
                        (`items-center gap-6`, `min-h-11`, `text-2xl`, colour for
                        state). The first attempt here was a left-aligned list of
                        20px rows with a tinted background behind the current one,
                        which is a settings list, not a menu: four destinations on
                        a phone want to be the only thing on the screen. */}
                    <nav className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain px-5 py-10">
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
                              // One size for every item in the list, as the
                              // reference sets it: 22px bold, centred, a 44px
                              // target, and the current section in the accent.
                              "flex min-h-11 w-full items-center justify-center rounded-md px-2 text-2xl leading-snug font-bold transition-colors duration-200 motion-reduce:transition-none",
                              current ? "text-primary" : "text-on-media hover:text-primary",
                            )}
                            href={href}
                            key={href}
                            onClick={() => setMenuOpen(false)}
                          >
                            {label}
                          </Link>
                        );
                      })}
                    </nav>

                    {/* The way in or the way to your own account, at the thumb
                        end of the panel. Without it the menu listed four
                        marketing pages and nothing about the reader. */}
                    <div className="mx-auto flex w-full max-w-80 shrink-0 flex-col items-stretch px-5 pt-8 pb-10">
                      {signedIn ? (
                        <NeutralButton
                          block
                          href="/profile"
                          onClick={() => setMenuOpen(false)}
                          size="lg"
                        >
                          {t("profile")}
                        </NeutralButton>
                      ) : (
                        <PrimaryButton
                          block
                          href="/login"
                          onClick={() => setMenuOpen(false)}
                          size="lg"
                        >
                          {t("login")}
                        </PrimaryButton>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
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

            {/* `xl:flex-1` again, to balance the lockup's side: two equal groups
                are what let the absolutely-centred nav land on the bar's centre
                rather than the centre of what is left over. */}
            <div className="flex flex-1 items-center justify-end gap-1 lg:ml-auto lg:flex-none lg:gap-3">
              {/* `sessionKnown` gates the whole either/or: until the session has
                  answered, neither the sign-in link nor the bell is drawn, so the
                  slot is empty for one request rather than showing the wrong one.
                  The bar's height does not depend on what is in it, so nothing
                  moves when the answer lands. */}
              <LanguageSwitch />
              {!sessionKnown && login ? null : login && !signedIn ? (
                <>
                  <Link
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap lg:hidden",
                      onMedia ? "text-on-media" : "text-foreground",
                    )}
                    href="/login"
                  >
                    <LogIn className="size-4 shrink-0" />
                    {t("login")}
                  </Link>
                  {/* fastwork's "Get started": a black pill with white type that
                      opens sign-up, the one thing on the bar for a guest to
                      press. Signing in is still a tap away on the phone link
                      above and on the register screen itself. */}
                  <Button
                    className="hidden h-10 rounded-full bg-hero-action px-5 text-sm font-semibold text-hero-action-foreground hover:bg-hero-action/85 lg:inline-flex"
                    nativeButton={false}
                    render={<Link href="/register" />}
                  >
                    {t("getStarted")}
                  </Button>
                </>
              ) : (
                <Button
                  aria-label={t("notifications")}
                  className={cn(
                    trigger,
                    ink,
                    // A bare glyph at every width: the capsule already carries
                    // the surface, and a ring around one icon beside the plain
                    // TH / EN pair read as two different kinds of control.
                    "lg:size-10 lg:rounded-full lg:hover:bg-muted/60",
                  )}
                  nativeButton={false}
                  render={<Link href="/notifications" />}
                  size="icon"
                  variant="ghost"
                >
                  <Bell className="size-6 lg:size-5" />
                  {showUnreadDot ? (
                    <span className="absolute top-px left-[15px] size-2 rounded-full bg-primary ring-2 ring-card lg:top-1.5 lg:right-1.5 lg:left-auto lg:size-2" />
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
