"use client";

import { useRouter } from "next/navigation";
import { CircleSlash, Gavel } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsPage } from "@/components/cms/layout";
import { CmsApiStatus, useApiStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_MAX_LIMIT,
  listOffPlatformFlags,
  listReports,
  resolveOffPlatformFlag,
  resolveReport,
  type AdminReport,
  type OffPlatformFlag,
  type OffPlatformFlagOutcome,
  type ReportOutcome,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatDateTime, timeValue } from "@/lib/mock-db/format";

export const REPORTS_KEY = "admin/reports";
export const FLAGS_KEY = "admin/off-platform-flags";

/**
 * The copy for the two outcomes both queues share.
 *
 * `cms.cases` has copy for dismiss, warn and suspend — the fixture's three
 * resolutions. The API's are `ACTIONED | DISMISSED` for a report and
 * `CONFIRMED | DISMISSED` for a flag: there is no warning outcome and no
 * suspend-the-account outcome on either route, so the warn and suspend buttons are
 * gone and the acted-on outcome borrows `cms.cases.tab.closed` ("ดำเนินการแล้ว"),
 * the console's own words for it. `cms.cases.action`, `cms.cases.actionTitle` and
 * `cms.cases.done.actioned` are the keys this wants; see the report.
 */
function useOutcomeCopy() {
  const t = useTranslations("cms.cases");
  const acted = t("tab.closed");
  return {
    acted: { label: acted, title: acted, description: undefined, success: acted },
    dismissed: {
      label: t("dismiss"),
      title: t("dismissTitle", { count: 1 }),
      description: t("dismissBody"),
      success: t("done.dismissed", { count: 1 }),
    },
  } as const;
}

/**
 * User reports, from `GET /api/v1/admin/reports`.
 *
 * `user_reports` has no rows yet, so this queue is legitimately empty.
 *
 * ## What a report carries
 *
 * `reason` is **free text**, not one of the six categories the fixture had — there
 * is no category column on `user_reports` — so the category badge and its filter are
 * gone. There is no message excerpt either, and `chatRoomId` is the only link to the
 * conversation. Both people are named by display name.
 *
 * ## Resolving
 *
 * `POST .../resolve` takes `outcome: "ACTIONED" | "DISMISSED"` and nothing else; the
 * body is whitelisted, so a note would be a 400. Suspending the reported account is
 * a separate ruling on `/admin/users`, which is where it now has to be done.
 *
 * 403 "Ruling requires an admin profile row for the signed-in admin" and 409
 * "Report has already been resolved" both surface as the API's own sentence.
 */
export function ReportsScreen() {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const copy = useOutcomeCopy();
  const statusOptions = useApiStatusOptions("report", ["OPEN", "ACTIONED", "DISMISSED"]);

  const fetcher = useCallback(
    (signal: AbortSignal) => listReports({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const reports = useResource<Paginated<AdminReport>>(
    `${REPORTS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(() => reports.data?.items ?? [], [reports.data]);

  const list = useCmsList(items, {
    searchText: (r) => `${r.reason} ${r.reportedDisplayName} ${r.reporterDisplayName}`,
    sortValue: (r) => timeValue(r.createdAt),
    filters: [{ key: "status", test: (r, values) => values.includes(r.status) }],
  });

  async function resolve(ids: readonly string[], outcome: ReportOutcome) {
    const which = outcome === "ACTIONED" ? copy.acted : copy.dismissed;
    const ok = await confirm({
      type: outcome === "ACTIONED" ? "warning" : "info",
      title: which.title,
      description: which.description,
      confirmLabel: which.label,
    });
    if (!ok) return;
    await rule({
      keyPrefix: REPORTS_KEY,
      onDone: list.clearSelection,
      run: ids.map((id) => () => resolveReport(id, outcome)),
      success: which.success,
      successColor: outcome === "ACTIONED" ? "warning" : "success",
    });
  }

  const columns: ReadonlyArray<CmsColumn<AdminReport>> = [
    {
      id: "reported",
      header: t("col.reported"),
      render: (r) => <CmsPerson account={{ name: r.reportedDisplayName }} />,
    },
    {
      id: "detail",
      header: t("col.detail"),
      render: (r) => <span className="block max-w-72 truncate">{r.reason}</span>,
    },
    {
      id: "reporter",
      header: t("col.reporter"),
      render: (r) => r.reporterDisplayName,
    },
    {
      id: "createdAt",
      header: t("col.createdAt"),
      sortable: true,
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (r) => <CmsApiStatus group="report" value={r.status} />,
    },
  ];

  if (reports.loading) {
    return (
      <CmsPage title={t("reportsTitle")}>
        <CmsTableSkeleton columns={columns.length} />
      </CmsPage>
    );
  }

  if (reports.error) {
    return (
      <CmsPage title={t("reportsTitle")}>
        <CmsApiError error={reports.error} onRetry={reports.reload} />
      </CmsPage>
    );
  }

  return (
    <CmsPage title={t("reportsTitle")}>
      <CmsTable
        bulkActions={(ids) => (
          <>
            <CmsButton
              color="neutral"
              icon={CircleSlash}
              onClick={() => resolve(ids, "DISMISSED")}
              variant="outline"
            >
              {t("dismissSelected", { count: ids.length })}
            </CmsButton>
            <CmsButton
              color="warning"
              icon={Gavel}
              onClick={() => resolve(ids, "ACTIONED")}
              variant="soft"
            >
              {copy.acted.label}
            </CmsButton>
          </>
        )}
        columns={columns}
        filters={
          <CmsFilterMenu
            label={t("allStatuses")}
            onChange={(values) => list.setFilter("status", values)}
            options={statusOptions}
            values={list.filterValues.status ?? []}
          />
        }
        list={list}
        onRowClick={(r) => router.push(`/admin/reports/review?id=${r.id}`)}
        searchPlaceholder={t("searchReports")}
      />
    </CmsPage>
  );
}

/**
 * Off-Platform Detection (CF-08), from `GET /api/v1/admin/off-platform-flags`.
 *
 * `off_platform_flags` has no rows yet, so this queue is legitimately empty.
 *
 * ## The screen is much smaller than it was, because the row is
 *
 * `OffPlatformFlagResponseDto` is `messageId`, `matchedPattern`, the status, the
 * reviewing admin and the penalty points. The flagged **message text is not on it**,
 * nor the sender, the recipient, the conversation or a risk level — so the
 * highlighted message, the sender column with its repeat count, the signal-type
 * badges, the risk column and filter, and the three risk summary cards are all gone.
 * There is nothing behind any of them. Showing them would need the message joined
 * onto the flag (for the text and the two people) and a severity on the row.
 *
 * `penaltyPointsApplied` can be sent with a confirmation, and is not: it needs a
 * number field, and `cms.cases` has no label for one, so a ruling applies the API's
 * default of zero. See the report.
 */
export function OffPlatformScreen() {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const copy = useOutcomeCopy();
  const statusOptions = useApiStatusOptions("flag", [
    "PENDING_REVIEW",
    "CONFIRMED",
    "DISMISSED",
  ]);

  const fetcher = useCallback(
    (signal: AbortSignal) => listOffPlatformFlags({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const flags = useResource<Paginated<OffPlatformFlag>>(
    `${FLAGS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(() => flags.data?.items ?? [], [flags.data]);

  const list = useCmsList(items, {
    searchText: (f) => `${f.matchedPattern} ${f.messageId}`,
    sortValue: (f) => timeValue(f.createdAt),
    filters: [{ key: "status", test: (f, values) => values.includes(f.status) }],
  });

  async function resolve(ids: readonly string[], outcome: OffPlatformFlagOutcome) {
    const which = outcome === "CONFIRMED" ? copy.acted : copy.dismissed;
    const ok = await confirm({
      type: outcome === "CONFIRMED" ? "danger" : "info",
      title: which.title,
      description: which.description,
      confirmLabel: which.label,
    });
    if (!ok) return;
    await rule({
      keyPrefix: FLAGS_KEY,
      onDone: list.clearSelection,
      run: ids.map((id) => () => resolveOffPlatformFlag(id, outcome)),
      success: which.success,
      successColor: outcome === "CONFIRMED" ? "warning" : "success",
    });
  }

  const columns: ReadonlyArray<CmsColumn<OffPlatformFlag>> = [
    {
      id: "signals",
      header: t("col.signals"),
      render: (f) => (
        <span className="font-latin font-medium text-highlighted">{f.matchedPattern}</span>
      ),
    },
    {
      id: "message",
      header: t("col.message"),
      render: (f) => <span className="font-latin">{f.messageId.slice(0, 8)}</span>,
    },
    {
      id: "detectedAt",
      header: t("col.detectedAt"),
      sortable: true,
      render: (f) => formatDateTime(f.createdAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (f) => (
        <span className="flex flex-col items-center gap-1">
          <CmsApiStatus group="flag" value={f.status} />
          {f.penaltyPointsApplied > 0 ? (
            <span className="font-latin text-xs text-destructive">
              +{f.penaltyPointsApplied}
            </span>
          ) : null}
        </span>
      ),
    },
  ];

  if (flags.loading) {
    return (
      <CmsPage title={t("flagsTitle")}>
        <CmsTableSkeleton columns={columns.length} />
      </CmsPage>
    );
  }

  if (flags.error) {
    return (
      <CmsPage title={t("flagsTitle")}>
        <CmsApiError error={flags.error} onRetry={flags.reload} />
      </CmsPage>
    );
  }

  return (
    <CmsPage title={t("flagsTitle")}>
      <CmsTable
        bulkActions={(ids) => (
          <>
            <CmsButton
              color="neutral"
              icon={CircleSlash}
              onClick={() => resolve(ids, "DISMISSED")}
              variant="outline"
            >
              {t("dismissSelected", { count: ids.length })}
            </CmsButton>
            <CmsButton
              color="error"
              icon={Gavel}
              onClick={() => resolve(ids, "CONFIRMED")}
            >
              {copy.acted.label}
            </CmsButton>
          </>
        )}
        columns={columns}
        filters={
          <CmsFilterMenu
            label={t("allStatuses")}
            onChange={(values) => list.setFilter("status", values)}
            options={statusOptions}
            values={list.filterValues.status ?? []}
          />
        }
        list={list}
        onRowClick={(f) => router.push(`/admin/off-platform/review?id=${f.id}`)}
        searchPlaceholder={t("searchFlags")}
      />
    </CmsPage>
  );
}
