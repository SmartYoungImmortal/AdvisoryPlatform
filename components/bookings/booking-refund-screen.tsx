"use client";

import { Suspense, useCallback, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { BookingDetailState, DetailColumn } from "@/components/bookings/booking-detail-screen";
import { bookingExit, bookingPopupHref, refundHref, sameOffer, signInHref } from "@/components/bookings/booking-exit";
import { asUuid, useMountTime } from "@/components/bookings/booking-flow";
import { refundFailure, type RefundFailure } from "@/components/bookings/refund-actions";
import { CancelRefundMode, ClaimMode } from "@/components/bookings/refund-cancel";
import { ReportMode } from "@/components/bookings/refund-report";
import { SHEET_W, SHEET_X } from "@/components/payment/invoice-screens";
import { useRefundFormat } from "@/components/bookings/refund-sheet";
import { RefundStatusMode } from "@/components/bookings/refund-status";
import { useBookingMoney } from "@/components/bookings/use-booking-exit";
import { getBooking } from "@/lib/api/resources";
import type { ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { useLastAnswer, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/bookings/refund?bookingId=`: the one page where a booking's money is
 * settled. Which mode it shows is `bookingExit`'s answer, the same rule the
 * popup draws its one way out from, so the page never offers what the popup
 * would not: cancel and get the refund, claim the refund of a cancelled
 * booking, report a problem, or the request's status.
 *
 * The id is read with `useSearchParams`, like the receipt page, because a
 * move to another `?bookingId=` on this same route fires no popstate: a
 * location subscription would keep showing the booking it opened with.
 */
export function BookingRefundScreen() {
  return (
    <Suspense fallback={<RefundSkeleton />}>
      <RefundForQuery />
    </Suspense>
  );
}

function RefundForQuery() {
  const id = asUuid(useSearchParams().get("bookingId"));
  if (!id) return <RefundNotFound />;
  return <RefundData id={id} key={id} />;
}

function useBack(bookingId?: string) {
  const t = useTranslations("bookingRefund");
  return bookingId
    ? { href: bookingPopupHref(bookingId), label: t("actions.back") }
    : { href: "/bookings", label: t("actions.toBookings") };
}

function RefundNotFound() {
  const t = useTranslations("bookingRefund");
  const back = useBack();
  return (
    <BookingDetailState
      action={{ href: "/bookings", label: t("actions.toBookings") }}
      back={back}
      body={t("states.notFoundBody")}
      title={t("states.notFoundTitle")}
    />
  );
}

/** A lapsed session: signing in again, and coming back here, is the only thing that helps. */
function RefundSignIn({ bookingId }: { readonly bookingId: string }) {
  const t = useTranslations("bookingRefund");
  const back = useBack(bookingId);
  return (
    <BookingDetailState
      action={{ href: signInHref(refundHref(bookingId)), label: t("actions.signIn") }}
      back={back}
      body={t("states.signInBody")}
      title={t("states.signInTitle")}
    />
  );
}

function RefundData({ id }: { readonly id: string }) {
  const t = useTranslations("bookingRefund");
  const b = useTranslations("bookings");
  const fetchBooking = useCallback((signal: AbortSignal) => getBooking(id, signal), [id]);
  const booking = useResource<ApiBooking>(`bookings/${id}`, fetchBooking);
  const shown = useLastAnswer(booking);

  if (!shown && booking.loading) return <RefundSkeleton bookingId={id} />;
  // Someone else's booking is a 403 or a 404; either way, for this account it does not exist.
  const failure = booking.error ? refundFailure(booking.error) : null;
  if (failure === "notFound") return <RefundNotFound />;
  if (failure === "signIn") return <RefundSignIn bookingId={id} />;
  if (!shown) {
    return (
      <RefundFailed
        body={failure === "retry" ? b("detailsFailedBody") : t("errors.refundRefused")}
        bookingId={id}
        retry={failure === "retry" ? booking.reload : undefined}
        title={t("states.loadFailed")}
      />
    );
  }
  return <RefundContent booking={shown} reload={booking.reload} />;
}

/** `retry` only when pressing again can help: a network failure, a timeout or a server fault. */
function RefundFailed({
  title,
  body,
  retry,
  bookingId,
}: {
  readonly title: string;
  readonly body: string;
  readonly retry?: () => void;
  readonly bookingId: string;
}) {
  const t = useTranslations("bookingRefund");
  const back = useBack(bookingId);
  return <BookingDetailState back={back} body={body} retry={retry} retryLabel={t("actions.retry")} title={title} />;
}

/**
 * What this page itself has just done, laid over what the API last said
 * until it is read again: a cancel that stood, the request it opened, and the
 * line to say about it.
 */
type Done = {
  /** When this page's own cancel stood (the press), shown until the booking is read again. */
  readonly cancelledAt?: number;
  readonly refund?: ApiRefundCase;
  readonly notice?: string;
  readonly announce?: string;
  /** The booking answer a re-read was asked on; a newer one settles what the notice says. */
  readonly rereadOn?: ApiBooking;
};

const CANCELLED_ONLY = {
  retry: "errors.cancelledOnly",
  signIn: "errors.cancelledOnlySignIn",
  notFound: "errors.cancelledOnlyRefused",
  refused: "errors.cancelledOnlyRefused",
} as const satisfies Record<RefundFailure, string>;

function RefundContent({ booking, reload }: { readonly booking: ApiBooking; readonly reload: () => void }) {
  const t = useTranslations("bookingRefund");
  const tr = useTranslations("transactions");
  const l = useTranslations("landing");
  const format = useRefundFormat();
  const mounted = useMountTime();
  // The clock the rule is read at: the page's opening, until a press finds the offer has moved on.
  const [movedTo, setMovedTo] = useState<number>();
  const now = movedTo ?? mounted;
  const back = useBack(booking.id);
  const money = useBookingMoney(booking.id);
  const { reload: reloadMoney } = money;
  const [done, setDone] = useState<Done>({});

  const current =
    done.cancelledAt !== undefined && booking.state !== "CANCELLED"
      ? {
          ...booking,
          state: "CANCELLED" as const,
          cancelledAt: new Date(done.cancelledAt).toISOString(),
          cancelledByUserId: booking.adviseeId,
        }
      : booking;
  const opened = done.refund;
  const cases = opened && money.cases ? [opened, ...money.cases.filter((item) => item.id !== opened.id)] : money.cases;
  const exit = bookingExit({ booking: current, invoice: money.invoice, cases, now });
  const invoice = money.invoice;

  // A line kept from before a re-read says what the re-read found once it answers: the booking is now
  // cancelled (its share follows who cancelled and when), or it is still on and the cancel did not go through.
  let notice = done.notice;
  if (done.rereadOn && booking !== done.rereadOn) {
    if (booking.state === "CANCELLED") notice = t("errors.cancelledMeanwhile");
    else if (exit.kind === "cancelRefund") notice = t("errors.cancelFailed");
  }

  const refresh = useCallback(() => {
    reload();
    reloadMoney();
  }, [reload, reloadMoney]);
  const reread = useCallback(() => {
    setDone((previous) => ({ ...previous, rereadOn: booking }));
    refresh();
  }, [booking, refresh]);

  /**
   * The rule once more at the moment of a press (`at`, read by the press).
   * When the clock has carried the booking across a line since the page
   * opened, nothing is sent: the page moves to the offer that holds now and
   * says why.
   */
  function stillOffered(at: number): boolean {
    const fresh = bookingExit({ booking: current, invoice: money.invoice, cases, now: at });
    if (sameOffer(exit, fresh)) return true;
    setMovedTo(at);
    setDone({
      notice:
        fresh.kind === "cancelRefund"
          ? t("errors.offerHalf", { amount: format.baht(fresh.refundSatang) })
          : t("errors.offerStarted"),
    });
    return false;
  }

  if (exit.kind === "waiting") {
    if (!money.error) return <RefundSkeleton bookingId={booking.id} />;
    const failure = refundFailure(money.error);
    if (failure === "signIn") return <RefundSignIn bookingId={booking.id} />;
    return (
      <RefundFailed
        body={failure === "retry" ? t("states.moneyFailedBody") : t("errors.refundRefused")}
        bookingId={booking.id}
        retry={failure === "retry" ? money.reload : undefined}
        title={t("states.moneyFailed")}
      />
    );
  }
  if (exit.kind === "paidElsewhere") {
    return (
      <BookingDetailState
        action={{ href: `mailto:${l("footerEmailAddress")}`, label: tr("contactSupport") }}
        back={back}
        body={t("states.paidElsewhereBody")}
        title={t("states.paidElsewhereTitle")}
      />
    );
  }
  if (!invoice || exit.kind === "none" || exit.kind === "cancel" || exit.kind === "rescheduled") {
    return (
      <BookingDetailState
        back={back}
        body={exit.kind === "rescheduled" ? t("states.nothingRescheduled") : t("states.nothingUnpaid")}
        title={t("states.nothingTitle")}
      />
    );
  }
  if (exit.kind === "closed") {
    return (
      <BookingDetailState
        back={back}
        body={t("states.closedBody", { date: format.deadline(exit.closedAt) })}
        title={t("states.closedTitle")}
      />
    );
  }

  let mode: ReactNode;
  switch (exit.kind) {
    case "cancelRefund":
      mode = (
        <CancelRefundMode
          booking={booking}
          exit={exit}
          invoice={invoice}
          notice={notice}
          onNotice={(line) => setDone({ notice: line })}
          reread={reread}
          stillOffered={stillOffered}
          onCancelledOnly={(at, failure) => {
            setDone({ cancelledAt: at, notice: t(CANCELLED_ONLY[failure], { amount: format.baht(exit.refundSatang) }) });
            refresh();
          }}
          onOpened={(refund, at) => {
            setDone({ cancelledAt: at, refund, announce: t("announce.cancelled", { amount: format.baht(exit.refundSatang) }) });
            refresh();
          }}
        />
      );
      break;
    case "claim":
      mode = (
        <ClaimMode
          booking={current}
          exit={exit}
          invoice={invoice}
          notice={notice}
          onOpened={(refund) =>
            setDone({
              cancelledAt: done.cancelledAt,
              refund,
              announce: t("announce.claimed", { amount: format.baht(exit.refundSatang) }),
            })
          }
        />
      );
      break;
    case "report":
      mode = (
        <ReportMode
          booking={booking}
          exit={exit}
          invoice={invoice}
          notice={notice}
          onOpened={(refund, line) => setDone({ refund, notice: line, announce: t("announce.reported") })}
          stillOffered={stillOffered}
        />
      );
      break;
    default:
      mode = <RefundStatusMode booking={current} exit={exit} invoice={invoice} notice={notice} />;
  }

  return (
    <DetailColumn back={back}>
      <p aria-live="polite" className="sr-only">
        {done.announce}
      </p>
      {mode}
    </DetailColumn>
  );
}

/** The card's own shape while the booking and its money load: still, no shimmer. */
function RefundSkeleton({ bookingId }: { readonly bookingId?: string }) {
  const t = useTranslations("bookingRefund");
  const back = useBack(bookingId);
  const bone = "rounded bg-muted";

  return (
    <DetailColumn back={back}>
      <div aria-busy className="flex w-full flex-col gap-6 lg:gap-8">
        <span className="sr-only" role="status">
          {t("busy.loading")}
        </span>
        <div
          aria-hidden
          className="flex w-full flex-col rounded-card border border-hero-card-border bg-card shadow-hero-card lg:grid lg:grid-cols-2"
        >
          <div className={cn("flex flex-col gap-2 pt-6 pb-4 lg:gap-3 lg:pt-9 lg:pb-8", SHEET_X)}>
            <span className={cn(bone, "h-4 w-36 lg:h-5 lg:w-48")} />
            <span className={cn(bone, "h-8 w-32 rounded-lg lg:h-10 lg:w-44")} />
            <span className={cn(bone, "h-4 w-52 lg:h-5 lg:w-72")} />
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 lg:mt-6 lg:gap-x-6 lg:gap-y-5">
              {[0, 1, 2, 3].map((i) => (
                <span className={cn(bone, "h-9 lg:h-11")} key={i} />
              ))}
            </div>
          </div>
          <div
            className={cn(
              "flex flex-col gap-3 border-t border-dashed border-border pt-4 pb-6 lg:gap-4 lg:border-t-0 lg:border-l lg:pt-9 lg:pb-9",
              SHEET_X,
            )}
          >
            <span className={cn(bone, "h-3 w-24 lg:h-4")} />
            {[0, 1, 2].map((i) => (
              <span className={cn(bone, "h-9 lg:h-11")} key={i} />
            ))}
          </div>
        </div>
        <span aria-hidden className={cn("h-11 w-full rounded-full bg-muted lg:mx-auto lg:h-14", SHEET_W)} />
      </div>
    </DetailColumn>
  );
}
