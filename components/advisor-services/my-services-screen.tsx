"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatTile } from "@/components/mobile/stat-tile";
import { StatusPill } from "@/components/mobile/status-pill";
import { surfaceClass } from "@/components/mobile/surface";
import { TopBar } from "@/components/topbar";
import { useResource } from "@/lib/api/use-resource";
import { listMyAdvisorServices, listMyAvailabilityProfiles, type AdvisorService } from "@/lib/advisor-services/api";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * Figma "Back Bar" — the 52px row under the app's nav on every advisor frame:
 * the phone's own back chevron, re-seated at the 120px page inset.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";

/** Figma "Head Band" — the white band the title sits in, above the grey body. */
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/**
 * Figma "Stats" — three equal counts, on the app's stat tile rather than the
 * hand-built one this file used to carry.
 *
 * The hand-built one set its figure at 16px, one step above the label under it,
 * which is not enough of a difference to make a number read as a number. The
 * tile takes the Latin face at 20/32 with tabular figures, so the three of them
 * line up down the desktop rail instead of drifting a pixel per digit.
 *
 * The desktop frame (1998:28394) keeps the same three and turns the row on its
 * side: a 380px rail beside the list, because a full-width row of three would be
 * 1200px of mostly air.
 */
function ServiceStat({
  value,
  label,
  href,
}: {
  readonly value: number;
  readonly label: ReactNode;
  readonly href?: string;
}) {
  // `p-3` on the phone: three tiles share a 400px row, so the tile's own 16px
  // would leave a 13-character Thai label 94px to sit in. The rail has the room.
  const tile = (
    <StatTile
      className={cn(
        "h-full w-full p-3 lg:p-4",
        href &&
          "transition-[box-shadow,border-color] duration-150 ease-out hover:border-accented hover:shadow-card-hover motion-reduce:transition-none",
      )}
      label={label}
      value={value}
    />
  );

  // Only the profiles count leads anywhere, and the whole tile is the link — the
  // label alone was a 12px tap target sitting under an unclickable figure.
  return href ? (
    <Link className="flex min-w-px flex-1 lg:flex-none" href={href}>
      {tile}
    </Link>
  ) : (
    <div className="flex min-w-px flex-1 lg:flex-none">{tile}</div>
  );
}

/**
 * Figma "Service Card" — an 88px cover beside the title, the price line and the
 * status row. A hidden service dims its cover rather than its whole card: the row
 * still has to be readable and tappable, it just is not earning anything.
 *
 * The card carried a title and a price and nothing else, while the catalogue knew
 * the score, the review count and how many consultations the service had actually
 * delivered — 4.9, 124 reviews and 312 sessions for the freelance-tax one. An
 * Advisor looking at their own list is asking which of these is working, and that
 * is the line that answers it. It is `ServiceProof`, the same row the public card
 * on home and `/search` prints, so the two cannot drift.
 *
 * The whole card is the link, so it is `Surface interactive` — the hover lift and
 * the press are the affordance the trailing chevron was promising on its own.
 */
function ServiceCard({ record, profileName }: { readonly record: AdvisorService; readonly profileName?: string }) {
  const t = useTranslations("advisorServices");
  const published = record.isPublished;

  return (
    <Link
      className={cn(
        surfaceClass({ interactive: true }),
        "flex w-full shrink-0 items-center gap-3 overflow-clip p-2 lg:gap-4 lg:p-3",
      )}
      href={`/advisor/services/view?serviceId=${encodeURIComponent(record.id)}`}
    >
      {/* 88px on the phone, 104 once the card has 788 of the 1200 column: at the
          phone's size it read as a thumbnail on a desktop-width row. */}
      <div aria-hidden className={cn("flex size-22 shrink-0 items-center justify-center rounded-card bg-muted lg:size-26", !published && "opacity-50")}>
        <ChevronRight className="size-5 text-muted-foreground" />
      </div>
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full text-sm font-semibold text-foreground lg:text-base">{record.name}</p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {t("priceLine", { price: record.priceSatang / 100, minutes: record.durationMinutes })}
        </p>
        <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
          <StatusPill tone={published ? "success" : "neutral"}>
            {published ? t("statusPublished") : t("statusHidden")}
          </StatusPill>
          {profileName ? <p className="min-w-px flex-1 truncate text-xs font-normal text-muted-foreground">{profileName}</p> : null}
        </div>
      </div>
      <ChevronRight className="size-4.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/**
 * Figma "My services" (1594:29524) — everything an Advisor sells, with the create
 * action in the heading rather than a floating button.
 *
 * Titles and covers come from `lib/catalogue/services`, the same records a visitor
 * browses, so an Advisor's card and the public card cannot drift apart. Only what
 * the catalogue has no business knowing — published or hidden, which Availability
 * Profile, the 30-minute price — lives in the advisor-side fixture.
 */
export function MyServicesScreen() {
  const t = useTranslations("advisorServices");
  const c = useTranslations("common");
  const services = useResource("advisors/me/services?page=1&limit=100", listMyAdvisorServices);
  const profiles = useResource("advisors/me/availability/profiles", listMyAvailabilityProfiles);
  const rows = services.data?.items ?? [];
  const counts = { total: services.data?.total ?? 0, published: rows.filter((item) => item.isPublished).length, profiles: profiles.data?.length ?? 0 };

  return (
    // Figma "Desktop / My services (Light)" (1998:28327): the heading becomes a
    // white band with the create action holding the right edge, and the phone's
    // stacked column splits into the 788px list and the 380px stats rail.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href="/advisor/profile" label={c("back")} />

      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        <div className={HEAD_BAND}>
          <div className={cn("flex w-full shrink-0 items-center gap-3 px-6", PAGE, "lg:py-6")}>
            <h1 className="min-w-px flex-1 text-2xl font-semibold text-foreground">
              {t("title")}
            </h1>
            {/* `w-auto` because the action rides in the heading row: the button's
                own default is full width on the phone, which is right for a bar
                and wrong beside a title. */}
            <PrimaryButton className="w-auto shrink-0" href="/advisor/services/new">
              <Plus className="size-4 shrink-0" />
              {t("create")}
            </PrimaryButton>
          </div>
        </div>

        {/* Figma "Body" (1998:28360) — `contents` keeps the phone's single
            column; from `lg` the same two blocks become the grid. */}
        <div
          className={cn(
            "contents lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:pt-10 lg:pb-22",
            PAGE,
          )}
        >
          {/* `items-stretch` so the three tiles share a height when one label
              wraps, and no `overflow-clip` on the way down — it would crop the
              card shadow off every tile and card below. */}
          <div className="flex w-full shrink-0 items-stretch gap-2.5 px-6 lg:col-start-2 lg:row-start-1 lg:flex-col lg:px-0">
            <ServiceStat label={t("statTotal")} value={counts.total} />
            <ServiceStat label={t("statPublished")} value={counts.published} />
            <ServiceStat
              href="/availability/profiles"
              label={t("statProfiles")}
              value={counts.profiles}
            />
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6 lg:col-start-1 lg:row-start-1 lg:px-0">
            {services.loading ? <p className="text-sm text-muted-foreground" role="status">Loading services…</p> : null}
            {services.error || profiles.error ? <div role="alert" className="w-full rounded-card border border-destructive/30 p-4 text-sm"><p>{(services.error ?? profiles.error)?.message}</p><button className="mt-2 text-primary underline" onClick={() => { services.reload(); profiles.reload(); }} type="button">Retry</button></div> : null}
            {!services.loading && !services.error && rows.length === 0 ? <div className="w-full rounded-card border border-border p-6 text-center"><p className="text-sm text-muted-foreground">No services yet.</p><Link className="mt-3 inline-flex text-sm font-medium text-primary" href="/advisor/services/new">{t("create")}</Link></div> : null}
            {rows.map((record) => <ServiceCard key={record.id} record={record} profileName={profiles.data?.find((profile) => profile.id === record.availabilityProfileId)?.name} />)}
          </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
