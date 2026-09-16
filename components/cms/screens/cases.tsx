"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, useMemo } from "react";

import { CmsBadge } from "@/components/cms/badge";
import { useAccountLookup } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus, useStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import {
  offPlatformSignals,
  reportCategories,
  type OffPlatformFlag,
  type OffPlatformSignal,
  type ReportCategory,
  type UserReport,
} from "@/lib/mock-db/types";

type CaseTab = "open" | "closed" | "all";

function useCaseTabs<T extends { readonly status: string }>(rows: readonly T[]) {
  const t = useTranslations("cms.cases");
  const tabs = (["open", "closed", "all"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
  }));
  const tab = useQueryTab<CaseTab>(tabs);
  const filtered = useMemo(
    () =>
      tab === "all"
        ? rows
        : rows.filter((r) => (tab === "open" ? r.status === "open" : r.status !== "open")),
    [rows, tab],
  );
  const open = rows.filter((r) => r.status === "open").length;
  return { tabs, rows: filtered, open };
}

/**
 * The waiting count, where cms-flex puts its max-count badge: beside the title,
 * `neutral` and `subtle`.
 */
function OpenBadge({ count }: { readonly count: number }) {
  const t = useTranslations("cms.cases");
  return (
    <CmsBadge className="font-latin" variant="subtle">
      {t("openBadge", { count })}
    </CmsBadge>
  );
}

export function useCategoryLabels(): Record<ReportCategory, string> {
  const t = useTranslations("cms.cases.category");
  return {
    "off-platform": t("off-platform"),
    scam: t("scam"),
    harassment: t("harassment"),
    spam: t("spam"),
    misrepresentation: t("misrepresentation"),
    other: t("other"),
  };
}

export function useSignalLabels(): Record<OffPlatformSignal, string> {
  const t = useTranslations("cms.cases.signal");
  return {
    phone: t("phone"),
    line: t("line"),
    bank: t("bank"),
    link: t("link"),
    email: t("email"),
  };
}

/**
 * User reports — the queue the reporter-facing form feeds. A case is resolved
 * on its own page, as a Nexus record is edited on its `[id]` page.
 */
export function ReportsScreen() {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const person = useAccountLookup();
  const categoryLabels = useCategoryLabels();
  const reports = useDatabase((db) => db.reports);
  const { tabs, rows, open } = useCaseTabs(reports);
  const statusOptions = useStatusOptions("report");

  const list = useCmsList(rows, {
    searchText: (r) =>
      `${r.id} ${r.detail} ${r.excerpt.join(" ")} ${person(r.reportedId)?.name ?? ""} ${person(r.reporterId)?.name ?? ""}`,
    sortValue: (r, id) => (id === "category" ? categoryLabels[r.category] : timeValue(r.createdAt)),
    filters: [
      { key: "category", test: (r, values) => values.includes(r.category) },
      { key: "status", test: (r, values) => values.includes(r.status) },
    ],
  });

  const columns: ReadonlyArray<CmsColumn<UserReport>> = [
    { id: "category", header: t("col.category"), sortable: true, render: (r) => categoryLabels[r.category] },
    { id: "reported", header: t("col.reported"), render: (r) => person(r.reportedId)?.name ?? "—" },
    {
      id: "detail",
      header: t("col.detail"),
      render: (r) => <span className="block max-w-80 truncate">{r.detail}</span>,
    },
    { id: "reporter", header: t("col.reporter"), render: (r) => person(r.reporterId)?.name ?? "—" },
    { id: "createdAt", header: t("col.createdAt"), sortable: true, render: (r) => formatDateTime(r.createdAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (r) => <CmsStatus group="report" value={r.status} />,
    },
  ];

  return (
    <CmsPage badge={<OpenBadge count={open} />} title={t("reportsTitle")}>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        columns={columns}
        extraFilters={
          <CmsFilterMenu
            className="w-56"
            label={t("allCategories")}
            onChange={(values) => list.setFilter("category", values)}
            options={reportCategories.map((value) => ({ value, label: categoryLabels[value] }))}
            values={list.filterValues.category ?? []}
          />
        }
        filters={
          <CmsFilterMenu
            className="w-36"
            label={t("allStatuses")}
            onChange={(values) => list.setFilter("status", values)}
            options={statusOptions}
            values={list.filterValues.status ?? []}
          />
        }
        list={list}
        onRowClick={(r) => router.push(`/admin/reports/review?id=${r.id}`)}
        searchPlaceholder={t("searchReports")}
        selectable={false}
      />
    </CmsPage>
  );
}

/** A message with each detected token marked, the way the review pages show it. */
export function HighlightedMessage({ flag }: { readonly flag: Pick<OffPlatformFlag, "message" | "matches"> }) {
  const parts: Array<{ text: string; hit: boolean }> = [];
  let rest = flag.message;
  const tokens = flag.matches.map((m) => m.text).filter(Boolean);
  while (rest.length > 0) {
    const found = tokens
      .map((token) => ({ token, index: rest.indexOf(token) }))
      .filter((f) => f.index >= 0)
      .sort((a, b) => a.index - b.index)[0];
    if (!found) {
      parts.push({ text: rest, hit: false });
      break;
    }
    if (found.index > 0) parts.push({ text: rest.slice(0, found.index), hit: false });
    parts.push({ text: found.token, hit: true });
    rest = rest.slice(found.index + found.token.length);
  }
  return (
    <>
      {parts.map((part, index) =>
        part.hit ? (
          <mark className="rounded-sm bg-destructive/15 px-0.5 font-latin text-destructive" key={index}>
            {part.text}
          </mark>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * Off-Platform Detection (CF-08): chat messages the scanner flagged for phone
 * numbers, LINE ids, bank accounts, outside links or emails — the ways a
 * booking gets moved off the platform and out of its protection.
 */
export function OffPlatformScreen() {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const person = useAccountLookup();
  const signalLabels = useSignalLabels();
  const riskOptions = useStatusOptions("risk");
  const flags = useDatabase((db) => db.offPlatformFlags);
  const { tabs, rows, open } = useCaseTabs(flags);

  const list = useCmsList(rows, {
    searchText: (f) => `${f.message} ${person(f.senderId)?.name ?? ""} ${f.conversationId}`,
    sortValue: (f, id) =>
      id === "risk" ? { low: 0, medium: 1, high: 2 }[f.risk] : timeValue(f.detectedAt),
    filters: [
      { key: "risk", test: (f, values) => values.includes(f.risk) },
      { key: "signal", test: (f, values) => f.matches.some((m) => values.includes(m.signal)) },
    ],
  });

  const columns: ReadonlyArray<CmsColumn<OffPlatformFlag>> = [
    {
      id: "message",
      header: t("col.message"),
      render: (f) => (
        <span className="block max-w-80 truncate">
          <HighlightedMessage flag={f} />
        </span>
      ),
    },
    { id: "sender", header: t("col.sender"), render: (f) => person(f.senderId)?.name ?? "—" },
    {
      id: "signals",
      header: t("col.signals"),
      render: (f) => [...new Set(f.matches.map((m) => signalLabels[m.signal]))].join(", "),
    },
    { id: "detectedAt", header: t("col.detectedAt"), sortable: true, render: (f) => formatDateTime(f.detectedAt) },
    {
      id: "risk",
      header: t("col.risk"),
      sortable: true,
      align: "center",
      render: (f) => <CmsStatus group="risk" value={f.risk} />,
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (f) => <CmsStatus group="report" value={f.status} />,
    },
  ];

  return (
    <CmsPage badge={<OpenBadge count={open} />} title={t("flagsTitle")}>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        columns={columns}
        extraFilters={
          <CmsFilterMenu
            className="w-44"
            label={t("allSignals")}
            onChange={(values) => list.setFilter("signal", values)}
            options={offPlatformSignals.map((value) => ({ value, label: signalLabels[value] }))}
            values={list.filterValues.signal ?? []}
          />
        }
        filters={
          <CmsFilterMenu
            className="w-44"
            label={t("allRisks")}
            onChange={(values) => list.setFilter("risk", values)}
            options={riskOptions}
            values={list.filterValues.risk ?? []}
          />
        }
        list={list}
        onRowClick={(f) => router.push(`/admin/off-platform/review?id=${f.id}`)}
        searchPlaceholder={t("searchFlags")}
        selectable={false}
      />
    </CmsPage>
  );
}
