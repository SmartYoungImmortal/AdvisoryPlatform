"use client";

import {
  Bell,
  CalendarDays,
  CircleUserRound,
  Globe,
  MessageSquare,
  ReceiptText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useNotificationPulse } from "@/components/notifications/notification-store";
import { OwnAvatar } from "@/components/profile/profile-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isApiConfigured } from "@/lib/api/client";
import { logo } from "@/lib/assets/r2";
import { useAppLocale } from "@/lib/i18n/locale-provider";
import { useSessionStatusHint } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * The desktop app frame: no top navbar; a slim rail on a grey ground at the left and the page itself in
 * one white panel with large rounded corners, inset 6px from the top, right
 * and bottom edges. Below `lg` it adds nothing: phones keep their own top bars
 * and `BottomBar`.
 *
 * ## Using it
 *
 * It wraps the page's scroller, so it goes around `ScreenBody`, not inside it:
 *
 * ```tsx
 * <MobileScreen className="pb-0" wide="md">
 *   <AppFrame active="chat">
 *     <ScreenBody className="bg-card pb-18 lg:pb-0">
 *       <div className={PHONE_BAR}>
 *         <TopBar dock unreadNotifications />
 *       </div>
 *       <div className="app-scale ...">{...the page...}</div>
 *     </ScreenBody>
 *   </AppFrame>
 *   <BottomBar className="lg:hidden" role="user" selected="chat" />
 * </MobileScreen>
 * ```
 *
 * - **`active`**: the rail item for this page (`RailKey`). Leave it out on a
 *   page that is none of them, a public profile for one.
 * - **No `TopBar` from `lg`.** Wrap the phone's bar in `PHONE_BAR` so it only
 *   shows below `lg`. A page whose phone layout opens on `ScreenTopBar` keeps
 *   that `lg:hidden` and outside the frame. No site footer inside the panel
 *   either.
 * - **Public pages work as they are.** Signed out, the rail is the mark and
 *   the way in, with the language at the foot. Signed in, it is the mark, the
 *   person's own photo for the profile, the account's places (the bell with
 *   its live unread count) and the settings alone at the foot; the language
 *   is a row in the settings.
 * - **Scale: `app-scale`, not `doc-scale`.** The panel is the scroller's box
 *   and is not zoomed; `ScreenBody` scrolls inside it. Draw the page in an
 *   `app-scale` wrapper (as `AccountShell` does): the 1710 design space
 *   zoomed to 0.842 at 1440 and held there on any wider screen, so a framed
 *   page renders at the same pixel at every desktop width instead of growing
 *   with the window. Write sizes at their 1440 px x1.1875, and
 *   type with the `text-frame-*` steps in `app/globals.css`, which already
 *   are. `className` here styles the panel itself.
 * - **Height.** The panel is the window less 12px, and `ScreenBody` fills it,
 *   so a page that fills the screen (chat) can size to it.
 *
 * ## The rail
 *
 * The mark at the top, drawn in ink, the person and the places under it, the
 * settings pinned at the foot; line icons at stroke 2 and semibold labels in
 * the hero's ink at 80% that come to full ink on hover and when current, the
 * current one marked by a faint ink square behind its icon. Sized at 1440 and
 * written at x1.1875 (`app-scale`): rail 80, icon 24, items 12 apart and about 60 tall, labels 13 (the nearest step,
 * 16px here, renders at 13.5); the mark 30 and the avatar 28 are ours. The
 * panel's inset (6px) and corners (20px) are on the window's own scale, so
 * they are written as measured.
 */

/** The places on the rail. `explore` draws no item now: the mark goes home, where the search is. */
export type RailKey =
  | "explore"
  | "chat"
  | "bookings"
  | "notifications"
  | "payments"
  | "profile"
  | "settings";

/** The phone's own top bar, inside a framed page: not rendered from `lg`. */
export const PHONE_BAR = "contents lg:hidden";

const PLACES: readonly {
  readonly key: "chat" | "bookings" | "notifications" | "payments";
  readonly href: string;
  readonly icon: LucideIcon;
}[] = [
  { key: "chat", href: "/chat", icon: MessageSquare },
  { key: "bookings", href: "/bookings", icon: CalendarDays },
  { key: "notifications", href: "/notifications", icon: Bell },
  { key: "payments", href: "/transactions", icon: ReceiptText },
];

/** The item: the icon's square over a one-line label, the whole of it the target. */
const ITEM = "group/rail flex w-full flex-col items-center gap-[4.75px] rounded-[14.25px] outline-none";

/** The 40px square behind the icon: faint ink when current, fainter on hover. */
function square(current: boolean) {
  return cn(
    "relative flex size-[47.5px] shrink-0 items-center justify-center rounded-[14.25px]",
    "transition-colors duration-200 group-focus-visible/rail:ring-3 group-focus-visible/rail:ring-ring/50 motion-reduce:transition-none",
    current
      ? "bg-hero-ink/7 text-hero-ink"
      : "text-hero-ink/70 group-hover/rail:bg-hero-ink/4 group-hover/rail:text-hero-ink",
  );
}

/** A 24px line icon at 1440. */
const ICON = "size-[28.5px]";

/** The icons' line: the feed rows' weight, lighter than lucide's 2 so the rail stays quiet. */
const ICON_STROKE = 1.75;

function Label({ current, children }: { readonly current: boolean; readonly children: ReactNode }) {
  // An item is 76px wide in the 1710 space. At 16px the English labels ran past
  // it ("Bookings" 72, "Transactions" 99) and were cut to an ellipsis; at the
  // 14px step every label fits, Thai and English alike, and both languages
  // are set the same size so switching between them does not change the rail.
  return (
    <span
      className={cn(
        "max-w-full truncate px-0.5 text-center text-sm leading-5 transition-colors duration-200 motion-reduce:transition-none",
        current ? "font-semibold text-hero-ink" : "font-semibold text-hero-ink/80 group-hover/rail:text-hero-ink",
      )}
    >
      {children}
    </span>
  );
}

function RailLink({
  href,
  label,
  current,
  icon,
  badge,
}: {
  readonly href: string;
  readonly label: string;
  readonly current: boolean;
  readonly icon: ReactNode;
  readonly badge?: ReactNode;
}) {
  return (
    <li>
      <Link aria-current={current ? "page" : undefined} className={ITEM} href={href}>
        <span className={square(current)}>
          {icon}
          {badge}
        </span>
        <Label current={current}>{label}</Label>
      </Link>
    </li>
  );
}

/** The unread count on the bell: a compact ink pill on the icon's corner. */
function Badge({ count }: { readonly count: number }) {
  const t = useTranslations("appRail");
  return (
    <>
      <span
        aria-hidden
        className="absolute top-[3px] right-[1px] flex h-5 min-w-5 items-center justify-center rounded-full bg-hero-action px-[5px] font-latin text-frame-label leading-none font-semibold text-hero-action-foreground tabular-nums ring-2 ring-background"
      >
        {count > 99 ? "99+" : count}
      </span>
      <span className="sr-only">{t("unread", { count })}</span>
    </>
  );
}

/** The person: their photo in a hairline ring that turns ink when current. */
function ProfileLink({ current }: { readonly current: boolean }) {
  const t = useTranslations("appRail");
  return (
    <li>
      <Link aria-current={current ? "page" : undefined} className={ITEM} href="/profile">
        <span className="flex size-[47.5px] shrink-0 items-center justify-center rounded-full group-focus-visible/rail:ring-3 group-focus-visible/rail:ring-ring/50">
          <span
            className={cn(
              "flex rounded-full ring-offset-2 ring-offset-background transition-shadow duration-200 motion-reduce:transition-none",
              current ? "ring-[1.5px] ring-hero-ink" : "ring-1 ring-border group-hover/rail:ring-hero-ink/40",
            )}
          >
            <OwnAvatar className="size-[33.25px] text-sm" fluid size={34} />
          </span>
        </span>
        <Label current={current}>{t("profile")}</Label>
      </Link>
    </li>
  );
}

/** A guest's language, at the foot (a signed-in reader has it in the settings). */
function LanguageItem() {
  const t = useTranslations("appRail");
  const { locale, setLocale } = useAppLocale();
  return (
    <li>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={t("language")} className={ITEM}>
          <span className={square(false)}>
            <Globe aria-hidden className={ICON} strokeWidth={ICON_STROKE} />
          </span>
          <Label current={false}>{t("language")}</Label>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" side="right" sideOffset={10}>
          <DropdownMenuRadioGroup onValueChange={(value) => setLocale(value as "th" | "en")} value={locale}>
            <DropdownMenuRadioItem className="h-11 text-base" value="th">
              {t("languageTh")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem className="h-11 font-latin text-base" value="en">
              {t("languageEn")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function Rail({ active }: { readonly active?: RailKey }) {
  const t = useTranslations("appRail");
  const pathname = usePathname();
  const status = useSessionStatusHint();
  const signedIn = status === "authenticated";
  const { unread } = useNotificationPulse(isApiConfigured && signedIn);
  const group = "flex flex-col gap-[14.25px]";

  return (
    <nav
      aria-label={t("label")}
      // The foot sits at the same inset as the top. The
      // development build's badge is moved to the right in `next.config.ts`
      // so it no longer covers this corner.
      className="app-scale hidden lg:flex lg:w-[95px] lg:shrink-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:px-[9.5px] lg:pt-[16.625px] lg:pb-[16.625px] lg:[scrollbar-width:none]"
    >
      {/* The mark of Advisory's own logo, cropped out of the wordmark: the
          rail carries the mark alone. It is the way home,
          where the search is. */}
      <Link
        aria-label={t("home")}
        className="flex h-[66.5px] w-full shrink-0 items-center justify-center rounded-[14.25px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        href="/"
      >
        <span aria-hidden className="block h-10.5 w-[37.5px] overflow-hidden">
          {/* Drawn in ink rather than the brand blue; inverted back to light
              on a dark ground. */}
          <Image alt="" className="h-full w-auto max-w-none brightness-0 dark:invert" priority src={logo} />
        </span>
      </Link>

      {/* Until the session answers, nothing: no guessing a guest's rail for a
          signed-in reader, or the other way round. */}
      <ul className={cn(group, "mt-[14.25px]")}>
        {signedIn ? (
          <>
            <ProfileLink current={active === "profile"} />
            {PLACES.map(({ key, href, icon: Icon }) => (
              <RailLink
                badge={key === "notifications" && unread !== null && unread > 0 ? <Badge count={unread} /> : undefined}
                current={active === key}
                href={href}
                icon={<Icon aria-hidden className={ICON} strokeWidth={ICON_STROKE} />}
                key={key}
                label={t(key)}
              />
            ))}
          </>
        ) : null}
        {status === "anonymous" ? (
          <RailLink
            current={false}
            href={`/login?next=${encodeURIComponent(pathname)}`}
            icon={<CircleUserRound aria-hidden className={ICON} strokeWidth={ICON_STROKE} />}
            label={t("login")}
          />
        ) : null}
      </ul>

      {/* The foot: the settings alone; a guest, who has none, gets the language. */}
      <ul className={cn(group, "mt-auto pt-[14.25px]")}>
        {signedIn ? (
          <RailLink
            current={active === "settings"}
            href="/settings"
            icon={<Settings aria-hidden className={ICON} strokeWidth={ICON_STROKE} />}
            label={t("settings")}
          />
        ) : null}
        {status === "anonymous" ? <LanguageItem /> : null}
      </ul>
    </nav>
  );
}

/** See the notes at the top of this file. */
export function AppFrame({
  active,
  children,
  className,
}: {
  /** The rail item for this page; left out on a page that is none of them. */
  readonly active?: RailKey;
  /** The page's `ScreenBody`. */
  readonly children: ReactNode;
  /** Classes for the white panel, from `lg`. */
  readonly className?: string;
}): React.JSX.Element {
  return (
    // Below `lg` neither box exists (`contents`), so the scroller is
    // `MobileScreen`'s child exactly as without the frame.
    <div
      className="contents lg:flex lg:min-h-0 lg:w-full lg:flex-1 lg:bg-background"
      data-slot="app-frame"
    >
      <Rail active={active} />
      <div
        className={cn(
          "contents lg:my-1.5 lg:mr-1.5 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:rounded-[20px] lg:bg-card",
          className,
        )}
        data-slot="app-panel"
      >
        {children}
      </div>
    </div>
  );
}
