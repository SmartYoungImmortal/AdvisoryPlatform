"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, CircleSlash, MessageSquareWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";

import { CmsBadge } from "@/components/cms/badge";
import { CmsAvatar, CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsTextarea } from "@/components/cms/fields";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import {
  HighlightedMessage,
  useCategoryLabels,
  useSignalLabels,
} from "@/components/cms/screens/cases";
import { resolveFlags, resolveReports, type Resolution } from "@/lib/mock-db/actions";
import { formatDate, formatDateTime } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Account, Decision, ReportStatus } from "@/lib/mock-db/types";

/**
 * The decision column both case pages share: a note, then dismiss, warn or
 * suspend. Suspending needs the note — it becomes the reason on the account.
 */
function CaseDecision({
  status,
  decision,
  subject,
  onResolve,
  info,
}: {
  readonly status: ReportStatus;
  readonly decision: Decision | null;
  readonly subject: Account | undefined;
  readonly onResolve: (resolution: Resolution, note: string | null) => void;
  readonly info: ReadonlyArray<{ readonly label: string; readonly by?: string; readonly at: string | null }>;
}) {
  const t = useTranslations("cms.cases");
  const person = useAccountLookup();
  const { confirm } = useCmsFeedback();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | undefined>();
  const open = status === "open";

  async function decide(resolution: Resolution) {
    if (resolution === "suspended" && !note.trim()) {
      setNoteError(t("noteRequired"));
      return;
    }
    const ok = await confirm({
      type: resolution === "suspended" ? "danger" : resolution === "warned" ? "warning" : "info",
      title:
        resolution === "suspended"
          ? t("suspendTitle", { count: 1 })
          : resolution === "warned"
            ? t("warnTitle", { count: 1 })
            : t("dismissTitle", { count: 1 }),
      description:
        resolution === "suspended"
          ? t("suspendOne", { name: subject?.name ?? "" })
          : resolution === "warned"
            ? t("warnBody")
            : t("dismissBody"),
      confirmLabel:
        resolution === "suspended" ? t("suspend") : resolution === "warned" ? t("warn") : t("dismiss"),
    });
    if (!ok) return;
    onResolve(resolution, note.trim() || null);
  }

  return (
    <CmsSidebarOptions
      actions={
        open ? (
          <>
            <CmsButton block color="error" icon={Ban} onClick={() => decide("suspended")} size="lg">
              {t("suspend30")}
            </CmsButton>
            <CmsButton block color="warning" icon={MessageSquareWarning} onClick={() => decide("warned")} size="lg" variant="soft">
              {t("warn")}
            </CmsButton>
            <CmsButton block color="neutral" icon={CircleSlash} onClick={() => decide("dismissed")} size="lg" variant="outline">
              {t("dismiss")}
            </CmsButton>
          </>
        ) : null
      }
      info={info}
    >
      {open ? (
        <CmsFormField error={noteError} help={t("noteHelp")} htmlFor={noteId} label={t("note")}>
          <CmsTextarea
            id={noteId}
            invalid={Boolean(noteError)}
            onChange={(event) => {
              setNote(event.target.value);
              setNoteError(undefined);
            }}
            rows={4}
            value={note}
          />
        </CmsFormField>
      ) : (
        <dl className="space-y-3">
          <CmsDataRow label={t("col.status")}>
            <CmsStatus group="report" value={status} />
          </CmsDataRow>
          {decision?.note ? <CmsDataRow label={t("note")}>{decision.note}</CmsDataRow> : null}
          {decision ? (
            <CmsDataRow label={t("decidedBy")}>{person(decision.by)?.name ?? decision.by}</CmsDataRow>
          ) : null}
        </dl>
      )}
    </CmsSidebarOptions>
  );
}

/** The account a case is about, with how it stands now. */
function SubjectCard({
  title,
  account,
  extra,
}: {
  readonly title: string;
  readonly account: Account | undefined;
  readonly extra?: ReactNode;
}) {
  const t = useTranslations("cms.cases");
  return (
    <CmsCard title={title}>
      {account ? (
        <dl className="space-y-3">
          <CmsDataRow label={t("account")}>
            <Link className="inline-block" href={`/admin/users/edit?id=${account.id}`}>
              <CmsPerson account={account} detail={account.email} />
            </Link>
          </CmsDataRow>
          <CmsDataRow label={t("col.status")}>
            <span className="flex flex-wrap items-center gap-2">
              <CmsStatus group="account" value={account.status} />
              {account.suspension?.until ? (
                <span className="text-xs font-normal text-muted-foreground">
                  {t("until", { date: formatDate(account.suspension.until) })}
                </span>
              ) : null}
            </span>
          </CmsDataRow>
          <CmsDataRow label={t("role")}>
            <CmsStatus group="role" value={account.role} />
          </CmsDataRow>
          {extra}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </CmsCard>
  );
}

export function ReportReviewScreen() {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const id = useRecordId();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { toast } = useCmsFeedback();
  const categoryLabels = useCategoryLabels();
  const report = useDatabase((db) => db.reports.find((r) => r.id === id));
  const reports = useDatabase((db) => db.reports);

  if (!report) {
    return (
      <CmsPage backHref="/admin/reports" title={t("reportTitle")}>
        <CmsMissing backHref="/admin/reports" />
      </CmsPage>
    );
  }
  const subject = person(report.reportedId);
  const prior = reports.filter((r) => r.reportedId === report.reportedId).length - 1;

  return (
    <CmsPage
      aside={
        <CaseDecision
          decision={report.decision}
          info={[
            { label: t("reportedAt"), by: person(report.reporterId)?.name, at: report.createdAt },
            ...(report.decision
              ? [{ label: t("decidedAt"), by: person(report.decision.by)?.name, at: report.decision.at }]
              : []),
          ]}
          onResolve={(resolution, note) => {
            resolveReports([report.id], resolution, note, actorId);
            toast({ title: t(`done.${resolution}`, { count: 1 }) });
            router.push("/admin/reports");
          }}
          status={report.status}
          subject={subject}
        />
      }
      backHref="/admin/reports"
      badge={<CmsStatus group="report" value={report.status} />}
      title={t("reportHeading", { id: report.id })}
    >
      <CmsCard title={t("caseTitle")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("col.category")}>
            <CmsBadge color="error">{categoryLabels[report.category]}</CmsBadge>
          </CmsDataRow>
          <CmsDataRow label={t("col.detail")}>
            <span className="font-normal text-foreground">{report.detail}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.createdAt")}>{formatDateTime(report.createdAt)}</CmsDataRow>
        </dl>
      </CmsCard>

      <CmsCard title={t("excerpt")}>
        <ul className="flex flex-col gap-2">
          {report.excerpt.map((line, index) => (
            <li className="flex items-end gap-2" key={index}>
              {subject ? <CmsAvatar account={subject} size="sm" /> : null}
              <span className="max-w-md rounded-lg rounded-bl-sm bg-muted px-3 py-2 text-sm text-highlighted">
                {line}
              </span>
            </li>
          ))}
        </ul>
      </CmsCard>

      <SubjectCard
        account={subject}
        extra={
          <CmsDataRow label={t("priorReports")}>
            <span className="font-latin">{prior}</span>
          </CmsDataRow>
        }
        title={t("reportedAccount")}
      />
      <SubjectCard account={person(report.reporterId)} title={t("reporterAccount")} />
    </CmsPage>
  );
}

export function FlagReviewScreen() {
  const t = useTranslations("cms.cases");
  const router = useRouter();
  const id = useRecordId();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { toast } = useCmsFeedback();
  const signalLabels = useSignalLabels();
  const flag = useDatabase((db) => db.offPlatformFlags.find((f) => f.id === id));
  const flags = useDatabase((db) => db.offPlatformFlags);

  if (!flag) {
    return (
      <CmsPage backHref="/admin/off-platform" title={t("flagTitle")}>
        <CmsMissing backHref="/admin/off-platform" />
      </CmsPage>
    );
  }
  const sender = person(flag.senderId);
  const history = flags.filter((f) => f.senderId === flag.senderId && f.id !== flag.id);

  return (
    <CmsPage
      aside={
        <CaseDecision
          decision={flag.decision}
          info={[
            { label: t("col.detectedAt"), at: flag.detectedAt },
            ...(flag.decision
              ? [{ label: t("decidedAt"), by: person(flag.decision.by)?.name, at: flag.decision.at }]
              : []),
          ]}
          onResolve={(resolution, note) => {
            resolveFlags([flag.id], resolution, note, actorId);
            toast({ title: t(`done.${resolution}`, { count: 1 }) });
            router.push("/admin/off-platform");
          }}
          status={flag.status}
          subject={sender}
        />
      }
      backHref="/admin/off-platform"
      badge={<CmsStatus group="risk" value={flag.risk} />}
      title={t("flagHeading", { id: flag.id })}
    >
      <CmsCard title={t("flaggedMessage")}>
        <p className="rounded-lg bg-muted p-4 text-base leading-relaxed text-highlighted">
          <HighlightedMessage flag={flag} />
        </p>
        <dl className="mt-4 space-y-3">
          <CmsDataRow label={t("col.signals")}>
            <span className="flex flex-wrap gap-2">
              {flag.matches.map((m) => (
                <CmsBadge key={`${m.signal}-${m.text}`} variant="outline">
                  {signalLabels[m.signal]} · <span className="font-latin">{m.text}</span>
                </CmsBadge>
              ))}
            </span>
          </CmsDataRow>
          <CmsDataRow label={t("conversation")}>
            <span className="font-latin">{flag.conversationId}</span>
          </CmsDataRow>
          <CmsDataRow label={t("recipient")}>{person(flag.recipientId)?.name ?? "—"}</CmsDataRow>
        </dl>
      </CmsCard>

      <SubjectCard
        account={sender}
        extra={
          <CmsDataRow label={t("otherFlags")}>
            <span className="font-latin">{history.length}</span>
          </CmsDataRow>
        }
        title={t("senderAccount")}
      />

      <CmsCard bodyClassName="p-0 sm:p-0" title={t("historyTitle")}>
        <ul className="divide-y divide-border">
          {history.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground sm:px-6">{t("noHistory")}</li>
          ) : (
            history.map((item) => (
              <li key={item.id}>
                <Link
                  className="flex items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-muted/50 sm:px-6"
                  href={`/admin/off-platform/review?id=${item.id}`}
                >
                  <span className="min-w-0 truncate">
                    <HighlightedMessage flag={item} />
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDateTime(item.detectedAt)}</span>
                    <CmsStatus group="report" value={item.status} />
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </CmsCard>
    </CmsPage>
  );
}
