"use client";

import { CircleSlash, Flag, Gavel, Radar } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { useDashboardCounts } from "@/components/cms/dashboard-data";
import { useCmsFeedback } from "@/components/cms/feedback";
import { usePageTab } from "@/components/cms/hooks";
import { CmsPage, CmsPageTabs } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import { CmsStatus, useStatusLabel } from "@/components/cms/status";
import {
  CmsChips,
  CmsTable,
  countBy,
  dateColumn,
  statusColumn,
  type CmsColumn,
} from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_KEYS,
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
import { timeValue } from "@/lib/mock-db/format";

const REPORTS_KEY = ADMIN_KEYS.reports;
const FLAGS_KEY = ADMIN_KEYS.flags;
const BASE = "/admin/reports";
const TABS = ["reports", "flags"] as const;

/** Waiting first, then newest. */
function queueOrder<T extends { readonly createdAt: string }>(
  rows: readonly T[],
  waiting: (row: T) => boolean,
): readonly T[] {
  return [...rows].sort((a, b) => {
    const rank = Number(waiting(b)) - Number(waiting(a));
    return rank !== 0 ? rank : b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Cases to rule on: one desk, two tabs. A user's report
 * (`GET /api/v1/admin/reports`) and the scanner's off-platform flag
 * (`GET /api/v1/admin/off-platform-flags`, CF-08) used to be two sidebar
 * entries; both end in the same two outcomes — act on it or dismiss it — so
 * they are the two tabs of one page, `?tab=flags` for the second, each with
 * how many are still waiting.
 *
 * ## The outcomes
 *
 * `ACTIONED | DISMISSED` for a report and `CONFIRMED | DISMISSED` for a flag.
 * There is no warning outcome, no suspend-the-account outcome and no note on
 * either route — the body is whitelisted — so suspending the account behind a
 * case is a separate ruling on its user page.
 *
 * 403 "Ruling requires an admin profile row for the signed-in admin" and 409
 * "Report has already been resolved" both surface as the API's own sentence.
 */
export function CasesScreen() {
  const t = useTranslations("cms.cases");
  const tab = usePageTab(TABS);
  const counts = useDashboardCounts();

  return (
    <CmsPage
      tabs={
        <CmsPageTabs
          current={tab}
          label={t("title")}
          tabs={[
            { key: "reports", label: t("tab.reports"), href: BASE, count: counts.reports },
            { key: "flags", label: t("tab.flags"), href: `${BASE}?tab=flags`, count: counts.flags },
          ]}
        />
      }
      title={t("title")}
    >
      {tab === "reports" ? <ReportQueue /> : <FlagQueue />}
    </CmsPage>
  );
}

/**
 * User reports.
 *
 * `reason` is **free text** — there is no category column on `user_reports` — and
 * `chatRoomId` is the only link to the conversation, which the record page
 * reads through `…/context`. Both people are named by display name.
 */
function ReportQueue() {
  const t = useTranslations("cms.cases");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const fetcher = useCallback(
    (signal: AbortSignal) => listReports({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const reports = useResource<Paginated<AdminReport>>(
    `${REPORTS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(
    () => queueOrder(reports.data?.items ?? [], (r) => r.status === "OPEN"),
    [reports.data],
  );
  const count = useMemo(() => countBy(items, (r) => r.status), [items]);

  const list = useCmsList(items, {
    prefix: "r_",
    searchText: (r) => `${r.reason} ${r.reportedDisplayName} ${r.reporterDisplayName}`,
    sortValue: (r, id) => (id === "status" ? r.status : timeValue(r.createdAt)),
    filters: [{ key: "status", test: (r, values) => values.includes(r.status) }],
  });

  /** Only reports still open are ruled on — a resolved one would answer 409. */
  const openIds = (ids: readonly string[]) =>
    ids.filter((id) => items.find((r) => r.id === id)?.status === "OPEN");

  async function resolve(open: readonly string[], outcome: ReportOutcome) {
    const acted = outcome === "ACTIONED";
    const ok = await confirm({
      type: acted ? "warning" : "info",
      title: acted
        ? t("actionTitle", { count: open.length })
        : t("dismissTitle", { count: open.length }),
      description: acted ? t("actionBody") : t("dismissBody"),
      confirmLabel: acted ? t("action") : t("dismiss"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: REPORTS_KEY,
      onDone: list.clearSelection,
      run: open.map((id) => () => resolveReport(id, outcome)),
      success: acted
        ? t("done.actioned", { count: open.length })
        : t("done.dismissed", { count: open.length }),
    });
  }

  const columns: ReadonlyArray<CmsColumn<AdminReport>> = [
    {
      id: "reported",
      header: t("col.reported"),
      primary: true,
      render: (r) => accountName(r.reportedUserId) ?? r.reportedDisplayName,
    },
    {
      id: "detail",
      header: t("col.detail"),
      className: "text-muted-foreground",
      render: (r) => <span className="block max-w-80 truncate">{r.reason}</span>,
    },
    {
      id: "reporter",
      header: t("col.reporter"),
      render: (r) => accountName(r.reporterUserId) ?? r.reporterDisplayName,
    },
    statusColumn(t("col.status"), (r) => <CmsStatus group="report" value={r.status} />),
    dateColumn("createdAt", t("col.createdAt"), (r) => r.createdAt),
    {
      id: "reviewer",
      header: t("col.reviewer"),
      className: "text-muted-foreground",
      render: (r) => accountName(r.reviewedByAdminId) ?? "-",
    },
  ];

  if (reports.loading) return <CmsTableSkeleton columns={columns.length} />;
  if (reports.error) return <CmsApiError error={reports.error} onRetry={reports.reload} />;

  return (
    <CmsTable
      renderBulkActions={(ids) => {
        const open = openIds(ids);
        return open.length === 0 ? null : (
          <CaseBulkActions
            count={open.length}
            onResolve={(acted) => resolve(open, acted ? "ACTIONED" : "DISMISSED")}
          />
        );
      }}
      chips={
        <CmsChips
          label={t("col.status")}
          onChange={(value) => list.setFilter("status", value ? [value] : [])}
          options={[
            { value: "", label: tTable("all"), count: count("") },
            ...(["OPEN", "ACTIONED", "DISMISSED"] as const).map((value) => ({
              value,
              label: statusLabel("report", value),
              count: count(value),
            })),
          ]}
          value={list.filterValues.status?.[0] ?? ""}
        />
      }
      columns={columns}
      empty={{ icon: Flag, title: t("emptyReports"), body: t("emptyReportsBody") }}
      list={list}
      rowHref={(r) => `${BASE}/review?id=${r.id}`}
      searchPlaceholder={t("searchReports")}
    />
  );
}

/**
 * The scanner's flags.
 *
 * `OffPlatformFlagResponseDto` is `messageId`, `matchedPattern`, the status, the
 * reviewing admin and the penalty points; the message, the sender and the
 * conversation come from the record page's `…/context`. A ruling sends no
 * penalty points, so the API's default of zero applies.
 */
function FlagQueue() {
  const t = useTranslations("cms.cases");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const fetcher = useCallback(
    (signal: AbortSignal) => listOffPlatformFlags({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const flags = useResource<Paginated<OffPlatformFlag>>(
    `${FLAGS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(
    () => queueOrder(flags.data?.items ?? [], (f) => f.status === "PENDING_REVIEW"),
    [flags.data],
  );
  const count = useMemo(() => countBy(items, (f) => f.status), [items]);

  const list = useCmsList(items, {
    prefix: "f_",
    searchText: (f) => f.matchedPattern,
    sortValue: (f, id) => (id === "status" ? f.status : timeValue(f.createdAt)),
    filters: [{ key: "status", test: (f, values) => values.includes(f.status) }],
  });

  /** Only flags still waiting are ruled on — a resolved one would answer 409. */
  const openIds = (ids: readonly string[]) =>
    ids.filter((id) => items.find((f) => f.id === id)?.status === "PENDING_REVIEW");

  async function resolve(open: readonly string[], outcome: OffPlatformFlagOutcome) {
    const confirmed = outcome === "CONFIRMED";
    const ok = await confirm({
      type: confirmed ? "danger" : "info",
      title: confirmed
        ? t("confirmFlagTitle", { count: open.length })
        : t("dismissTitle", { count: open.length }),
      description: confirmed ? t("confirmFlagBody") : t("dismissBody"),
      confirmLabel: confirmed ? t("confirmFlag") : t("dismiss"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: FLAGS_KEY,
      onDone: list.clearSelection,
      run: open.map((id) => () => resolveOffPlatformFlag(id, outcome)),
      success: confirmed
        ? t("done.confirmed", { count: open.length })
        : t("done.dismissed", { count: open.length }),
    });
  }

  const columns: ReadonlyArray<CmsColumn<OffPlatformFlag>> = [
    {
      id: "signals",
      header: t("col.signals"),
      primary: true,
      className: "font-latin",
      render: (f) => f.matchedPattern,
    },
    {
      id: "penalty",
      header: t("col.penalty"),
      align: "end",
      className: "font-latin",
      render: (f) => f.penaltyPointsApplied,
    },
    statusColumn(t("col.status"), (f) => <CmsStatus group="flag" value={f.status} />),
    dateColumn("createdAt", t("col.detectedAt"), (f) => f.createdAt),
    {
      id: "reviewer",
      header: t("col.reviewer"),
      className: "text-muted-foreground",
      render: (f) => accountName(f.reviewedByAdminId) ?? "-",
    },
  ];

  if (flags.loading) return <CmsTableSkeleton columns={columns.length} />;
  if (flags.error) return <CmsApiError error={flags.error} onRetry={flags.reload} />;

  return (
    <CmsTable
      renderBulkActions={(ids) => {
        const open = openIds(ids);
        return open.length === 0 ? null : (
          <CaseBulkActions
            count={open.length}
            flag
            onResolve={(acted) => resolve(open, acted ? "CONFIRMED" : "DISMISSED")}
          />
        );
      }}
      chips={
        <CmsChips
          label={t("col.status")}
          onChange={(value) => list.setFilter("status", value ? [value] : [])}
          options={[
            { value: "", label: tTable("all"), count: count("") },
            ...(["PENDING_REVIEW", "CONFIRMED", "DISMISSED"] as const).map((value) => ({
              value,
              label: statusLabel("flag", value),
              count: count(value),
            })),
          ]}
          value={list.filterValues.status?.[0] ?? ""}
        />
      }
      columns={columns}
      empty={{ icon: Radar, title: t("emptyFlags"), body: t("emptyFlagsBody") }}
      list={list}
      rowHref={(f) => `${BASE}/flag?id=${f.id}`}
      searchPlaceholder={t("searchFlags")}
    />
  );
}

/** The selection strip's two outcomes: dismiss, and act on it (confirm, for a flag). */
function CaseBulkActions({
  count,
  flag = false,
  onResolve,
}: {
  /** How many of the selected rows are still waiting. */
  readonly count: number;
  readonly flag?: boolean;
  readonly onResolve: (acted: boolean) => void;
}) {
  const t = useTranslations("cms.cases");
  return (
    <>
      <CmsButton icon={CircleSlash} onClick={() => onResolve(false)} size="sm" variant="secondary">
        {t("dismissSelected", { count })}
      </CmsButton>
      <CmsButton
        icon={Gavel}
        onClick={() => onResolve(true)}
        size="sm"
        variant={flag ? "danger-soft" : "primary"}
      >
        {flag ? t("confirmFlagSelected", { count }) : t("actionSelected", { count })}
      </CmsButton>
    </>
  );
}
