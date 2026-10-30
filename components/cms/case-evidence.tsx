"use client";

import { MessagesSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { CmsDetailSkeleton } from "@/components/cms/api";
import { CmsEmpty, CmsSection } from "@/components/cms/card";
import { CmsDataList, CmsDataRow } from "@/components/cms/sidebar-options";
import type { CaseContext, CaseMessage } from "@/lib/api/admin";
import { formatBaht, formatDateTime } from "@/lib/mock-db/format";
import { cn } from "@/lib/utils";

/** `HH:mm` in Bangkok, for the end of a session printed after its start. */
const CLOCK = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

/**
 * The evidence beside a report, a flag or a refund, from `…/context`: the
 * consultation the conversation belongs to as label and value rows, then the
 * conversation itself, advisor on the left and advisee on the right, the
 * flagged line marked. Two parts of the record page, under its own facts.
 */
export function CaseEvidence({
  context,
  loading,
}: {
  readonly context: CaseContext | undefined;
  readonly loading: boolean;
}) {
  const t = useTranslations("cms.cases.evidence");

  if (loading) return <CmsDetailSkeleton rows={4} />;
  if (!context) return null;

  const { appointment, conversation, flaggedMessageId } = context;
  const invoiceWord = appointment?.invoiceStatus ? t(`invoice.${appointment.invoiceStatus}`) : null;

  return (
    <>
      <CmsSection title={t("consultation")}>
        {appointment ? (
          <CmsDataList>
            <CmsDataRow label={t("service")}>{appointment.serviceName}</CmsDataRow>
            <CmsDataRow label={t("session")}>
              {formatDateTime(appointment.startTime)} – {CLOCK.format(new Date(appointment.endTime))}
            </CmsDataRow>
            <CmsDataRow label={t("type")}>{t(`sessionType.${appointment.type}`)}</CmsDataRow>
            <CmsDataRow label={t("bookingStatus")}>{t(`state.${appointment.state}`)}</CmsDataRow>
            {appointment.cancelledAt ? (
              <CmsDataRow label={t("cancelledAt")}>{formatDateTime(appointment.cancelledAt)}</CmsDataRow>
            ) : null}
            <CmsDataRow label={t("videoRoom")}>
              <span className="font-latin">{appointment.jitsiRoomName ?? "-"}</span>
            </CmsDataRow>
            <CmsDataRow label={t("payment")}>
              {appointment.invoiceAmountSatang === null ? (
                "-"
              ) : (
                <>
                  <span className="font-latin">{formatBaht(appointment.invoiceAmountSatang)}</span>
                  {invoiceWord ? ` · ${invoiceWord}` : ""}
                </>
              )}
            </CmsDataRow>
          </CmsDataList>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noConsultation")}</p>
        )}
      </CmsSection>

      <CmsSection title={t("conversation", { count: conversation.length })}>
        {conversation.length === 0 ? (
          <CmsEmpty className="py-8" icon={MessagesSquare} title={t("noConversation")} />
        ) : (
          <ol className="flex flex-col gap-4 rounded-2xl border border-border p-4 md:p-5">
            {conversation.map((line) => (
              <Line
                advisee={line.senderUserId === appointment?.adviseeId}
                flagged={line.id === flaggedMessageId}
                flaggedLabel={t("flagged")}
                key={line.id}
                line={line}
              />
            ))}
          </ol>
        )}
      </CmsSection>
    </>
  );
}

function Line({
  line,
  advisee,
  flagged,
  flaggedLabel,
}: {
  readonly line: CaseMessage;
  readonly advisee: boolean;
  readonly flagged: boolean;
  readonly flaggedLabel: string;
}) {
  return (
    <li className={cn("flex max-w-[80%] flex-col gap-1", advisee ? "items-end self-end" : "items-start")}>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{line.senderFullName || line.senderDisplayName}</span>
        <span>{formatDateTime(line.createdAt)}</span>
      </span>
      <span
        className={cn(
          "rounded-2xl px-3.5 py-2 text-sm text-foreground",
          advisee ? "bg-action/10" : "bg-muted",
          flagged && "bg-destructive/10 ring-1 ring-destructive",
        )}
      >
        {line.message}
      </span>
      {flagged ? <span className="text-xs font-medium text-destructive">{flaggedLabel}</span> : null}
    </li>
  );
}
