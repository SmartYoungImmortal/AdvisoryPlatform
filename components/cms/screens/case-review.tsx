"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleSlash, Gavel } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, type ReactNode } from "react";

import { CmsApiError, CmsCardSkeleton, useRuling } from "@/components/cms/api";
import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { FLAGS_KEY, REPORTS_KEY } from "@/components/cms/screens/cases";
import {
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsApiStatus } from "@/components/cms/status";
import {
  ADMIN_MAX_LIMIT,
  getReport,
  listOffPlatformFlags,
  resolveOffPlatformFlag,
  resolveReport,
  type AdminReport,
  type OffPlatformFlag,
  type OffPlatformFlagOutcome,
  type ReportOutcome,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatDateTime } from "@/lib/mock-db/format";

/**
 * The decision column both case pages share.
 *
 * Two buttons, not three: the API's outcomes are `ACTIONED | DISMISSED` for a report
 * and `CONFIRMED | DISMISSED` for a flag, and neither route has a warning outcome, a
 * suspend-the-account outcome or a note field — the body is whitelisted, so a note
 * would be rejected. The note textarea is gone with them, and suspending the account
 * behind a case is now a separate ruling on `/admin/users`.
 */
function CaseDecision({
  open,
  acted,
  onResolve,
  info,
  children,
}: {
  readonly open: boolean;
  /** The confirm/label copy for the acted-on outcome, which differs per queue. */
  readonly acted: { readonly label: string; readonly danger: boolean };
  readonly onResolve: (outcome: "ACTED" | "DISMISSED") => void;
  readonly info: ReadonlyArray<{
    readonly label: string;
    readonly by?: string;
    readonly at: string | null;
  }>;
  readonly children?: ReactNode;
}) {
  const t = useTranslations("cms.cases");
  return (
    <CmsSidebarOptions
      actions={
        open ? (
          <>
            <CmsButton
              block
              color={acted.danger ? "error" : "warning"}
              icon={Gavel}
              onClick={() => onResolve("ACTED")}
              size="lg"
            >
              {acted.label}
            </CmsButton>
            <CmsButton
              block
              color="neutral"
              icon={CircleSlash}
              onClick={() => onResolve("DISMISSED")}
              size="lg"
              variant="outline"
            >
              {t("dismiss")}
            </CmsButton>
          </>
        ) : null
      }
      info={info}
    >
      {children}
    </CmsSidebarOptions>
  );
}

/**
 * One report, from `GET /api/v1/admin/reports/:reportId`.
 *
 * `reason` is the whole of it: free text, no category, no message excerpt. The two
 * people are display names — there is no account status, role or prior-report count
 * on the row, and no route that counts a user's reports, so the two subject cards
 * that showed all of that are a name each now.
 */
export function ReportReviewScreen() {
  const t = useTranslations("cms.cases");
  const id = useRecordId();

  const fetcher = useCallback((signal: AbortSignal) => getReport(id, signal), [id]);
  const report = useResource<AdminReport>(`${REPORTS_KEY}/${id}`, fetcher);

  if (id === "") {
    return (
      <CmsPage backHref="/admin/reports" title={t("reportTitle")}>
        <CmsMissing backHref="/admin/reports" />
      </CmsPage>
    );
  }

  if (report.loading) {
    return (
      <CmsPage backHref="/admin/reports" title={t("reportTitle")}>
        <CmsCardSkeleton rows={3} />
      </CmsPage>
    );
  }

  if (report.error || !report.data) {
    return (
      <CmsPage backHref="/admin/reports" title={t("reportTitle")}>
        {report.error ? (
          <CmsApiError error={report.error} onRetry={report.reload} />
        ) : (
          <CmsMissing backHref="/admin/reports" />
        )}
      </CmsPage>
    );
  }

  return <ReportRecord key={report.data.id} report={report.data} />;
}

function ReportRecord({ report }: { readonly report: AdminReport }) {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const acted = t("tab.closed");

  async function decide(choice: "ACTED" | "DISMISSED") {
    const outcome: ReportOutcome = choice === "ACTED" ? "ACTIONED" : "DISMISSED";
    const ok = await confirm({
      type: choice === "ACTED" ? "warning" : "info",
      title: choice === "ACTED" ? acted : t("dismissTitle", { count: 1 }),
      description: choice === "ACTED" ? undefined : t("dismissBody"),
      confirmLabel: choice === "ACTED" ? acted : t("dismiss"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: REPORTS_KEY,
      run: [() => resolveReport(report.id, outcome)],
      success: choice === "ACTED" ? acted : t("done.dismissed", { count: 1 }),
      successColor: choice === "ACTED" ? "warning" : "success",
    });
    if (result.ok) router.push("/admin/reports");
  }

  return (
    <CmsPage
      aside={
        <CaseDecision
          acted={{ label: acted, danger: false }}
          info={[
            { label: t("reportedAt"), by: report.reporterDisplayName, at: report.createdAt },
            ...(report.resolvedAt
              ? [{ label: t("decidedAt"), at: report.resolvedAt }]
              : []),
          ]}
          onResolve={decide}
          open={report.status === "OPEN"}
        >
          <dl className="space-y-3">
            <CmsDataRow label={t("col.status")}>
              <CmsApiStatus group="report" value={report.status} />
            </CmsDataRow>
          </dl>
        </CaseDecision>
      }
      backHref="/admin/reports"
      badge={<CmsApiStatus group="report" value={report.status} />}
      title={t("reportHeading", { id: report.id.slice(0, 8) })}
    >
      <CmsCard title={t("caseTitle")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("col.detail")}>
            <span className="font-normal text-foreground">{report.reason}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.createdAt")}>
            {formatDateTime(report.createdAt)}
          </CmsDataRow>
          {report.chatRoomId ? (
            <CmsDataRow label={t("conversation")}>
              <span className="font-latin break-all">{report.chatRoomId}</span>
            </CmsDataRow>
          ) : null}
        </dl>
      </CmsCard>

      <CmsCard title={t("reportedAccount")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("account")}>
            <Link
              className="inline-block"
              href={`/admin/users/edit?id=${report.reportedUserId}`}
            >
              <CmsPerson account={{ name: report.reportedDisplayName }} />
            </Link>
          </CmsDataRow>
        </dl>
      </CmsCard>

      <CmsCard title={t("reporterAccount")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("account")}>
            <Link
              className="inline-block"
              href={`/admin/users/edit?id=${report.reporterUserId}`}
            >
              <CmsPerson account={{ name: report.reporterDisplayName }} />
            </Link>
          </CmsDataRow>
        </dl>
      </CmsCard>
    </CmsPage>
  );
}

/**
 * One off-platform flag.
 *
 * **There is no `GET /admin/off-platform-flags/:flagId`** — the controller has the
 * list and the resolve route and nothing else — so this reads the list and finds its
 * row in it. One request either way, and the alternative was leaving the route on
 * fixture data while its queue read the API, which is the one outcome worth avoiding.
 *
 * What the row carries is the message's id and the pattern that matched. The message
 * itself, the sender, the recipient and the conversation are not on it, so the
 * flagged text cannot be shown, let alone highlighted, and the sender's other flags
 * cannot be counted.
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
  const flag = useMemo(
    () => flags.data?.items.find((f) => f.id === id),
    [flags.data, id],
  );

  if (id === "") {
    return (
      <CmsPage backHref="/admin/off-platform" title={t("flagTitle")}>
        <CmsMissing backHref="/admin/off-platform" />
      </CmsPage>
    );
  }

  if (flags.loading) {
    return (
      <CmsPage backHref="/admin/off-platform" title={t("flagTitle")}>
        <CmsCardSkeleton rows={3} />
      </CmsPage>
    );
  }

  if (flags.error || !flag) {
    return (
      <CmsPage backHref="/admin/off-platform" title={t("flagTitle")}>
        {flags.error ? (
          <CmsApiError error={flags.error} onRetry={flags.reload} />
        ) : (
          <CmsMissing backHref="/admin/off-platform" />
        )}
      </CmsPage>
    );
  }

  return <FlagRecord flag={flag} key={flag.id} />;
}

function FlagRecord({ flag }: { readonly flag: OffPlatformFlag }) {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const acted = t("tab.closed");

  async function decide(choice: "ACTED" | "DISMISSED") {
    const outcome: OffPlatformFlagOutcome =
      choice === "ACTED" ? "CONFIRMED" : "DISMISSED";
    const ok = await confirm({
      type: choice === "ACTED" ? "danger" : "info",
      title: choice === "ACTED" ? acted : t("dismissTitle", { count: 1 }),
      description: choice === "ACTED" ? undefined : t("dismissBody"),
      confirmLabel: choice === "ACTED" ? acted : t("dismiss"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: FLAGS_KEY,
      // No penalty points: the field needs a labelled number input and
      // `cms.cases` has no copy for one, so the API's default of zero applies.
      run: [() => resolveOffPlatformFlag(flag.id, outcome)],
      success: choice === "ACTED" ? acted : t("done.dismissed", { count: 1 }),
      successColor: choice === "ACTED" ? "warning" : "success",
    });
    if (result.ok) router.push("/admin/off-platform");
  }

  return (
    <CmsPage
      aside={
        <CaseDecision
          acted={{ label: acted, danger: true }}
          info={[
            { label: t("col.detectedAt"), at: flag.createdAt },
            ...(flag.reviewedAt ? [{ label: t("decidedAt"), at: flag.reviewedAt }] : []),
          ]}
          onResolve={decide}
          open={flag.status === "PENDING_REVIEW"}
        >
          <dl className="space-y-3">
            <CmsDataRow label={t("col.status")}>
              <CmsApiStatus group="flag" value={flag.status} />
            </CmsDataRow>
          </dl>
        </CaseDecision>
      }
      backHref="/admin/off-platform"
      badge={<CmsApiStatus group="flag" value={flag.status} />}
      title={t("flagHeading", { id: flag.id.slice(0, 8) })}
    >
      <CmsCard title={t("flaggedMessage")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("col.signals")}>
            {/* The pattern the scanner matched. The message it matched in is not
                on the flag, so there is nothing to highlight it inside. */}
            <span className="font-latin break-all">{flag.matchedPattern}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.message")}>
            <span className="font-latin break-all">{flag.messageId}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.detectedAt")}>
            {formatDateTime(flag.createdAt)}
          </CmsDataRow>
        </dl>
      </CmsCard>
    </CmsPage>
  );
}
