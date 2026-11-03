"use client";

import { CircleSlash, Flag, Gavel, Radar } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import { CmsStatus, useStatusLabel } from "@/components/cms/status";
import {
  CmsChips,
  CmsRowGlyph,
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
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { timeValue } from "@/lib/mock-db/format";

const REPORTS_KEY = ADMIN_KEYS.reports;
const FLAGS_KEY = ADMIN_KEYS.flags;
const BASE = "/admin/reports";

/** Where a case stands, the same three ways for a report and a flag. */
type Stage = "OPEN" | "ACTIONED" | "DISMISSED";
const STAGES: readonly Stage[] = ["OPEN", "ACTIONED", "DISMISSED"];

/**
 * One case in the list, a user's report or the scanner's flag. `id` carries
 * which (`r:` or `f:`) so the two id spaces never meet in the selection.
 */
type CaseRow =
  | {
      readonly id: string;
      readonly kind: "report";
      readonly stage: Stage;
      readonly createdAt: string;
      readonly report: AdminReport;
    }
  | {
      readonly id: string;
      readonly kind: "flag";
      readonly stage: Stage;
      readonly createdAt: string;
      readonly flag: OffPlatformFlag;
    };

function reportStage(report: AdminReport): Stage {
  return report.status === "OPEN" ? "OPEN" : report.status;
}

function flagStage(flag: OffPlatformFlag): Stage {
  if (flag.status === "PENDING_REVIEW") return "OPEN";
  return flag.status === "CONFIRMED" ? "ACTIONED" : "DISMISSED";
}

/**
 * Cases to rule on, in one list: a user's report (`GET /api/v1/admin/reports`)
 * and the scanner's off-platform flag (`GET /api/v1/admin/off-platform-flags`,
 * CF-08) side by side, waiting first and then newest, the "source" column
 * saying which each is. Both end the same two ways — act on it or dismiss it —
 * so the capsules count the three stages across both, and the bulk actions
 * rule each selected case by its own route.
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

  return (
    <CmsPage full title={t("title")}>
      <CaseQueue />
    </CmsPage>
  );
}

function CaseQueue() {
  const t = useTranslations("cms.cases");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const reportFetcher = useCallback(
    (signal: AbortSignal) => listReports({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const flagFetcher = useCallback(
    (signal: AbortSignal) => listOffPlatformFlags({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const reports = useResource<Paginated<AdminReport>>(`${REPORTS_KEY}?limit=${ADMIN_MAX_LIMIT}`, reportFetcher);
  const flags = useResource<Paginated<OffPlatformFlag>>(`${FLAGS_KEY}?limit=${ADMIN_MAX_LIMIT}`, flagFetcher);

  const items = useMemo<readonly CaseRow[]>(() => {
    const rows: CaseRow[] = [
      ...(reports.data?.items ?? []).map((report) => ({
        id: `r:${report.id}`,
        kind: "report" as const,
        stage: reportStage(report),
        createdAt: report.createdAt,
        report,
      })),
      ...(flags.data?.items ?? []).map((flag) => ({
        id: `f:${flag.id}`,
        kind: "flag" as const,
        stage: flagStage(flag),
        createdAt: flag.createdAt,
        flag,
      })),
    ];
    // Waiting first, then newest.
    return rows.sort((a, b) => {
      const rank = Number(b.stage === "OPEN") - Number(a.stage === "OPEN");
      return rank !== 0 ? rank : b.createdAt.localeCompare(a.createdAt);
    });
  }, [reports.data, flags.data]);
  const count = useMemo(() => countBy(items, (c) => c.stage), [items]);

  const subject = (c: CaseRow) =>
    c.kind === "report" ? (accountName(c.report.reportedUserId) ?? c.report.reportedDisplayName) : t("flagSubject");
  const detail = (c: CaseRow) => (c.kind === "report" ? c.report.reason : c.flag.matchedPattern);
  const source = (c: CaseRow) =>
    c.kind === "report" ? (accountName(c.report.reporterUserId) ?? c.report.reporterDisplayName) : t("tab.flags");

  const list = useCmsList(items, {
    searchText: (c) => `${subject(c)} ${detail(c)} ${source(c)}`,
    sortValue: (c, id) => (id === "status" ? c.stage : timeValue(c.createdAt)),
    filters: [{ key: "status", test: (c, values) => values.includes(c.stage) }],
  });

  async function resolve(ids: readonly string[], acted: boolean) {
    // Only cases still waiting are ruled on — a resolved one would answer 409.
    const open = items.filter((c) => ids.includes(c.id) && c.stage === "OPEN");
    if (open.length === 0) return;
    const ok = await confirm({
      type: acted ? "warning" : "info",
      title: acted ? t("actionTitle", { count: open.length }) : t("dismissTitle", { count: open.length }),
      description: acted ? t("actionBody") : t("dismissBody"),
      confirmLabel: acted ? t("action") : t("dismiss"),
    });
    if (!ok) return;
    await rule({
      // Both lists hang under `admin/`, so one prefix reads both again.
      keyPrefix: "admin/",
      onDone: list.clearSelection,
      run: open.map((c) =>
        c.kind === "report"
          ? () => resolveReport(c.report.id, acted ? "ACTIONED" : "DISMISSED")
          : () => resolveOffPlatformFlag(c.flag.id, acted ? "CONFIRMED" : "DISMISSED"),
      ),
      success: acted ? t("done.actioned", { count: open.length }) : t("done.dismissed", { count: open.length }),
    });
  }

  const columns: ReadonlyArray<CmsColumn<CaseRow>> = [
    {
      id: "subject",
      header: t("col.reported"),
      primary: true,
      render: subject,
      sub: (c) => (
        <span className={c.kind === "flag" ? "block max-w-96 truncate font-latin" : "block max-w-96 truncate"}>
          {detail(c)}
        </span>
      ),
    },
    {
      id: "source",
      header: t("col.source"),
      render: (c) => (c.kind === "report" ? source(c) : <span className="text-muted-foreground">{source(c)}</span>),
    },
    statusColumn(t("col.status"), (c) =>
      c.kind === "report" ? (
        <CmsStatus group="report" value={c.report.status} />
      ) : (
        <CmsStatus group="flag" value={c.flag.status} />
      ),
    ),
    dateColumn("createdAt", t("col.createdAt"), (c) => c.createdAt),
    {
      id: "reviewer",
      header: t("col.reviewer"),
      className: "text-muted-foreground",
      render: (c) => accountName(c.kind === "report" ? c.report.reviewedByAdminId : c.flag.reviewedByAdminId) ?? "-",
    },
  ];

  if (reports.loading || flags.loading) return <CmsTableSkeleton columns={columns.length} />;
  const failed = reports.error ?? flags.error;
  if (failed) {
    return (
      <CmsApiError
        error={failed}
        onRetry={() => {
          reports.reload();
          flags.reload();
        }}
      />
    );
  }

  return (
    <CmsTable
      chips={
        <CmsChips
          label={t("col.status")}
          onChange={(value) => list.setFilter("status", value ? [value] : [])}
          options={[
            { value: "", label: tTable("all"), count: count("") },
            ...STAGES.map((value) => ({ value, label: statusLabel("report", value), count: count(value) })),
          ]}
          value={list.filterValues.status?.[0] ?? ""}
        />
      }
      columns={columns}
      empty={{ icon: Flag, title: t("emptyReports"), body: t("emptyReportsBody") }}
      leading={(c) => <CmsRowGlyph icon={c.kind === "report" ? Flag : Radar} />}
      list={list}
      renderBulkActions={(ids) => {
        const waiting = items.filter((c) => ids.includes(c.id) && c.stage === "OPEN").length;
        return waiting === 0 ? null : <CaseBulkActions count={waiting} onResolve={(acted) => resolve(ids, acted)} />;
      }}
      rowHref={(c) => (c.kind === "report" ? `${BASE}/review?id=${c.report.id}` : `${BASE}/flag?id=${c.flag.id}`)}
      searchPlaceholder={t("searchReports")}
    />
  );
}

/** The selection strip's two outcomes: dismiss, and act on it (a flag is confirmed). */
function CaseBulkActions({
  count,
  onResolve,
}: {
  /** How many of the selected rows are still waiting. */
  readonly count: number;
  readonly onResolve: (acted: boolean) => void;
}) {
  const t = useTranslations("cms.cases");
  return (
    <>
      <CmsButton icon={CircleSlash} onClick={() => onResolve(false)} size="sm" variant="secondary">
        {t("dismissSelected", { count })}
      </CmsButton>
      <CmsButton icon={Gavel} onClick={() => onResolve(true)} size="sm" variant="primary">
        {t("actionSelected", { count })}
      </CmsButton>
    </>
  );
}
