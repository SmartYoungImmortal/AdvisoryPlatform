"use client";

import { useTranslations } from "next-intl";

import { CmsCardSkeleton } from "@/components/cms/api";
import { CmsDataRow } from "@/components/cms/sidebar-options";
import type { CaseContext, CaseMessage } from "@/lib/api/admin";
import { formatBaht, formatStamp } from "@/lib/mock-db/format";
import { cn } from "@/lib/utils";

/** `HH:mm` in Bangkok, for the end of a session printed after its start. */
const CLOCK = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

/**
 * The evidence beside a report or a flag, from `…/context`: the consultation the
 * conversation belongs to, then the conversation itself, advisor on the left and
 * advisee on the right, the flagged line marked. Rendered inside the case's one
 * card, under its own facts, so the page stays Nexus's single form card.
 */
export function CaseEvidence({
  context,
  loading,
}: {
  readonly context: CaseContext | undefined;
  readonly loading: boolean;
}) {
  const t = useTranslations("cms.cases.evidence");

  if (loading) {
    return (
      <div className="mt-6 border-t border-border pt-6">
        <CmsCardSkeleton rows={4} />
      </div>
    );
  }
  if (!context) return null;

  const { appointment, conversation, flaggedMessageId } = context;

  return (
    <>
      <section className="mt-6 border-t border-border pt-6">
        <h2 className="mb-4 text-sm font-semibold text-highlighted">{t("consultation")}</h2>
        {appointment ? (
          <dl className="space-y-4">
            <CmsDataRow label={t("service")}>{appointment.serviceName}</CmsDataRow>
            <CmsDataRow label={t("session")}>
              <span className="font-latin">
                {formatStamp(appointment.startTime)} - {CLOCK.format(new Date(appointment.endTime))}
              </span>
            </CmsDataRow>
            <CmsDataRow label={t("type")}>{t(`sessionType.${appointment.type}`)}</CmsDataRow>
            <CmsDataRow label={t("bookingStatus")}>{t(`state.${appointment.state}`)}</CmsDataRow>
            {appointment.cancelledAt ? (
              <CmsDataRow label={t("cancelledAt")}>
                <span className="font-latin">{formatStamp(appointment.cancelledAt)}</span>
              </CmsDataRow>
            ) : null}
            <CmsDataRow label={t("videoRoom")}>
              <span className="font-latin">{appointment.jitsiRoomName ?? "-"}</span>
            </CmsDataRow>
            <CmsDataRow label={t("payment")}>
              {appointment.invoiceAmountSatang === null ? (
                "-"
              ) : (
                <span className="font-latin">
                  {formatBaht(appointment.invoiceAmountSatang)}
                  {appointment.invoiceStatus
                    ? ` · ${t(`invoice.${appointment.invoiceStatus}`)}`
                    : ""}
                </span>
              )}
            </CmsDataRow>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noConsultation")}</p>
        )}
      </section>

      <section className="mt-6 border-t border-border pt-6">
        <h2 className="mb-4 text-sm font-semibold text-highlighted">
          {t("conversation", { count: conversation.length })}
        </h2>
        {conversation.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noConversation")}</p>
        ) : (
          <ol className="flex flex-col gap-3">
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
      </section>
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
    <li className={cn("flex max-w-[80%] flex-col gap-1", advisee && "items-end self-end")}>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{line.senderFullName || line.senderDisplayName}</span>
        <span className="font-latin">{formatStamp(line.createdAt)}</span>
      </span>
      <span
        className={cn(
          "rounded-lg px-3 py-2 text-sm text-highlighted",
          advisee ? "bg-action/10" : "bg-muted",
          flagged && "bg-destructive/10 ring-1 ring-destructive",
        )}
      >
        {line.message}
      </span>
      {flagged ? (
        <span className="text-xs font-medium text-destructive">{flaggedLabel}</span>
      ) : null}
    </li>
  );
}
