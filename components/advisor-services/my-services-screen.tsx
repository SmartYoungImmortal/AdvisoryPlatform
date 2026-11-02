"use client";

import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { authPill } from "@/components/auth/auth-split";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { DESK_BOX, DESK_GLYPH, DESK_PILL, DESK_ROW, DeskPage } from "@/components/work/desk-page";
import { useResource } from "@/lib/api/use-resource";
import { listMyAdvisorServices, listMyAvailabilityProfiles, type AdvisorService } from "@/lib/advisor-services/api";
import { cn } from "@/lib/utils";

/** A placeholder's surface while the API answers, still for a reader who asks for less motion. */
const BONE = "animate-pulse bg-muted motion-reduce:animate-none";

/**
 * One service, the transactions row's shape: the glyph in a soft circle, the
 * name over its price, length and availability profile, and at the right
 * whether it is on sale. The whole row opens the service.
 */
function ServiceRow({ record, profileName }: { readonly record: AdvisorService; readonly profileName?: string }) {
  const t = useTranslations("advisorServices");
  const published = record.isPublished;

  return (
    <li>
      <Link className={DESK_ROW} href={`/advisor/services/view?serviceId=${encodeURIComponent(record.id)}`}>
        <span className={cn(DESK_GLYPH, !published && "text-muted-foreground")}>
          <Briefcase aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
          <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{record.name}</span>
          <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">
            {t("priceLine", { price: record.priceSatang / 100, minutes: record.durationMinutes })}
            {profileName ? ` · ${profileName}` : null}
          </span>
        </span>
        <span className={cn("shrink-0 pt-0.5 text-xs whitespace-nowrap lg:text-frame-label", published ? "text-success" : "text-muted-foreground")}>
          {published ? t("statusPublished") : t("statusHidden")}
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
          <div aria-busy className="flex flex-col">
            <span className="sr-only">{t("loading")}</span>
            {[0, 1, 2].map((i) => (
              <div aria-hidden className="flex items-start gap-3 py-2.5 lg:gap-5 lg:py-3.5" key={i}>
                <span className={cn(BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
                <span className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                  <span className={cn(BONE, "h-3.5 w-1/2 rounded lg:h-4.5")} />
                  <span className={cn(BONE, "h-3 w-1/3 rounded lg:h-4")} />
                </span>
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
          <ul className="flex flex-col">
            {rows.map((record) => (
              <ServiceRow
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
