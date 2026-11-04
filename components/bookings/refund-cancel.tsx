"use client";

import { Circle, CircleCheckBig, CircleX, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { AUTH_LINK } from "@/components/auth/auth-split";
import { bookingPopupHref, type BookingExit, type RefundShare } from "@/components/bookings/booking-exit";
import { cancelThenRefund, openRefundOnce, type CancelRefundResult } from "@/components/bookings/refund-actions";
import {
  cardName,
  RefundActions,
  RefundBox,
  RefundCard,
  RefundFacts,
  RefundHead,
  RefundList,
  RefundRow,
  RefundSection,
  refundPill,
  useRefundFormat,
} from "@/components/bookings/refund-sheet";
import { StatusPill } from "@/components/mobile/status-pill";
import { Button } from "@/components/ui/button";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type NotCancelled = Extract<CancelRefundResult, { kind: "notCancelled" }>["outcome"];

/**
 * Why the cancel did not stand, in the advisee's words. After `uncertain` the
 * booking may already be off, and after `signIn` nothing can be checked, so
 * those two keep the button locked as the booking popup does.
 */
const REFUSED = {
  retry: { key: "bookingRefund.errors.cancelFailed", locks: false },
  changed: { key: "bookings.cancellationChanged", locks: false },
  unavailable: { key: "bookings.cancellationUnavailable", locks: false },
  signIn: { key: "bookings.cancellationSignIn", locks: true },
  uncertain: { key: "bookings.cancellationUncertain", locks: true },
} as const satisfies Record<NotCancelled, { readonly key: string; readonly locks: boolean }>;

type CancelAttempt =
  | { readonly kind: "ready" }
  | { readonly kind: "working" }
  | { readonly kind: "refused"; readonly outcome: NotCancelled };

type ClaimAttempt = "ready" | "working" | "failed";

const CLAIM_META = { full: "meta.claimFull", half: "meta.claimHalf" } as const satisfies Record<RefundShare, string>;

const TERMS_LINK = cn(
  AUTH_LINK,
  "inline-flex min-h-11 items-center rounded-sm text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-label",
);

type Owed = { readonly share: RefundShare; readonly refundSatang: number };

function OwedFacts({
  booking,
  invoice,
  owed,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly owed: Owed;
}) {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();

  return (
    <>
      <RefundFacts booking={booking} invoice={invoice} />
      {owed.share === "half" ? (
        <RefundBox
          heading={t("box.heading")}
          lines={[
            { label: t("box.service"), value: when.baht(owed.refundSatang) },
            { label: t("box.fee"), value: when.baht(0) },
          ]}
          total={{ label: t("box.total"), value: when.baht(owed.refundSatang) }}
        />
      ) : null}
    </>
  );
}

function Alert({ text }: { readonly text: string | null | undefined }) {
  if (!text) return null;
  return (
    <p className="text-center text-sm text-destructive lg:text-frame-meta" role="alert">
      {text}
    </p>
  );
}

export function CancelRefundMode({
  booking,
  invoice,
  exit,
  onOpened,
  onCancelledOnly,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly exit: Extract<BookingExit, { kind: "cancelRefund" }>;
  readonly onOpened: (refund: ApiRefundCase) => void;
  readonly onCancelledOnly: () => void;
}) {
  const t = useTranslations("bookingRefund");
  const words = useTranslations();
  const when = useRefundFormat();
  const [attempt, setAttempt] = useState<CancelAttempt>({ kind: "ready" });
  const pressed = useRef(false);

  const amount = when.baht(exit.refundSatang);
  const refusal = attempt.kind === "refused" ? REFUSED[attempt.outcome] : undefined;
  const working = attempt.kind === "working";
  const rows = [
    {
      id: "full",
      icon: RotateCcw,
      title: t("policy.full.when", { date: when.deadline(exit.fullUntil) }),
      sub: t("policy.full.what"),
    },
    {
      id: "half",
      icon: RotateCcw,
      title: t("policy.half.when", { from: when.short(exit.fullUntil), to: when.short(exit.startsAt) }),
      sub: t("policy.half.what"),
    },
    {
      id: "started",
      icon: CircleX,
      title: t("policy.started.when", { date: when.short(exit.startsAt) }),
      sub: t("policy.started.what"),
    },
  ] as const;

  async function confirm() {
    if (pressed.current) return;
    pressed.current = true;
    setAttempt({ kind: "working" });
    const result = await cancelThenRefund(booking.id, invoice.id, t(`ruleLine.${exit.share}`, { amount }));
    if (result.kind === "opened") {
      onOpened(result.refund);
    } else if (result.kind === "cancelledOnly") {
      onCancelledOnly();
    } else {
      pressed.current = REFUSED[result.outcome].locks;
      setAttempt({ kind: "refused", outcome: result.outcome });
    }
  }

  return (
    <>
      <RefundCard
        head={
          <RefundHead
            amount={amount}
            icon={RotateCcw}
            meta={t("meta.cancel")}
            title={t(exit.share === "full" ? "head.cancelFull" : "head.cancelHalf")}
            tone="primary"
          >
            <OwedFacts booking={booking} invoice={invoice} owed={exit} />
          </RefundHead>
        }
      >
        <RefundSection heading={t("policy.heading")}>
          <RefundList>
            {rows.map((row) => {
              const current = row.id === exit.share;
              return (
                <RefundRow
                  current={current}
                  icon={row.icon}
                  key={row.id}
                  sub={row.sub}
                  title={row.title}
                  tone={current ? "primary" : "muted"}
                  trailing={current ? <StatusPill tone="accent">{t("policy.now")}</StatusPill> : undefined}
                />
              );
            })}
          </RefundList>
          <Link className={TERMS_LINK} href="/terms#cancellation">
            {t("policy.termsLink")}
          </Link>
        </RefundSection>
      </RefundCard>
      <RefundActions invoiceNumber={invoice.invoiceNumber}>
        <Alert text={refusal ? words(refusal.key) : undefined} />
        <p className="text-center text-xs text-muted-foreground lg:text-frame-label">{t("policy.final")}</p>
        <Button
          aria-busy={working || undefined}
          className={refundPill("danger")}
          disabled={working || refusal?.locks === true}
          onClick={() => void confirm()}
          type="button"
        >
          {working ? t("busy.cancelling") : t("actions.confirmCancel", { amount })}
        </Button>
        <Button
          className={refundPill("outline")}
          nativeButton={false}
          render={<Link href={bookingPopupHref(booking.id)} />}
          variant="outline"
        >
          {t("actions.keep")}
        </Button>
      </RefundActions>
    </>
  );
}

export function ClaimMode({
  booking,
  invoice,
  exit,
  notice,
  onOpened,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly exit: Extract<BookingExit, { kind: "claim" }>;
  readonly notice?: string | null;
  readonly onOpened: (refund: ApiRefundCase) => void;
}) {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();
  const [attempt, setAttempt] = useState<ClaimAttempt>("ready");
  const pressed = useRef(false);

  const amount = when.baht(exit.refundSatang);
  const rule = exit.by === "other" ? "other" : exit.share;
  const cancelledAt = booking.cancelledAt === null ? undefined : when.stamp(booking.cancelledAt);
  const adviseeMeta = cancelledAt === undefined ? undefined : t(CLAIM_META[exit.share], { date: cancelledAt });
  const working = attempt === "working";

  function claim() {
    if (pressed.current) return;
    pressed.current = true;
    setAttempt("working");
    openRefundOnce(invoice.id, t(`ruleLine.${rule}`, { amount })).then(onOpened, () => {
      pressed.current = false;
      setAttempt("failed");
    });
  }

  return (
    <>
      <RefundCard
        head={
          <RefundHead
            amount={amount}
            icon={RotateCcw}
            meta={exit.by === "other" ? t("meta.claimOther") : adviseeMeta}
            title={t("head.claim")}
            tone="primary"
          >
            <OwedFacts booking={booking} invoice={invoice} owed={exit} />
          </RefundHead>
        }
      >
        <RefundSection heading={t("progress.heading")}>
          <RefundList ordered>
            <RefundRow icon={CircleCheckBig} sub={cancelledAt} title={t("progress.cancellation.cancelled")} tone="success" />
            <RefundRow
              icon={Circle}
              sub={t("progress.cancellation.refundSub")}
              title={t("progress.cancellation.refund", { amount })}
            />
            <RefundRow
              icon={Circle}
              sub={t("progress.bankSub")}
              title={
                invoice.card
                  ? t("progress.cancellation.arrive", { card: cardName(invoice.card) })
                  : t("progress.cancellation.arriveNoCard")
              }
            />
          </RefundList>
        </RefundSection>
      </RefundCard>
      <RefundActions invoiceNumber={invoice.invoiceNumber}>
        <Alert text={attempt === "failed" ? t("errors.claimFailed") : notice} />
        <Button
          aria-busy={working || undefined}
          className={refundPill("solid")}
          disabled={working}
          onClick={claim}
          type="button"
        >
          {working ? t("busy.refunding") : t("actions.claim", { amount })}
        </Button>
        <Button
          className={refundPill("outline")}
          nativeButton={false}
          render={<Link href={bookingPopupHref(booking.id)} />}
          variant="outline"
        >
          {t("actions.back")}
        </Button>
      </RefundActions>
    </>
  );
}
