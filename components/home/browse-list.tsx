"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { listAdvisors, listServices } from "@/lib/api/resources";
import type { ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { NeutralButton } from "@/components/mobile/buttons";
import { StatusPill } from "@/components/mobile/status-pill";
import { surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { cn } from "@/lib/utils";

/**
 * The browse list, read from the API.
 *
 * The first screen in this app to call it. Everything else still reads
 * `lib/catalogue/services`, which is a file of TypeScript constants.
 *
 * ## What the API can and cannot fill
 *
 * `PublicServiceResponseDto` carries `name`, `description`, `priceSatang`,
 * `durationMinutes`, `advisorId`, `screeningRequired` and the trial fields. It
 * does **not** carry a cover image, a rating, or a booked count, and the catalogue
 * cards elsewhere in the app show all three. So this card shows what exists and
 * nothing more: no placeholder cover, no invented score. A card that renders a
 * grey rectangle where a photograph belongs is worse than a card that does not
 * claim to have one.
 *
 * Covers need `service_images` populated — the seed deliberately leaves it empty,
 * because its `objectKey` is a SeaweedFS key the API presigns and the frontend's
 * images live in R2. Ratings need `GET /advisors/:advisorId/reviews/summary` per
 * card, which is a request per row; that wants either an aggregate on the service
 * response or a batch endpoint, and both are API work.
 *
 * ## Why two requests rather than one per card
 *
 * A service knows its `advisorId` and nothing else about the person. Resolving a
 * name per card would be N requests for one page, so the advisor page is fetched
 * once and joined here by id. It is the same trade the API's own repository makes
 * when it fetches a page of advisors and then their skills in one second query.
 */

/** Satang to a baht string. The API never divides; this is the only place that does. */
function baht(satang: number): string {
  return (satang / 100).toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function ServiceRow({
  service,
  advisorName,
}: {
  readonly service: ApiPublicService;
  readonly advisorName: string | undefined;
}) {
  const t = useTranslations("search");

  return (
    <Link
      className={cn(
        surfaceClass({ interactive: true }),
        "flex w-full shrink-0 flex-col items-start gap-2 p-4",
      )}
      href={`/service/${service.id}`}
    >
      <div className="flex w-full items-start gap-3">
        <p className="min-w-px flex-1 text-base font-semibold text-foreground">
          <ThaiText>{service.name}</ThaiText>
        </p>
        {service.screeningRequired ? (
          <StatusPill tone="info">{t("screeningRequired")}</StatusPill>
        ) : null}
      </div>

      {service.description ? (
        <p className="line-clamp-2 w-full text-sm font-normal text-muted-foreground">
          <ThaiText>{service.description}</ThaiText>
        </p>
      ) : null}

      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 pt-1">
        {/* The advisor's name arrives from the advisors page, joined by id.
            Undefined means they are not discoverable — suspended, or with nothing
            else published — so the row states the service without naming them
            rather than showing a blank. */}
        {advisorName ? (
          <span className="text-sm font-medium text-foreground">{advisorName}</span>
        ) : null}
        <span className="font-latin text-sm font-normal tabular-nums text-muted-foreground">
          {t("durationMinutes", { count: service.durationMinutes })}
        </span>
        <span className="font-latin ms-auto text-base font-semibold tabular-nums text-foreground">
          {t("priceBaht", { amount: baht(service.priceSatang) })}
        </span>
      </div>
    </Link>
  );
}

/** A row-shaped skeleton, so the list does not reflow when the data lands. */
function RowSkeleton() {
  return (
    <div
      className={cn(
        surfaceClass(),
        "flex w-full shrink-0 flex-col items-start gap-3 p-4",
      )}
    >
      <div className="h-5 w-3/5 rounded-md bg-muted" />
      <div className="h-4 w-full rounded-md bg-muted" />
      <div className="h-4 w-4/5 rounded-md bg-muted" />
    </div>
  );
}

export function BrowseList() {
  const t = useTranslations("search");

  const servicesFetcher = useCallback(
    (signal: AbortSignal) => listServices({ limit: 50 }, signal),
    [],
  );
  const advisorsFetcher = useCallback(
    (signal: AbortSignal) => listAdvisors({ limit: 100 }, signal),
    [],
  );

  const services = useResource<Paginated<ApiPublicService>>(
    "services?limit=50",
    servicesFetcher,
  );
  const advisors = useResource<Paginated<ApiPublicAdvisor>>(
    "advisors?limit=100",
    advisorsFetcher,
  );

  const nameById = new Map(
    (advisors.data?.items ?? []).map((advisor) => [advisor.id, advisor.displayName]),
  );

  if (services.loading) {
    return (
      <div className="flex w-full shrink-0 flex-col items-start gap-3">
        {[0, 1, 2, 3].map((index) => (
          <RowSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (services.error) {
    return (
      <div
        className={cn(
          surfaceClass(),
          "flex w-full shrink-0 flex-col items-start gap-3 p-5",
        )}
      >
        <p className="w-full text-base font-semibold text-foreground">
          {t("loadFailedTitle")}
        </p>
        {/* The API's own sentence, not a translated guess at what went wrong.
            It is the only thing that distinguishes "no session" from "the
            container is not running", and either way the reader needs to know
            which. */}
        <p className="w-full text-sm font-normal text-muted-foreground">
          {services.error.message}
        </p>
        <NeutralButton onClick={services.reload} size="sm">
          {t("retry")}
        </NeutralButton>
      </div>
    );
  }

  const items = services.data?.items ?? [];

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-3">
      <p className="w-full text-sm font-normal text-muted-foreground">
        {t("browseShowing", { count: items.length })}
      </p>
      {items.map((service) => (
        <ServiceRow
          advisorName={nameById.get(service.advisorId)}
          key={service.id}
          service={service}
        />
      ))}
    </div>
  );
}
