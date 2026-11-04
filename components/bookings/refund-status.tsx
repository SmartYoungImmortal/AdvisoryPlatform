"use client";

import { Circle, CircleCheckBig, CircleX, Clock3, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { BookingExit, RefundStage } from "@/components/bookings/booking-exit";
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
  useRefundLine,
  useSupportMail,
  type RefundTone,
} from "@/components/bookings/refund-sheet";
import { invoiceHref } from "@/components/payment/transactions-data";
import { Button } from "@/components/ui/button";
import type { ApiAdviseeInvoice, ApiBooking } from "@/lib/api/types";

type StatusExit = Extract<BookingExit, { kind: "status" | "refunded" }>;

/**
 * Who acts next decides the one button: none while the team or the refund is
 * awaited (the column's back link is the way out), the receipt once the money
 * is back, support after a no.
 */
const STAGE = {
  requested: { icon: Clock3, tone: "primary", main: null },
  reviewing: { icon: Clock3, tone: "primary", main: null },
  approved: { icon: Clock3, tone: "primary", main: null },
  refunded: { icon: CircleCheckBig, tone: "success", main: "receipt" },
  rejected: { icon: CircleX, tone: "destructive", main: "support" },
} as const satisfies Record<
  RefundStage,
  { readonly icon: LucideIcon; readonly tone: RefundTone; readonly main: "receipt" | "support" | null }
>;

type Mark = "done" | "current" | "next" | "rejected";

const MARK = {
  done: { icon: CircleCheckBig, tone: "success" },
  current: { icon: Clock3, tone: "primary" },
  next: { icon: Circle, tone: "muted" },
  rejected: { icon: CircleX, tone: "destructive" },
} as const satisfies Record<Mark, { readonly icon: LucideIcon; readonly tone: RefundTone }>;

type Step = { readonly mark: Mark; readonly title: string; readonly sub?: string };

/**
 * The refund step by stage. Nothing has moved until the invoice says
 * refunded: an approval only waits on the refund (API #86), and the bank's
 * timing is only spoken of once the money is sent.
 */
const REFUND_STEP = {
  requested: { mark: "next", sub: "progress.refundSub.confirm" },
  reviewing: { mark: "next", sub: "progress.refundSub.approve" },
  approved: { mark: "current", sub: "progress.refundSub.pending" },
  refunded: { mark: "done", sub: "progress.refundSub.done" },
} as const satisfies Record<Exclude<RefundStage, "rejected">, { readonly mark: Mark; readonly sub: string }>;

function useSteps(booking: ApiBooking, invoice: ApiAdviseeInvoice, exit: StatusExit): Step[] {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();
  const refundLine = useRefundLine(invoice);
  const stamp = (date: string | null) => (date === null ? undefined : when.stamp(date));

  const refundStep = (stage: keyof typeof REFUND_STEP): Step => ({
    mark: REFUND_STEP[stage].mark,
    title: refundLine(exit.refundSatang),
    sub: t(REFUND_STEP[stage].sub),
  });
  const cancelled: Step = { mark: "done", title: t("progress.cancellation.cancelled"), sub: stamp(booking.cancelledAt) };
  // With no request on record, the money's own trail: what was paid, the cancel if there was one, what came back.
  if (exit.kind === "refunded") {
    const paid: Step = { mark: "done", title: t("progress.paid", { amount: when.baht(invoice.amountSatang) }), sub: stamp(invoice.paidAt) };
    return booking.state === "CANCELLED" ? [paid, cancelled, refundStep("refunded")] : [paid, refundStep("refunded")];
  }

  const { refund, stage, type } = exit;
  const first: Step =
    type === "cancellation" ? cancelled : { mark: "done", title: t("progress.report.sent"), sub: stamp(refund.createdAt) };
  if (stage === "rejected") {
    return [
      first,
      { mark: "rejected", title: t("progress.rejected"), sub: stamp(refund.resolvedAt) },
      { mark: "next", title: t("progress.rejectedNext"), sub: t("progress.rejectedNextSub", { number: invoice.invoiceNumber }) },
    ];
  }

  // A ruling is shown only when there was one: a refund can reach the invoice while its request is still open.
  let ruling: Step | undefined;
  if (refund.status === "APPROVED") {
    ruling = { mark: "done", title: t("progress.approved"), sub: stamp(refund.resolvedAt) };
  } else if (stage !== "refunded") {
    ruling =
      type === "cancellation"
        ? { mark: "current", title: t("progress.cancellation.confirm"), sub: t("progress.cancellation.confirmSub") }
        : { mark: "current", title: t("progress.report.review"), sub: t("progress.report.reviewSub") };
  }
  return ruling ? [first, ruling, refundStep(stage)] : [first, refundStep(stage)];
}

function useStatusMeta(invoice: ApiAdviseeInvoice, stage: RefundStage): string {
  const t = useTranslations("bookingRefund");
  if (stage !== "approved") return t(`meta.status.${stage}`);
  return invoice.card ? t("meta.status.approved", { card: cardName(invoice.card) }) : t("meta.status.approvedNoCard");
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
  const meta = useStatusMeta(invoice, stage);
  const look = STAGE[stage];
  // Only a report the team is still reading takes more evidence.
  const evidenceFor = exit.kind === "status" && exit.type === "report" && stage === "reviewing" ? exit.refund.id : null;
  const progress = (
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
  );
  const head = (
    <RefundHead amount={when.baht(exit.refundSatang)} icon={look.icon} meta={meta} title={t(`stage.${stage}`)} tone={look.tone}>
      <RefundFacts booking={booking} invoice={invoice} />
    </RefundHead>
  );

  return (
    <>
      {exit.kind === "refunded" ? (
        // A finished refund with no request has too short a trail to stand beside the head: it runs under it.
        <RefundCard foot={progress} head={head} />
      ) : (
        <RefundCard
          head={head}
          // Under both cells: beside the steps it would leave the head's cell short by its own height.
          foot={
            evidenceFor ? (
              <RefundSection heading={t("attachments.label")}>
                <EvidencePicker refundId={evidenceFor} />
              </RefundSection>
            ) : undefined
          }
        >
          {progress}
        </RefundCard>
      )}

      <RefundActions help={look.main !== "support"} invoiceNumber={invoice.invoiceNumber}>
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
      </RefundActions>
    </>
  );
}
