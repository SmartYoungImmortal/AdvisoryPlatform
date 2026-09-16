import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { cn } from "@/lib/utils";
import {
  SLOT_MINUTES,
  advisorServices,
  serviceCounts,
  type AdvisorServiceRecord,
} from "@/lib/advisor-services";

/** Figma "Stats" — three equal counts on flat surfaces, no hairline. */
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
    <div className="flex min-w-px flex-1 flex-col items-center gap-0.5 overflow-clip rounded-[12px] bg-card py-3">
      <p className="font-latin text-base font-semibold text-foreground">
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
    <MobileScreen>
      <ScreenTopBar href="/advisor/profile" label={c("back")} />

      <ScreenBody className="gap-4 pb-6">
        <div className="flex w-full shrink-0 items-center gap-3 overflow-clip px-6">
          <h1 className="min-w-px flex-1 text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <Link
            className="flex shrink-0 items-center gap-1 overflow-clip rounded-lg bg-primary px-3 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground"
            href="/advisor/services/new"
          >
            <Plus className="size-4 shrink-0" />
            {t("create")}
          </Link>
        </div>

        <div className="flex w-full shrink-0 items-start gap-2.5 overflow-clip px-6">
          <StatCard label={t("statTotal")} value={counts.total} />
          <StatCard label={t("statPublished")} value={counts.published} />
          <StatCard
            href="/availability/profiles"
            label={t("statProfiles")}
            value={counts.profiles}
          />
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
          {advisorServices().map((record) => (
            <ServiceCard key={record.serviceId} record={record} />
          ))}
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}
