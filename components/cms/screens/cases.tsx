"use client";

import { useRouter } from "next/navigation";
import { Ban, CircleSlash, MessageSquareWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useMemo } from "react";

import { CmsBadge } from "@/components/cms/badge";
import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAccountLookup, useActorId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus, useStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { resolveFlags, resolveReports, type Resolution } from "@/lib/mock-db/actions";
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
    count: value === "open" ? rows.filter((r) => r.status === "open").length : undefined,
    alert: true,
  }));
  const tab = useQueryTab<CaseTab>(tabs);
  const filtered = useMemo(
    () =>
      tab === "all"
        ? rows
        : rows.filter((r) => (tab === "open" ? r.status === "open" : r.status !== "open")),
    [rows, tab],
  );
  return { tabs, rows: filtered };
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
 * Bulk resolutions shared by both desks. Suspending asks for the reason the
 * account will carry; the other two only confirm.
 */
function useResolve(apply: (ids: readonly string[], resolution: Resolution, note: string | null) => void) {
  const t = useTranslations("cms.cases");
  const { confirm, prompt, toast } = useCmsFeedback();
  return async (ids: readonly string[], resolution: Resolution, onDone: () => void) => {
    if (resolution === "suspended") {
      const note = await prompt({
        type: "danger",
        title: t("suspendTitle", { count: ids.length }),
        description: t("suspendBody"),
        inputLabel: t("reason"),
        placeholder: t("suspendPlaceholder"),
        confirmLabel: t("suspend"),
      });
      if (note === null) return;
      apply(ids, resolution, note);
    } else {
      const ok = await confirm({
        type: resolution === "warned" ? "warning" : "info",
        title: resolution === "warned" ? t("warnTitle", { count: ids.length }) : t("dismissTitle", { count: ids.length }),
        description: resolution === "warned" ? t("warnBody") : t("dismissBody"),
        confirmLabel: resolution === "warned" ? t("warn") : t("dismiss"),
      });
      if (!ok) return;
      apply(ids, resolution, null);
    }
    onDone();
    toast({
      color: resolution === "suspended" ? "warning" : "success",
      title: t(`done.${resolution}`, { count: ids.length }),
    });
  };
}

function CaseBulkActions({
  ids,
  onResolve,
}: {
  readonly ids: readonly string[];
  readonly onResolve: (resolution: Resolution) => void;
}) {
  const t = useTranslations("cms.cases");
  return (
    <>
      <CmsButton color="neutral" icon={CircleSlash} onClick={() => onResolve("dismissed")} variant="outline">
        {t("dismissSelected", { count: ids.length })}
      </CmsButton>
      <CmsButton color="warning" icon={MessageSquareWarning} onClick={() => onResolve("warned")} variant="soft">
        {t("warn")}
      </CmsButton>
      <CmsButton color="error" icon={Ban} onClick={() => onResolve("suspended")}>
        {t("suspend")}
      </CmsButton>
    </>
  );
}

/** User reports — the queue the reporter-facing form feeds. */
export function ReportsScreen() {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const actorId = useActorId();
  const person = useAccountLookup();
  const categoryLabels = useCategoryLabels();
  const reports = useDatabase((db) => db.reports);
  const { tabs, rows } = useCaseTabs(reports);
  const statusOptions = useStatusOptions("report");
  const resolve = useResolve((ids, resolution, note) => resolveReports(ids, resolution, note, actorId));

  const list = useCmsList(rows, {
    searchText: (r) =>
      `${r.id} ${r.detail} ${r.excerpt.join(" ")} ${person(r.reportedId)?.name ?? ""} ${person(r.reporterId)?.name ?? ""}`,
    sortValue: (r) => timeValue(r.createdAt),
    filters: [
      { key: "category", test: (r, values) => values.includes(r.category) },
      { key: "status", test: (r, values) => values.includes(r.status) },
    ],
  });

  const columns: ReadonlyArray<CmsColumn<UserReport>> = [
    {
      id: "category",
      header: t("col.category"),
      render: (r) => (
        <CmsBadge color={r.category === "off-platform" || r.category === "scam" ? "error" : "neutral"}>
          {categoryLabels[r.category]}
        </CmsBadge>
      ),
    },
    {
      id: "reported",
      header: t("col.reported"),
      render: (r) => <CmsPerson account={person(r.reportedId)} detail={person(r.reportedId)?.email} />,
    },
    {
      id: "detail",
      header: t("col.detail"),
      render: (r) => <span className="block max-w-72 truncate">{r.detail}</span>,
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
    <CmsPage title={t("reportsTitle")}>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        bulkActions={(ids) => (
          <CaseBulkActions ids={ids} onResolve={(resolution) => resolve(ids, resolution, list.clearSelection)} />
        )}
        columns={columns}
        filters={
          <>
            <CmsFilterMenu
              label={t("allCategories")}
              onChange={(values) => list.setFilter("category", values)}
              options={reportCategories.map((value) => ({ value, label: categoryLabels[value] }))}
              values={list.filterValues.category ?? []}
            />
            <CmsFilterMenu
              label={t("allStatuses")}
              onChange={(values) => list.setFilter("status", values)}
              options={statusOptions}
              values={list.filterValues.status ?? []}
            />
          </>
        }
        list={list}
        onRowClick={(r) => router.push(`/admin/reports/review?id=${r.id}`)}
        searchPlaceholder={t("searchReports")}
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
  const actorId = useActorId();
  const person = useAccountLookup();
  const signalLabels = useSignalLabels();
  const statusLabels = useStatusOptions("risk");
  const flags = useDatabase((db) => db.offPlatformFlags);
  const { tabs, rows } = useCaseTabs(flags);
  const resolve = useResolve((ids, resolution, note) => resolveFlags(ids, resolution, note, actorId));

  const open = flags.filter((f) => f.status === "open");
  const repeat = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of flags) counts.set(f.senderId, (counts.get(f.senderId) ?? 0) + 1);
    return counts;
  }, [flags]);

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
        <span className="block max-w-80 truncate text-foreground">
          <HighlightedMessage flag={f} />
        </span>
      ),
    },
    {
      id: "sender",
      header: t("col.sender"),
      render: (f) => (
        <CmsPerson
          account={person(f.senderId)}
          detail={t("flagCount", { count: repeat.get(f.senderId) ?? 0 })}
        />
      ),
    },
    {
      id: "signals",
      header: t("col.signals"),
      render: (f) => (
        <span className="flex flex-wrap gap-1">
          {f.matches.map((m) => (
            <CmsBadge key={`${m.signal}-${m.text}`} variant="outline">
              {signalLabels[m.signal]}
            </CmsBadge>
          ))}
        </span>
      ),
    },
    {
      id: "risk",
      header: t("col.risk"),
      sortable: true,
      render: (f) => <CmsStatus group="risk" value={f.risk} />,
    },
    { id: "detectedAt", header: t("col.detectedAt"), sortable: true, render: (f) => formatDateTime(f.detectedAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (f) => <CmsStatus group="report" value={f.status} />,
    },
  ];

  return (
    <CmsPage title={t("flagsTitle")}>
      <div className="grid gap-4 sm:grid-cols-3">
        {(["high", "medium", "low"] as const).map((risk) => (
          <div className="flex items-center justify-between rounded-lg bg-card p-4 ring-1 ring-border" key={risk}>
            <span className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{t("openAt")}</span>
              <CmsStatus group="risk" value={risk} />
            </span>
            <span className="font-latin text-3xl font-semibold text-highlighted">
              {open.filter((f) => f.risk === risk).length}
            </span>
          </div>
        ))}
      </div>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        bulkActions={(ids) => (
          <CaseBulkActions ids={ids} onResolve={(resolution) => resolve(ids, resolution, list.clearSelection)} />
        )}
        columns={columns}
        filters={
          <>
            <CmsFilterMenu
              label={t("allRisks")}
              onChange={(values) => list.setFilter("risk", values)}
              options={statusLabels}
              values={list.filterValues.risk ?? []}
            />
            <CmsFilterMenu
              label={t("allSignals")}
              onChange={(values) => list.setFilter("signal", values)}
              options={offPlatformSignals.map((value) => ({ value, label: signalLabels[value] }))}
              values={list.filterValues.signal ?? []}
            />
          </>
        }
        list={list}
        onRowClick={(f) => router.push(`/admin/off-platform/review?id=${f.id}`)}
        searchPlaceholder={t("searchFlags")}
      />
    </CmsPage>
  );
}
