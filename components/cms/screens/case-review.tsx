"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleSlash, Gavel } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsDetailSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { CmsSection } from "@/components/cms/card";
import { CaseEvidence } from "@/components/cms/case-evidence";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import {
  CmsDataList,
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  getFlagContext,
  getReport,
  getReportContext,
  listOffPlatformFlags,
  resolveOffPlatformFlag,
  resolveReport,
  type AdminReport,
  type CaseContext,
  type OffPlatformFlag,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";

const REPORTS_KEY = ADMIN_KEYS.reports;
const FLAGS_KEY = ADMIN_KEYS.flags;
const REPORTS_BACK = "/admin/reports";
const FLAGS_BACK = "/admin/reports?tab=flags";

/**
 * The two outcomes both case pages offer, in the column beside the case: act
 * on it (for a flag, confirm it) and dismiss it. Neither route takes a note —
 * the body is whitelisted — and neither suspends anyone, so suspending the
 * account behind a case is a ruling on its user page.
 */
function CaseActions({
  acted,
  danger,
  onResolve,
}: {
  readonly acted: string;
  readonly danger: boolean;
  readonly onResolve: (acted: boolean) => void;
}) {
  const t = useTranslations("cms.cases");
  return (
    <>
      <CmsButton
        block
        icon={Gavel}
        onClick={() => onResolve(true)}
        size="lg"
        variant={danger ? "danger" : "primary"}
      >
        {acted}
      </CmsButton>
      <CmsButton block icon={CircleSlash} onClick={() => onResolve(false)} size="lg" variant="secondary">
        {t("dismiss")}
      </CmsButton>
      <p className="text-xs text-muted-foreground">{t("suspendNote")}</p>
    </>
  );
}

/**
 * One report, from `GET /api/v1/admin/reports/:reportId`.
 *
 * `reason` is the whole of it: free text, no category, no message excerpt. The two
 * people are display names that link through to their accounts, where a
 * suspension is made.
 */
export function ReportReviewScreen() {
  const t = useTranslations("cms.cases");
  const id = useRecordId();

  const fetcher = useCallback((signal: AbortSignal) => getReport(id, signal), [id]);
  const report = useResource<AdminReport>(`${REPORTS_KEY}/${id}`, fetcher);
  const frame = { backHref: REPORTS_BACK, backLabel: t("tab.reports"), title: t("reportTitle") };

  if (id === "") {
    return (
      <CmsPage {...frame}>
        <CmsMissing backHref={REPORTS_BACK} />
      </CmsPage>
    );
  }

  if (report.loading) {
    return (
      <CmsPage {...frame}>
        <CmsDetailSkeleton rows={3} />
      </CmsPage>
    );
  }

  if (report.error || !report.data) {
    return (
      <CmsPage {...frame}>
        {report.error ? (
          <CmsApiError error={report.error} onRetry={report.reload} />
        ) : (
          <CmsMissing backHref={REPORTS_BACK} />
        )}
      </CmsPage>
    );
  }

  return <ReportRecord key={report.data.id} report={report.data} />;
}

function ReportRecord({ report }: { readonly report: AdminReport }) {
  const t = useTranslations("cms.cases");
  const accountName = useAccountName();
  const router = useRouter();
  const evidenceFetcher = useCallback(
    (signal: AbortSignal) => getReportContext(report.id, signal),
    [report.id],
  );
  const evidence = useResource<CaseContext>(`${REPORTS_KEY}/${report.id}/context`, evidenceFetcher);
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const reported = accountName(report.reportedUserId) ?? report.reportedDisplayName;
  const reporter = accountName(report.reporterUserId) ?? report.reporterDisplayName;

  async function decide(acted: boolean) {
    const ok = await confirm({
      type: acted ? "warning" : "info",
      title: acted ? t("actionTitle", { count: 1 }) : t("dismissTitle", { count: 1 }),
      description: acted ? t("actionBody") : t("dismissBody"),
      confirmLabel: acted ? t("action") : t("dismiss"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: REPORTS_KEY,
      run: [() => resolveReport(report.id, acted ? "ACTIONED" : "DISMISSED")],
      success: acted ? t("done.actioned", { count: 1 }) : t("done.dismissed", { count: 1 }),
    });
    if (result.ok) router.push(REPORTS_BACK);
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            report.status === "OPEN" ? (
              <CaseActions acted={t("action")} danger={false} onResolve={decide} />
            ) : undefined
          }
          info={[
            { label: t("reportedAt"), by: reporter, at: report.createdAt },
            ...(report.resolvedAt
              ? [
                  {
                    label: t("decidedAt"),
                    by: accountName(report.reviewedByAdminId),
                    at: report.resolvedAt,
                  },
                ]
              : []),
          ]}
        />
      }
      backHref={REPORTS_BACK}
      backLabel={t("tab.reports")}
      badge={<CmsStatus group="report" value={report.status} />}
      description={t("reportLine", { reporter, reported })}
      title={t("reportTitle")}
    >
      <CmsSection title={t("caseTitle")}>
        <CmsDataList>
          <CmsDataRow label={t("col.reported")}>
            <PersonLink id={report.reportedUserId} name={reported} />
          </CmsDataRow>
          <CmsDataRow label={t("col.reporter")}>
            <PersonLink id={report.reporterUserId} name={reporter} />
          </CmsDataRow>
          <CmsDataRow label={t("col.detail")}>{report.reason}</CmsDataRow>
        </CmsDataList>
      </CmsSection>
      <CaseEvidence context={evidence.data} loading={evidence.loading} />
    </CmsPage>
  );
}

function PersonLink({ id, name }: { readonly id: string; readonly name: string }) {
  return (
    <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/users/edit?id=${id}`}>
      {name}
    </Link>
  );
}

/**
 * One off-platform flag.
 *
 * **There is no `GET /admin/off-platform-flags/:flagId`** — the controller has the
 * list, the resolve route and `…/context` — so this reads the list and finds its
 * row in it. The flagged line, its sender and the conversation around it come
 * from the context, which marks the line.
 */
export function FlagReviewScreen() {
  const t = useTranslations("cms.cases");
  const id = useRecordId();

  const fetcher = useCallback(
    (signal: AbortSignal) => listOffPlatformFlags({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const flags = useResource<Paginated<OffPlatformFlag>>(
    `${FLAGS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const flag = useMemo(() => flags.data?.items.find((f) => f.id === id), [flags.data, id]);
  const frame = { backHref: FLAGS_BACK, backLabel: t("tab.flags"), title: t("flagTitle") };

  if (id === "") {
    return (
      <CmsPage {...frame}>
        <CmsMissing backHref={FLAGS_BACK} />
      </CmsPage>
    );
  }

  if (flags.loading) {
    return (
      <CmsPage {...frame}>
        <CmsDetailSkeleton rows={3} />
      </CmsPage>
    );
  }

  if (flags.error || !flag) {
    return (
      <CmsPage {...frame}>
        {flags.error ? (
          <CmsApiError error={flags.error} onRetry={flags.reload} />
        ) : (
          <CmsMissing backHref={FLAGS_BACK} />
        )}
      </CmsPage>
    );
  }

  return <FlagRecord flag={flag} key={flag.id} />;
}

function FlagRecord({ flag }: { readonly flag: OffPlatformFlag }) {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const accountName = useAccountName();
  const evidenceFetcher = useCallback(
    (signal: AbortSignal) => getFlagContext(flag.id, signal),
    [flag.id],
  );
  const evidence = useResource<CaseContext>(`${FLAGS_KEY}/${flag.id}/context`, evidenceFetcher);
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  async function decide(confirmed: boolean) {
    const ok = await confirm({
      type: confirmed ? "danger" : "info",
      title: confirmed ? t("confirmFlagTitle", { count: 1 }) : t("dismissTitle", { count: 1 }),
      description: confirmed ? t("confirmFlagBody") : t("dismissBody"),
      confirmLabel: confirmed ? t("confirmFlag") : t("dismiss"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: FLAGS_KEY,
      // No penalty points: the API's default of zero applies.
      run: [() => resolveOffPlatformFlag(flag.id, confirmed ? "CONFIRMED" : "DISMISSED")],
      success: confirmed ? t("done.confirmed", { count: 1 }) : t("done.dismissed", { count: 1 }),
    });
    if (result.ok) router.push(FLAGS_BACK);
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            flag.status === "PENDING_REVIEW" ? (
              <CaseActions acted={t("confirmFlag")} danger onResolve={decide} />
            ) : undefined
          }
          info={[
            { label: t("col.detectedAt"), by: t("system"), at: flag.createdAt },
            ...(flag.reviewedAt
              ? [
                  {
                    label: t("decidedAt"),
                    by: accountName(flag.reviewedByAdminId),
                    at: flag.reviewedAt,
                  },
                ]
              : []),
          ]}
        />
      }
      backHref={FLAGS_BACK}
      backLabel={t("tab.flags")}
      badge={<CmsStatus group="flag" value={flag.status} />}
      title={t("flagTitle")}
    >
      <CmsSection title={t("caseTitle")}>
        <CmsDataList>
          <CmsDataRow label={t("col.signals")}>
            {/* The pattern the scanner matched; the line it matched in is
                marked in the conversation below. */}
            <span className="font-latin">{flag.matchedPattern}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.penalty")}>
            <span className="font-latin">{flag.penaltyPointsApplied}</span>
          </CmsDataRow>
        </CmsDataList>
      </CmsSection>
      <CaseEvidence context={evidence.data} loading={evidence.loading} />
    </CmsPage>
  );
}
