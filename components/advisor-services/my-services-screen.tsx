"use client";

import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { authPill } from "@/components/auth/auth-split";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { DESK_PILL } from "@/components/work/desk-page";
import { DeskEmpty, DeskFilter } from "@/components/work/desk-parts";
import { WorkHub } from "@/components/work/work-hub";
import { useResource } from "@/lib/api/use-resource";
import { listMyAdvisorServices, listMyAvailabilityProfiles, type AdvisorService } from "@/lib/advisor-services/api";
import { cn } from "@/lib/utils";

/** A placeholder's surface while the API answers, still for a reader who asks for less motion. */
const BONE = "animate-pulse bg-muted motion-reduce:animate-none";

/** The services as cards: two across on the phone, three on the portrait tablet, four from `lg` as the search page has them. */
const GRID = "grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-9";

/**
 * One service as a card: its cover (or a quiet tile without one) with
 * whether it is on sale over its corner, the name under it, then its price
 * and length and the schedule it is booked against. The whole card opens the
 * service's editor.
 */
function ServiceCard({ record, profileName }: { readonly record: AdvisorService; readonly profileName?: string }) {
  const t = useTranslations("advisorServices");
  const published = record.isPublished;

  return (
    <li>
      <Link
        className="group flex flex-col gap-2.5 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:gap-3"
        href={`/advisor/services/view?serviceId=${encodeURIComponent(record.id)}`}
      >
        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
          {record.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read
            <img alt="" className={cn("size-full object-cover transition-opacity group-hover:opacity-90", !published && "opacity-70")} src={record.coverImage} />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <Package aria-hidden className="size-6" strokeWidth={1.5} />
            </span>
          )}
          <span
            className={cn(
              "absolute top-2.5 left-2.5 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium lg:top-3 lg:left-3 lg:px-3 lg:text-frame-label",
              published ? "text-success" : "text-muted-foreground",
            )}
          >
            {published ? t("statusPublished") : t("statusHidden")}
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 px-0.5 lg:gap-1">
          <span className="line-clamp-2 text-base font-medium text-foreground lg:text-frame-body">{record.name}</span>
          <span className="truncate text-sm text-muted-foreground lg:text-frame-meta">
            {t("priceLine", { price: record.priceSatang / 100, minutes: record.durationMinutes })}
            {profileName ? ` · ${profileName}` : null}
          </span>
        </span>
      </Link>
    </li>
  );
}

type Shown = "all" | "onSale" | "hidden";

/**
 * `/advisor/services`: everything the advisor sells, as the transactions page
 * lays out its history — the capsules first (all, on sale, hidden, each with
 * how many), then the services as cards, and the way to add one in the
 * band. All of it is `GET /advisors/me/services` and the advisor's
 * availability profiles (each card names its schedule).
 */
export function MyServicesScreen() {
  const t = useTranslations("advisorServices");
  const services = useResource("advisors/me/services?page=1&limit=100", listMyAdvisorServices);
  const profiles = useResource("advisors/me/availability/profiles", listMyAvailabilityProfiles);
  const [shown, setShown] = useState<Shown>("all");
  const rows = services.data?.items ?? [];
  const ready = services.data !== undefined && profiles.data !== undefined;
  const onSale = rows.filter((item) => item.isPublished);
  const visible = shown === "all" ? rows : shown === "onSale" ? onSale : rows.filter((item) => !item.isPublished);
  const failure = services.error ?? profiles.error;

  return (
    <WorkHub
      action={
        <Button className={cn(authPill(true), DESK_PILL)} nativeButton={false} render={<Link href="/advisor/services/new" />}>
          <Plus aria-hidden />
          {t("create")}
        </Button>
      }
      tab="services"
    >
      {failure ? (
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard
            error={failure}
            onRetry={() => {
              services.reload();
              profiles.reload();
            }}
            title={t("loadFailed")}
          />
        </div>
      ) : !ready ? (
        <div aria-busy className="flex flex-col">
          <span className="sr-only">{t("loading")}</span>
          <div aria-hidden className="mt-5 flex gap-2 lg:mt-8 lg:gap-3">
            {["w-20 lg:w-24", "w-28 lg:w-34", "w-24 lg:w-28"].map((width) => (
              <span className={cn(BONE, "h-9 shrink-0 rounded-full lg:h-12", width)} key={width} />
            ))}
          </div>
          <div className={cn(GRID, "mt-6 lg:mt-8")}>
            {[0, 1, 2].map((i) => (
              <div aria-hidden className="flex flex-col gap-2.5 lg:gap-3" key={i}>
                <span className={cn(BONE, "block aspect-[4/3] w-full rounded-2xl")} />
                <span className={cn(BONE, "h-4 w-2/3 rounded lg:h-4.5")} />
                <span className={cn(BONE, "h-3 w-1/3 rounded lg:h-4")} />
              </div>
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <DeskEmpty action={{ label: t("create"), href: "/advisor/services/new" }} body={t("emptyBody")} icon={Package} title={t("empty")} />
      ) : (
        <>
          <DeskFilter
            label={t("filterLabel")}
            onChange={setShown}
            options={[
              { key: "all", label: t("filterAll"), note: rows.length },
              { key: "onSale", label: t("statusPublished"), note: onSale.length },
              { key: "hidden", label: t("statusHidden"), note: rows.length - onSale.length },
            ]}
            value={shown}
          />
          {visible.length === 0 ? (
            <p className="pt-8 text-sm text-muted-foreground lg:pt-12 lg:text-frame-body">{t("filteredEmpty")}</p>
          ) : (
            <ul className={cn(GRID, "mt-6 lg:mt-8")}>
              {visible.map((record) => (
                <ServiceCard
                  key={record.id}
                  profileName={profiles.data?.find((profile) => profile.id === record.availabilityProfileId)?.name}
                  record={record}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </WorkHub>
  );
}
