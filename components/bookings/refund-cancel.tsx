"use client";

import { Circle, CircleCheckBig, CircleX, Clock3, RotateCcw } from "lucide-react";
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
  type OpenedRefund,
  type RefundFailure,
} from "@/components/bookings/refund-actions";
import {
  cardName,
  MailSupportPill,
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
  useSupportMail,
} from "@/components/bookings/refund-sheet";
import { StatusPill } from "@/components/mobile/status-pill";
import { Button } from "@/components/ui/button";
import type { ApiAdviseeInvoice, ApiBooking } from "@/lib/api/types";
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

/**
 * The accent ground with ink, not blue on blue (4.2:1), on its row's sub line in that line's type from `lg`.
 * Its pad is given back as negative margin, so it takes no more height than the line and the row keeps the other rows' rhythm.
 */
const NOW_PILL = "-my-0.5 py-0.5 text-foreground max-lg:leading-4 lg:-my-1 lg:px-3 lg:py-1 lg:text-frame-label";

/**
 * `self-start`: from `lg` the right cell's section is a column, which would stretch it across. There the link
 * ends the cell, and its tap box hangs below its line by its overhang, so the line sits on the head's last.
 */
const TERMS_LINK = cn(
  AUTH_LINK,
  "inline-flex min-h-11 items-center self-start rounded-sm text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-label lg:group-data-[cell=sections]/cell:mb-[calc((1lh_-_2.75rem)/2)]",
);

/** What the press does and what then waits on the team, said in the line above the button, before it is pressed. */
function BeforePress({ children }: { readonly children: string }) {
  return <p className="text-center text-xs text-balance text-muted-foreground lg:text-frame-label">{children}</p>;
}

type Owed = { readonly share: RefundShare; readonly refundSatang: number };

/**
 * A half refund's box answers its amount, so it takes the right cell, level
 * with the head; the rule or the steps (`children`) then run under both
 * cells. A full refund needs no box, and they take the right cell. Either
 * way the right cell grows to end level with the head, its rows at their own gap.
 */
function OwedCard({
  head,
  owed,
  invoice,
  children,
}: {
  readonly head: ReactNode;
  readonly owed: Owed;
  readonly invoice: ApiAdviseeInvoice;
  readonly children: ReactNode;
}) {
  if (owed.share === "full") return <RefundCard head={head}>{children}</RefundCard>;
  return (
    <RefundCard foot={children} head={head}>
      <HalfBox invoice={invoice} owed={owed} />
    </RefundCard>
  );
}

/** Each line names what it is taken from, so the reader gets from what was paid to what comes back. */
function HalfBox({ owed, invoice }: { readonly owed: Owed; readonly invoice: ApiAdviseeInvoice }) {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();

  return (
    <RefundSection heading={t("box.heading")}>
      <RefundBox
        lines={[
          { label: t("box.service", { amount: when.baht(invoice.priceSatang) }), value: when.baht(owed.refundSatang) },
          { label: t("box.fee", { amount: when.baht(invoice.platformFeeSatang) }), value: when.baht(0) },
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
  rereadFailed = false,
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
  /** The booking's read again failed, so a check waiting on it is over and can be pressed again. */
  readonly rereadFailed?: boolean;
  /** A line the page keeps above its buttons, whatever mode it moves to. */
  readonly onNotice: (notice: string) => void;
  /** `at`: the press, when the cancel stood. */
  readonly onOpened: (opened: OpenedRefund, at: number) => void;
  readonly onCancelledOnly: (at: number, failure: RefundFailure) => void;
}) {
  const t = useTranslations("bookingRefund");
  const words = useTranslations();
  const when = useRefundFormat();
  const [attempt, setAttempt] = useState<CancelAttempt>({ kind: "ready" });
  const pressed = useRef(false);
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
    setAttempt({ kind: "held", on: booking, then, checking: false });
    if (then === "reread") reread();
  }

  async function confirm() {
    const at = Date.now();
    // The ref shuts a second press in the same task, before React has drawn the busy button. By the time
    // the answer lands the busy button is drawn and disabled, and it stays so until the held one replaces it.
    if (pressed.current || !stillOffered(at)) return;
    pressed.current = true;
    setAttempt({ kind: "working" });
    const result = await cancelThenRefund(booking.id, invoice.id, t(`ruleLine.${exit.share}`, { amount }));
    pressed.current = false;
    switch (result.kind) {
      case "opened":
        onOpened(result, at);
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

  // A check waits on the booking's next answer; a read that failed instead ends it.
  const checking = held?.checking === true && !rereadFailed;

  function check() {
    if (!held || checking) return;
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
        invoice={invoice}
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
        {/* Cancelling is at once, the refund is not. */}
        <BeforePress>{invoice.card ? t("policy.final", { card: cardName(invoice.card) }) : t("policy.finalNoCard")}</BeforePress>
        {held?.then === "lock" ? (
          <Button className={refundPill("solid")} nativeButton={false} render={<Link href={signIn} />}>
            {t("actions.signIn")}
          </Button>
        ) : held?.then === "check" ? (
          <Button
            aria-busy={checking || undefined}
            className={refundPill("solid")}
            disabled={checking}
            onClick={check}
            type="button"
          >
            {checking ? t("busy.checking") : t("actions.check")}
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
  failed,
  onOpened,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly exit: Extract<BookingExit, { kind: "claim" }>;
  readonly notice?: string | null;
  /** How this page's own refund call failed after its cancel stood, which `notice` already says. */
  readonly failed?: RefundFailure;
  readonly onOpened: (opened: OpenedRefund) => void;
}) {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();
  const refundLine = useRefundLine(invoice);
  const supportMail = useSupportMail(invoice.invoiceNumber);
  const [attempt, setAttempt] = useState<ClaimAttempt>("ready");
  const pressed = useRef(false);

  const amount = when.baht(exit.refundSatang);
  const rule = exit.by === "other" ? "other" : exit.share;
  const cancelledAt = booking.cancelledAt === null ? undefined : when.stamp(booking.cancelledAt);
  const adviseeMeta = cancelledAt === undefined ? undefined : t(CLAIM_META[exit.share], { date: cancelledAt });
  const working = attempt === "working";
  const pressedFailure = attempt === "ready" || attempt === "working" ? undefined : attempt;
  const failure = pressedFailure ?? (attempt === "ready" ? failed : undefined);
  // After a refusal pressing again fails the same way: support is the way on, so it takes the button.
  const toSupport = failure === "refused" || failure === "notFound";
  // Only the claim itself is the button that "press the button below" can mean.
  const claimable = failure !== "signIn" && !toSupport;

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
        invoice={invoice}
        owed={exit}
      >
        <RefundSection heading={t("progress.heading")}>
          <RefundList ordered>
            <RefundRow icon={CircleCheckBig} sub={cancelledAt} title={t("progress.cancellation.cancelled")} tone="success" />
            {/* The step the press takes, so the trail before it never reads as the status after it. */}
            <RefundRow
              current
              icon={Clock3}
              sub={claimable ? t("progress.cancellation.sendSub") : undefined}
              title={t("progress.cancellation.send")}
              tone="primary"
            />
            <RefundRow icon={Circle} sub={t("progress.cancellation.confirmSub")} title={t("progress.cancellation.confirm")} />
            <RefundRow icon={Circle} sub={t("progress.refundSub.confirm")} title={refundLine(exit.refundSatang)} />
          </RefundList>
        </RefundSection>
      </OwedCard>
      <RefundActions help={!toSupport} invoiceNumber={invoice.invoiceNumber}>
        <Alert text={pressedFailure ? t(CLAIM_FAILED[pressedFailure]) : notice} />
        {claimable ? (
          <BeforePress>
            {invoice.card ? t("policy.claimFinal", { card: cardName(invoice.card) }) : t("policy.claimFinalNoCard")}
          </BeforePress>
        ) : null}
        {failure === "signIn" ? (
          <Button className={refundPill("solid")} nativeButton={false} render={<Link href={signInHref(refundHref(booking.id))} />}>
            {t("actions.signIn")}
          </Button>
        ) : toSupport ? (
          <MailSupportPill href={supportMail} />
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
