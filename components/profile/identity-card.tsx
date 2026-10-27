"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { useOwnProfile } from "@/components/profile/profile-data";
import { useAccount } from "@/components/session/account-bits";
import { cn } from "@/lib/utils";

/**
 * The top of `/profile` and `/profile/edit`: a crumb, then the
 * identity on the left (portrait, name, a handle line, a line about them, a
 * box of figures) and a wide banner photograph on the right with pills under
 * it. Both pages draw the same frame, so moving between them is moving within
 * one page: the edit page puts its fields where the profile has its facts.
 *
 * The skin is Advisory's: the home hero's room as the banner, Kanit for the
 * name, the capsule buttons, the white ground.
 */

/** The portrait: 80 on the phone, 96 on a tablet, and 80 (at 1440) from `lg`. */
export const PORTRAIT = "size-20 text-2xl md:size-24 md:text-3xl lg:size-[95px] lg:text-frame-title";

/**
 * The capsule button, from `lg`: 40px tall with a 16px
 * label and 16/12px sides, written at x1.1875 for the `app-scale` frame.
 */
export function profilePill(solid = false) {
  return cn(
    authPill(solid),
    "w-auto lg:h-[47.5px] lg:gap-2 lg:pr-[19px] lg:pl-[14.25px] lg:text-frame-body lg:[&_svg:not([class*='size-'])]:size-[19px]",
  );
}

/** What the header says about the account, from `GET /users/me` (the session's copy until it lands). */
export function useProfileFacts() {
  const format = useFormatter();
  const profile = useOwnProfile();
  const account = useAccount();
  const data = profile.data;
  return {
    profile,
    name: data?.displayName ?? account?.name,
    email: data?.email ?? account?.email,
    fullName: data?.fullName?.trim() || null,
    verified: data?.emailVerified ?? false,
    joined: data?.createdAt
      ? format.dateTime(new Date(data.createdAt), { month: "short", year: "numeric" })
      : null,
  };
}

/**
 * The crumb, "X's profile", with the page under it when there is one,
 * and the row's one action at the right.
 */
export function ProfileCrumb({
  current,
  action,
}: {
  /** The page below the profile, which makes the profile's own crumb a link back. */
  readonly current?: string;
  readonly action?: ReactNode;
}) {
  const t = useTranslations("profile");
  const s = useTranslations("service");
  const { name } = useProfileFacts();
  const crumb = name ? t("crumb", { name }) : t("yourProfile");

  return (
    // As tall as the profile's edit pill on both pages, so the frame below it
    // stands on the same line whichever of the two is open.
    <div className="flex min-h-11 items-center justify-between gap-3 md:min-h-12 lg:min-h-14">
      <nav aria-label={s("breadcrumbLabel")} className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:text-base lg:text-frame-meta">
          <li className="min-w-0 truncate">
            {current ? (
              <Link
                className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                href="/profile"
              >
                {crumb}
              </Link>
            ) : (
              <span aria-current="page">{crumb}</span>
            )}
          </li>
          {current ? (
            <>
              <li aria-hidden>
                <ChevronRight className="size-4" />
              </li>
              <li aria-current="page" className="shrink-0 text-foreground">
                {current}
              </li>
            </>
          ) : null}
        </ol>
      </nav>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** The identity column: the portrait, and everything else in a column beside it. */
export function IdentityRow({
  portrait,
  children,
}: {
  readonly portrait: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-4 lg:gap-6">
      <div className="relative shrink-0">{portrait}</div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/**
 * The banner and what sits under it: the home hero's room, the categories the
 * account has booked as pills, and when it joined at the far right. No pills until there is something booked.
 */
export function ProfileCover({ categories }: { readonly categories: readonly string[] }) {
  const t = useTranslations("profile");
  const { joined } = useProfileFacts();

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:gap-4">
      {/* Cropped to the desk line; `bg-muted` holds the band where the theme
          has no photograph. */}
      <div
        aria-hidden
        className="aspect-[2.6/1] w-full rounded-2xl bg-muted bg-hero-photo bg-cover bg-[position:50%_66%] bg-no-repeat md:aspect-[3.2/1] lg:aspect-[2.25/1] lg:rounded-3xl"
      />
      <div className="flex items-start justify-between gap-3">
        <ul className="flex min-w-0 flex-wrap gap-2">
          {categories.slice(0, 3).map((category) => (
            <li
              className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs text-foreground md:h-9 md:text-sm lg:h-9.5 lg:px-[14.25px] lg:text-frame-label"
              key={category}
            >
              {category}
            </li>
          ))}
        </ul>
        {joined ? (
          <p className="flex h-8 shrink-0 items-center gap-1.5 text-xs text-muted-foreground md:h-9 md:text-sm lg:h-9.5 lg:text-frame-label">
            <CalendarDays aria-hidden className="size-3.5 lg:size-4" />
            {t("memberSince", { date: joined })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Two-up: the identity on the left, the cover on the right; stacked below `lg`. */
export function ProfileHero({
  identity,
  cover,
}: {
  readonly identity: ReactNode;
  readonly cover: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {identity}
      {cover}
    </div>
  );
}
