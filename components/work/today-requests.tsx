"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, type ReactNode } from "react";

import { useElapsedLabel } from "@/components/mobile/live-state";
import { listScreeningRequests, screeningKeys, type ApiAdvisorScreeningRequest } from "@/components/screening/screening-data";
import { ApiErrorCard } from "@/components/service/parts";
import { DESK_ROW } from "@/components/work/desk-page";
import { DESK_BONE, DeskSection } from "@/components/work/desk-parts";
import { BoneLine, ERROR_CARD_LG, LIST_SECTION, SECTION_LINK } from "@/components/work/today-parts";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/** How many waiting requests the dashboard lists before it points at the requests page. */
const SHOWN = 3;

/** One waiting request, the desk's row: who in the soft circle over which service, and how long ago it came. */
function RequestRow({ request, elapsed }: {
  readonly request: ApiAdvisorScreeningRequest;
  readonly elapsed: (iso: string) => string;
}) {
  return (
    <li>
      <Link className={DESK_ROW} href={`/screening/review?requestId=${request.id}`}>
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground lg:size-12 lg:text-frame-body"
        >
          {request.adviseeDisplayName.trim().slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
          <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{request.adviseeDisplayName}</span>
          <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">{request.serviceName}</span>
        </span>
        <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground lg:text-frame-label">{elapsed(request.createdAt)}</span>
      </Link>
    </li>
  );
}

/** Two rows while the requests load, at the row's measure: the circle, its two lines, the time at the right. */
function RequestRowBones() {
  return (
    <ul aria-hidden className="flex flex-col">
      {[0, 1].map((row) => (
        <li className="flex items-start gap-3 py-2.5 lg:gap-5 lg:py-3.5" key={row}>
          <span className={cn(DESK_BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
            <BoneLine bone="h-3.5 w-1/2 lg:h-4.5" text="text-sm lg:text-frame-body" />
            <BoneLine bone="h-3 w-2/3 lg:h-4" text="text-xs lg:text-frame-meta" />
          </span>
          <BoneLine bone="h-3 w-12 lg:h-3.5 lg:w-16" text="text-xs lg:text-frame-label" />
        </li>
      ))}
    </ul>
  );
}

/** The section around the requests: its name, and the way to all of them at the right. */
function RequestsSection({ children }: { readonly children: ReactNode }) {
  const t = useTranslations("workDesk");
  return (
    <DeskSection
      action={
        <Link className={SECTION_LINK} href="/screening/requests">
          {t("seeAll")}
        </Link>
      }
      className={LIST_SECTION}
      id="work-requests"
      title={t("figPending")}
    >
      {children}
    </DeskSection>
  );
}

/** The requests section while the account loads: its heading over two rows of bones. */
export function RequestsPreviewBones() {
  return (
    <RequestsSection>
      <RequestRowBones />
    </RequestsSection>
  );
}

/**
 * "คำขอรอตอบ": the newest requests still waiting on the advisor's answer,
 * up to three, each the way to its answers; one muted line when none wait.
 * Read under the requests page's own key, so going there does not ask again.
 */
export function RequestsPreview({ now }: { readonly now: number }) {
  const t = useTranslations("workDesk");
  const elapsed = useElapsedLabel(now);
  const requests = useResource(
    screeningKeys.requests,
    useCallback((signal: AbortSignal) => listScreeningRequests({ limit: 100 }, signal), []),
  );

  let body: ReactNode;
  if (requests.error) {
    body = <ApiErrorCard className={ERROR_CARD_LG} error={requests.error} onRetry={requests.reload} title={t("requestsLoadFailed")} />;
  } else if (!requests.data) {
    body = <RequestRowBones />;
  } else {
    const waiting = requests.data.items.filter((request) => request.status === "PENDING").slice(0, SHOWN);
    body =
      waiting.length > 0 ? (
        <ul className="flex flex-col">
          {waiting.map((request) => (
            <RequestRow elapsed={elapsed} key={request.id} request={request} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("requestsEmpty")}</p>
      );
  }

  return <RequestsSection>{body}</RequestsSection>;
}
