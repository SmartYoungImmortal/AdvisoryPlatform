"use client";

import { Circle, CircleCheckBig, CircleX, Clock3, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { bookingPopupHref, type BookingExit, type RefundStage } from "@/components/bookings/booking-exit";
import { EvidencePicker, RefundAlert } from "@/components/bookings/refund-evidence";
import {
  cardName,
  RefundActions,
  RefundCard,
  RefundFacts,
  RefundHead,
  RefundList,
  RefundRow,
  RefundSection,
  refundPill,
  useRefundFormat,
  useSupportMail,
  type RefundTone,
} from "@/components/bookings/refund-sheet";
import { invoiceHref } from "@/components/payment/transactions-data";
import { Button } from "@/components/ui/button";
import type { ApiAdviseeInvoice, ApiBooking } from "@/lib/api/types";

type StatusExit = Extract<BookingExit, { kind: "status" | "refunded" }>;

/** Who acts next decides the main button: nobody once the money is back, support after a no. */
const STAGE = {
  refunding: { icon: Clock3, tone: "primary", main: "back" },
  reviewing: { icon: Clock3, tone: "primary", main: "back" },
  approved: { icon: Clock3, tone: "primary", main: "back" },
  refunded: { icon: CircleCheckBig, tone: "success", main: "receipt" },
  rejected: { icon: CircleX, tone: "destructive", main: "support" },
} as const satisfies Record<
  RefundStage,
  { readonly icon: LucideIcon; readonly tone: RefundTone; readonly main: "back" | "receipt" | "support" }
>;

type Mark = "done" | "current" | "next" | "rejected";

const MARK = {
  done: { icon: CircleCheckBig, tone: "success" },
  current: { icon: Clock3, tone: "primary" },
  next: { icon: Circle, tone: "muted" },
  rejected: { icon: CircleX, tone: "destructive" },
} as const satisfies Record<Mark, { readonly icon: LucideIcon; readonly tone: RefundTone }>;

type Step = { readonly mark: Mark; readonly title: string; readonly sub?: string };

/** Where a report's refund stands once it is not turned down. */
const REPORT_REFUND_MARK = {
  refunding: "next",
  reviewing: "next",
  approved: "current",
  refunded: "done",
} as const satisfies Record<Exclude<RefundStage, "rejected">, Mark>;

function useSteps(booking: ApiBooking, invoice: ApiAdviseeInvoice, exit: StatusExit): Step[] {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();
  const stamp = (date: string | null) => (date === null ? undefined : when.stamp(date));

  const arrive: Step = {
    mark: "done",
    title: invoice.card
      ? t("progress.cancellation.arrive", { card: cardName(invoice.card) })
      : t("progress.cancellation.arriveNoCard"),
    sub: t("progress.bankSub"),
  };
  if (exit.kind === "refunded") return [arrive];

  const { refund, stage } = exit;
  const first: Step =
    exit.type === "cancellation"
      ? { mark: "done", title: t("progress.cancellation.cancelled"), sub: stamp(booking.cancelledAt) }
      : { mark: "done", title: t("progress.report.sent"), sub: stamp(refund.createdAt) };
  if (stage === "rejected") {
    return [first, { mark: "rejected", title: t("progress.rejected"), sub: stamp(refund.resolvedAt) }];
  }

  if (exit.type === "cancellation") {
    const refunded = stage === "refunded";
    return [
      first,
      {
        mark: refunded ? "done" : "current",
        title: t("progress.cancellation.refund", { amount: when.baht(exit.refundSatang) }),
        sub: t("progress.cancellation.refundSub"),
      },
      { ...arrive, mark: refunded ? "done" : "next" },
    ];
  }

  const decided = stage === "approved" || stage === "refunded";
  return [
    first,
    decided
      ? { mark: "done", title: t("progress.approved"), sub: stamp(refund.resolvedAt) }
      : { mark: "current", title: t("progress.report.review"), sub: t("progress.report.reviewSub") },
    {
      mark: REPORT_REFUND_MARK[stage],
      title: invoice.card ? t("progress.report.refund") : t("progress.report.refundNoCard"),
      sub: t("progress.report.refundSub"),
    },
  ];
}

export function RefundStatusMode({
  booking,
  invoice,
  exit,
  notice,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly exit: StatusExit;
  readonly notice?: string | null;
}): ReactNode {
  const t = useTranslations("bookingRefund");
  const b = useTranslations("bookings");
  const tr = useTranslations("transactions");
  const when = useRefundFormat();
  const mail = useSupportMail(invoice.invoiceNumber);
  const steps = useSteps(booking, invoice, exit);

  const stage: RefundStage = exit.kind === "refunded" ? "refunded" : exit.stage;
  const look = STAGE[stage];
  const back = bookingPopupHref(booking.id);
  // Only a report the team is still reading takes more evidence.
  const evidenceFor = exit.kind === "status" && exit.type === "report" && stage === "reviewing" ? exit.refund.id : null;

  return (
    <>
      <RefundCard
        head={
          <RefundHead
            amount={when.baht(exit.refundSatang)}
            icon={look.icon}
            meta={t(`meta.status.${stage}`)}
            title={t(`stage.${stage}`)}
            tone={look.tone}
          >
            <RefundFacts booking={booking} invoice={invoice} />
          </RefundHead>
        }
      >
        <RefundSection heading={t("progress.heading")}>
          <RefundList ordered>
            {steps.map((step) => (
              <RefundRow
                current={step.mark === "current"}
                icon={MARK[step.mark].icon}
                key={step.title}
                sub={step.sub}
                title={step.title}
                tone={MARK[step.mark].tone}
              />
            ))}
          </RefundList>
        </RefundSection>
        {evidenceFor ? (
          <RefundSection heading={t("attachments.label")}>
            <EvidencePicker refundId={evidenceFor} />
          </RefundSection>
        ) : null}
      </RefundCard>

      <RefundActions invoiceNumber={invoice.invoiceNumber}>
        {notice ? <RefundAlert className="text-center">{notice}</RefundAlert> : null}
        {look.main === "receipt" ? (
          <Button className={refundPill("solid")} nativeButton={false} render={<Link href={invoiceHref(invoice.id)} />}>
            {b("viewReceipt")}
          </Button>
        ) : null}
        {look.main === "support" ? (
          <Button className={refundPill("solid")} nativeButton={false} render={<a href={mail} />}>
            {tr("contactSupport")}
          </Button>
        ) : null}
        {/* A refund on record with no request is the receipt's business alone (R9). */}
        {exit.kind === "refunded" ? null : (
          <Button
            className={refundPill(look.main === "back" ? "solid" : "outline")}
            nativeButton={false}
            render={<Link href={back} />}
            variant={look.main === "back" ? "default" : "outline"}
          >
            {t("actions.back")}
          </Button>
        )}
      </RefundActions>
    </>
  );
}
