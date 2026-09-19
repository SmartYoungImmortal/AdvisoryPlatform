import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import {
  SLOT_MINUTES,
  advisorServices,
  serviceCounts,
  type AdvisorServiceRecord,
} from "@/lib/advisor-services";

/**
 * Figma "Back Bar" — the 52px row under the app's nav on every advisor frame:
 * the phone's own back chevron, re-seated at the 120px page inset.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";

/** Figma "Head Band" — the white band the title sits in, above the grey body. */
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/** The 1200 content column, inset 120 from the 1440 page. */
const COLUMN = "lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-10 xl:px-30";

/**
 * Figma "Stats" — three equal counts on flat surfaces, no hairline.
 *
 * The desktop frame (1998:28394) keeps the same three and turns the row on its
 * side: a 380px rail of 68px cards beside the list, each left-aligned behind a
 * hairline, because a full-width row of three would be 1200px of mostly air.
 */
function StatCard({
  value,
  label,
  href,
}: {
  readonly value: number;
  readonly label: ReactNode;
  readonly href?: string;
}) {
  return (
    <div className="flex min-w-px flex-1 flex-col items-center gap-0.5 overflow-clip rounded-[12px] bg-card py-3 lg:w-full lg:flex-none lg:items-start lg:border lg:border-border lg:px-4">
      <p className="font-latin text-base font-semibold text-foreground lg:text-lg">
        {value}
      </p>
      {href ? (
        <Link className="text-xs font-normal text-muted-foreground" href={href}>
          {label}
        </Link>
      ) : (
        <p className="text-xs font-normal text-muted-foreground">{label}</p>
      )}
    </div>
  );
}

/**
 * Figma "Service Card" — an 88px cover beside the title, the price line and the
 * status row. A hidden service dims its cover rather than its whole card: the row
 * still has to be readable and tappable, it just is not earning anything.
 */
function ServiceCard({ record }: { readonly record: AdvisorServiceRecord }) {
  const t = useTranslations("advisorServices");
  const published = record.status === "published";

  return (
    <Link
      className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-xl border border-border bg-card p-2"
      href={`/advisor/services/${record.serviceId}`}
    >
      <Image
        alt=""
        className={cn(
          "size-22 shrink-0 rounded-[12px] object-cover",
          published ? null : "opacity-50",
        )}
        src={record.service.cover}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full text-sm font-semibold text-foreground">
          {record.service.title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {t("priceLine", {
            price: record.shortPrice,
            minutes: SLOT_MINUTES,
          })}
        </p>
        <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
          <span
            className={cn(
              "flex shrink-0 items-start rounded-full px-2 py-0.5 text-xs font-normal whitespace-nowrap",
              published
                ? "bg-success-surface text-success"
                : "bg-muted text-muted-foreground",
            )}
          >
            {published ? t("statusPublished") : t("statusHidden")}
          </span>
          <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
            {record.profileName}
          </p>
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
  const counts = serviceCounts();

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
          <div className={cn("flex w-full shrink-0 items-center gap-3 overflow-clip px-6", COLUMN, "lg:py-6")}>
            <h1 className="min-w-px flex-1 text-2xl font-semibold text-foreground">
              {t("title")}
            </h1>
            <Link
              className="flex shrink-0 items-center gap-1 overflow-clip rounded-lg bg-primary px-3 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground lg:px-4 lg:py-2.5"
              href="/advisor/services/new"
            >
              <Plus className="size-4 shrink-0" />
              {t("create")}
            </Link>
          </div>
        </div>

        {/* Figma "Body" (1998:28360) — `contents` keeps the phone's single
            column; from `lg` the same two blocks become the grid. */}
        <div
          className={cn(
            "contents lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:pt-10 lg:pb-22",
            COLUMN,
          )}
        >
          <div className="flex w-full shrink-0 items-start gap-2.5 overflow-clip px-6 lg:col-start-2 lg:row-start-1 lg:flex-col lg:gap-2.5 lg:overflow-visible lg:px-0">
            <StatCard label={t("statTotal")} value={counts.total} />
            <StatCard label={t("statPublished")} value={counts.published} />
            <StatCard
              href="/availability/profiles"
              label={t("statProfiles")}
              value={counts.profiles}
            />
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 lg:col-start-1 lg:row-start-1 lg:px-0">
            {advisorServices().map((record) => (
              <ServiceCard key={record.serviceId} record={record} />
            ))}
          </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
