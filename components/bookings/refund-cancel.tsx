"use client";

import { Circle, CircleCheckBig, CircleX, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";

import { AUTH_LINK } from "@/components/auth/auth-split";
import {
  bookingPopupHref,
  refundHref,
  signInHref,
  type BookingExit,
  type RefundShare,
} from "@/components/bookings/booking-exit";
import {
  cancelThenRefund,
  openRefundOnce,
  refundFailure,
  type CancelRefundResult,
  type RefundFailure,
} from "@/components/bookings/refund-actions";
import {
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
  useRefundLine,
} from "@/components/bookings/refund-sheet";
import { StatusPill } from "@/components/mobile/status-pill";
import { Button } from "@/components/ui/button";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type NotCancelled = Extract<CancelRefundResult, { kind: "notCancelled" }>["outcome"];

/** What follows a refusal: press again, read the booking again, stay shut, or offer to check. */
type Then = "retry" | "reread" | "lock" | "check";

/**
 * Why the cancel did not stand, in the advisee's words, and what comes next.
 * `changed` and `unavailable` mean the booking is no longer what the page
 * shows, so it is read again and the page moves to where it stands. After
 * `uncertain` it may already be off, so nothing is sent until it is checked;
 * after `signIn` nothing can be checked, so the button stays shut.
 */
const REFUSED = {
  retry: { key: "bookingRefund.errors.cancelFailed", then: "retry" },
  changed: { key: "bookings.cancellationChanged", then: "reread" },
  unavailable: { key: "bookings.cancellationUnavailable", then: "reread" },
  signIn: { key: "bookings.cancellationSignIn", then: "lock" },
  uncertain: { key: "bookings.cancellationUncertain", then: "check" },
} as const satisfies Record<NotCancelled, { readonly key: string; readonly then: Then }>;

/** `held` lasts until the booking is read again: `on` is the answer the refusal came from. */
type CancelAttempt =
  | { readonly kind: "ready" }
  | { readonly kind: "working" }
  | { readonly kind: "held"; readonly on: ApiBooking; readonly then: Exclude<Then, "retry">; readonly checking: boolean };

/** After a refused press, what it asks for next (`refundFailure`). */
type ClaimAttempt = "ready" | "working" | RefundFailure;

const CLAIM_FAILED = {
  retry: "errors.claimFailed",
  signIn: "errors.signIn",
  notFound: "errors.refundNotFound",
  refused: "errors.refundRefused",
} as const satisfies Record<RefundFailure, string>;

const CLAIM_META = { full: "meta.claimFull", half: "meta.claimHalf" } as const satisfies Record<RefundShare, string>;

/** The accent ground with ink, not blue on blue (4.2:1), and the label step from `lg`, as its row's sub line. */
const NOW_PILL = "text-foreground lg:px-3 lg:py-1 lg:text-frame-label";

const TERMS_LINK = cn(
  AUTH_LINK,
  "inline-flex min-h-11 items-center rounded-sm text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-label",
);

type Owed = { readonly share: RefundShare; readonly refundSatang: number };

/**
 * A half refund's box answers its amount, so it takes the right cell, level
 * with the head; the rule or the steps (`children`) then run under both
 * cells. A full refund needs no box, and they take the right cell. Either
 * way the two cells end within a row of each other.
 */
function OwedCard({ head, owed, children }: { readonly head: ReactNode; readonly owed: Owed; readonly children: ReactNode }) {
  if (owed.share === "full") return <RefundCard head={head}>{children}</RefundCard>;
  return (
    <RefundCard foot={children} head={head}>
      <HalfBox owed={owed} />
    </RefundCard>
  );
}

function HalfBox({ owed }: { readonly owed: Owed }) {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();

  return (
    <RefundSection heading={t("box.heading")}>
      <RefundBox
        lines={[
          { label: t("box.service"), value: when.baht(owed.refundSatang) },
          { label: t("box.fee"), value: when.baht(0) },
        ]}
        total={{ label: t("box.total"), value: when.baht(owed.refundSatang) }}
      />
    </RefundSection>
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
  notice,
  stillOffered,
  reread,
  onNotice,
  onOpened,
  onCancelledOnly,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly exit: Extract<BookingExit, { kind: "cancelRefund" }>;
  readonly notice?: string | null;
  /** The rule again at the press's time; false when the page has moved to another offer and nothing may be sent. */
  readonly stillOffered: (at: number) => boolean;
  /** Read the booking and its money again, so the page shows where they stand now. */
  readonly reread: () => void;
  /** A line the page keeps above its buttons, whatever mode it moves to. */
  readonly onNotice: (notice: string) => void;
  /** `at`: the press, when the cancel stood. */
  readonly onOpened: (refund: ApiRefundCase, at: number) => void;
  readonly onCancelledOnly: (at: number, failure: RefundFailure) => void;
}) {
  const t = useTranslations("bookingRefund");
  const words = useTranslations();
  const when = useRefundFormat();
  const [attempt, setAttempt] = useState<CancelAttempt>({ kind: "ready" });
  const pressed = useRef(false);
  const heldOn = useRef<ApiBooking | null>(null);
  const signIn = signInHref(refundHref(booking.id));

  const amount = when.baht(exit.refundSatang);
  const held = attempt.kind === "held" && attempt.on === booking ? attempt : undefined;
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

  function hold(then: Exclude<Then, "retry">) {
    heldOn.current = booking;
    setAttempt({ kind: "held", on: booking, then, checking: false });
    if (then === "reread") reread();
  }

  async function confirm() {
    const at = Date.now();
    // The refs shut a second press in the same task, before React has drawn the busy or held button.
    if (pressed.current || heldOn.current === booking || !stillOffered(at)) return;
    pressed.current = true;
    setAttempt({ kind: "working" });
    const result = await cancelThenRefund(booking.id, invoice.id, t(`ruleLine.${exit.share}`, { amount }));
    pressed.current = false;
    switch (result.kind) {
      case "opened":
        onOpened(result.refund, at);
        return;
      case "cancelledOnly":
        onCancelledOnly(at, result.failure);
        return;
      case "foundCancelled":
        // Not this page's share to file: the booking, read again, says who cancelled and when.
        onNotice(t("errors.cancelledMeanwhile"));
        hold("reread");
        return;
      case "notCancelled": {
        const refused = REFUSED[result.outcome];
        onNotice(words(refused.key));
        if (refused.then === "retry") setAttempt({ kind: "ready" });
        else hold(refused.then);
      }
    }
  }

  function check() {
    if (!held || held.checking) return;
    setAttempt({ ...held, checking: true });
    reread();
  }

  return (
    <>
      <OwedCard
        head={
          <RefundHead
            amount={amount}
            icon={RotateCcw}
            meta={t("meta.cancel")}
            title={t(exit.share === "full" ? "head.cancelFull" : "head.cancelHalf")}
            tone="primary"
          >
            <RefundFacts booking={booking} invoice={invoice} />
          </RefundHead>
        }
        owed={exit}
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
                  trailing={current ? <StatusPill className={NOW_PILL} tone="accent">{t("policy.now")}</StatusPill> : undefined}
                />
              );
            })}
          </RefundList>
          <Link className={TERMS_LINK} href="/terms#cancellation">
            {t("policy.termsLink")}
          </Link>
        </RefundSection>
      </OwedCard>
      <RefundActions invoiceNumber={invoice.invoiceNumber}>
        <Alert text={notice} />
        <p className="text-center text-xs text-muted-foreground lg:text-frame-label">{t("policy.final")}</p>
        {held?.then === "lock" ? (
          <Button className={refundPill("solid")} nativeButton={false} render={<Link href={signIn} />}>
            {t("actions.signIn")}
          </Button>
        ) : held?.then === "check" ? (
          <Button
            aria-busy={held.checking || undefined}
            className={refundPill("solid")}
            disabled={held.checking}
            onClick={check}
            type="button"
          >
            {held.checking ? t("busy.checking") : t("actions.check")}
          </Button>
        ) : (
          <Button
            aria-busy={working || undefined}
            className={refundPill("danger")}
            disabled={working || held !== undefined}
            onClick={() => void confirm()}
            type="button"
          >
            {working ? t("busy.cancelling") : t("actions.confirmCancel", { amount })}
          </Button>
        )}
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
  const refundLine = useRefundLine(invoice);
  const [attempt, setAttempt] = useState<ClaimAttempt>("ready");
  const pressed = useRef(false);

  const amount = when.baht(exit.refundSatang);
  const rule = exit.by === "other" ? "other" : exit.share;
  const cancelledAt = booking.cancelledAt === null ? undefined : when.stamp(booking.cancelledAt);
  const adviseeMeta = cancelledAt === undefined ? undefined : t(CLAIM_META[exit.share], { date: cancelledAt });
  const working = attempt === "working";
  const failure = attempt === "ready" || attempt === "working" ? undefined : attempt;

  function claim() {
    if (pressed.current) return;
    pressed.current = true;
    setAttempt("working");
    openRefundOnce(invoice.id, t(`ruleLine.${rule}`, { amount })).then(onOpened, (cause: unknown) => {
      pressed.current = false;
      setAttempt(refundFailure(cause));
    });
  }

  return (
    <>
      <OwedCard
        head={
          // A cancelled booking reads in the receipt's red, wherever its state is named.
          <RefundHead
            amount={amount}
            icon={CircleX}
            meta={exit.by === "other" ? t("meta.claimOther") : adviseeMeta}
            title={t("head.claim")}
            tone="destructive"
          >
            <RefundFacts booking={booking} invoice={invoice} />
          </RefundHead>
        }
        owed={exit}
      >
        <RefundSection heading={t("progress.heading")}>
          <RefundList ordered>
            <RefundRow icon={CircleCheckBig} sub={cancelledAt} title={t("progress.cancellation.cancelled")} tone="success" />
            <RefundRow icon={Circle} sub={t("progress.cancellation.confirmSub")} title={t("progress.cancellation.confirm")} />
            <RefundRow icon={Circle} sub={t("progress.refundSub.confirm")} title={refundLine(exit.refundSatang)} />
          </RefundList>
        </RefundSection>
      </OwedCard>
      <RefundActions invoiceNumber={invoice.invoiceNumber}>
        <Alert text={failure ? t(CLAIM_FAILED[failure]) : notice} />
        {failure === "signIn" ? (
          <Button className={refundPill("solid")} nativeButton={false} render={<Link href={signInHref(refundHref(booking.id))} />}>
            {t("actions.signIn")}
          </Button>
        ) : (
          <Button
            aria-busy={working || undefined}
            className={refundPill("solid")}
            disabled={working}
            onClick={claim}
            type="button"
          >
            {working ? t("busy.refunding") : t("actions.claim", { amount })}
          </Button>
        )}
      </RefundActions>
    </>
  );
}
