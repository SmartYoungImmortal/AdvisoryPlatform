"use client";

import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { authPill } from "@/components/auth/auth-split";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { DESK_BOX, DESK_PILL, DeskPage } from "@/components/work/desk-page";
import { useResource } from "@/lib/api/use-resource";
import { listMyAdvisorServices, listMyAvailabilityProfiles, type AdvisorService } from "@/lib/advisor-services/api";
import { cn } from "@/lib/utils";

/** A placeholder's surface while the API answers, still for a reader who asks for less motion. */
const BONE = "animate-pulse bg-muted motion-reduce:animate-none";

/** The services as cards: two across on the phone, three from the portrait tablet. */
const GRID = "grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:gap-x-6 lg:gap-y-9";

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
              <Briefcase aria-hidden className="size-6" strokeWidth={1.5} />
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

/**
 * `/advisor/services`: everything the advisor sells. The figures (all, on
 * sale, availability profiles — the last one the way to them), then a row per
 * service, and the way to add one in the heading. All of it is
 * `GET /advisors/me/services` and the advisor's availability profiles.
 */
export function MyServicesScreen() {
  const t = useTranslations("advisorServices");
  const format = useFormatter();
  const services = useResource("advisors/me/services?page=1&limit=100", listMyAdvisorServices);
  const profiles = useResource("advisors/me/availability/profiles", listMyAvailabilityProfiles);
  const rows = services.data?.items ?? [];
  const ready = services.data !== undefined && profiles.data !== undefined;
  const figures = [
    { label: t("statTotal"), value: services.data?.total ?? 0 },
    { label: t("statPublished"), value: rows.filter((item) => item.isPublished).length },
    { label: t("statProfiles"), value: profiles.data?.length ?? 0, href: "/availability/profiles" },
  ];
  const failure = services.error ?? profiles.error;

  return (
    <DeskPage
      action={
        <Button className={cn(authPill(true), DESK_PILL)} nativeButton={false} render={<Link href="/advisor/services/new" />}>
          <Plus aria-hidden />
          {t("create")}
        </Button>
      }
      title={t("title")}
    >
      <div className="mt-5 flex flex-col gap-8 lg:mt-8 lg:gap-10">
        <dl className="flex w-full max-w-xl rounded-2xl border border-border py-1 md:w-fit lg:py-1.5">
          {figures.map((figure) => {
            const body = (
              <>
                <dt className="order-2 text-xs whitespace-nowrap text-muted-foreground md:text-sm lg:text-frame-label">
                  {figure.label}
                </dt>
                <dd className="order-1 font-latin text-xl leading-tight font-semibold text-foreground tabular-nums md:text-2xl lg:text-frame-figure">
                  {ready ? format.number(figure.value) : <span aria-hidden className={cn(BONE, "my-1 block h-6 w-8 rounded-md lg:h-8")} />}
                </dd>
              </>
            );
            const cell = "flex flex-1 flex-col items-center px-3 py-2 md:flex-none md:px-5 lg:px-6";
            return figure.href ? (
              <Link className={cn(cell, "rounded-xl outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50")} href={figure.href} key={figure.label}>
                {body}
              </Link>
            ) : (
              <div className={cell} key={figure.label}>
                {body}
              </div>
            );
          })}
        </dl>

        {failure ? (
          <ApiErrorCard
            error={failure}
            onRetry={() => {
              services.reload();
              profiles.reload();
            }}
            title={t("loadFailed")}
          />
        ) : !ready ? (
          <div aria-busy className={GRID}>
            <span className="sr-only">{t("loading")}</span>
            {[0, 1, 2].map((i) => (
              <div aria-hidden className="flex flex-col gap-2.5 lg:gap-3" key={i}>
                <span className={cn(BONE, "block aspect-[4/3] w-full rounded-2xl")} />
                <span className={cn(BONE, "h-4 w-2/3 rounded lg:h-4.5")} />
                <span className={cn(BONE, "h-3 w-1/3 rounded lg:h-4")} />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className={cn(DESK_BOX, "flex flex-col items-center gap-3 px-6 py-12 text-center lg:gap-5 lg:py-20")}>
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
              <Briefcase aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
            </span>
            <p className="text-sm text-balance text-muted-foreground lg:text-frame-meta">{t("empty")}</p>
          </div>
        ) : (
          <ul className={GRID}>
            {rows.map((record) => (
              <ServiceCard
                key={record.id}
                profileName={profiles.data?.find((profile) => profile.id === record.availabilityProfileId)?.name}
                record={record}
              />
            ))}
          </ul>
        )}
      </div>
    </DeskPage>
  );
}
