"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { BookingDetailState, DetailColumn } from "@/components/bookings/booking-detail-screen";
import { bookingExit, bookingPopupHref } from "@/components/bookings/booking-exit";
import { asUuid, useMountTime, useQueryValue } from "@/components/bookings/booking-flow";
import { CancelRefundMode, ClaimMode } from "@/components/bookings/refund-cancel";
import { ReportMode } from "@/components/bookings/refund-report";
import { SHEET_W, SHEET_X } from "@/components/payment/invoice-screens";
import { useRefundFormat } from "@/components/bookings/refund-sheet";
import { RefundStatusMode } from "@/components/bookings/refund-status";
import { isNotFound, useBookingMoney } from "@/components/bookings/use-booking-exit";
import { ApiError } from "@/lib/api/client";
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
 */
export function BookingRefundScreen() {
  const id = asUuid(useQueryValue("bookingId"));
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
    <BookingDetailState action={back} back={back} body={t("states.notFoundBody")} title={t("states.notFoundTitle")} />
  );
}

function RefundData({ id }: { readonly id: string }) {
  const fetchBooking = useCallback((signal: AbortSignal) => getBooking(id, signal), [id]);
  const booking = useResource<ApiBooking>(`bookings/${id}`, fetchBooking);
  const shown = useLastAnswer(booking);

  if (!shown && booking.loading) return <RefundSkeleton bookingId={id} />;
  if (isNotFound(booking.error) || isForbidden(booking.error)) return <RefundNotFound />;
  if (!shown) return <RefundFailed retry={booking.reload} />;
  return <RefundContent booking={shown} reload={booking.reload} />;
}

/** Someone else's booking is a 403 or a 404; either way, for this account it does not exist. */
function isForbidden(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 403;
}

function RefundFailed({ retry, bookingId }: { readonly retry: () => void; readonly bookingId?: string }) {
  const t = useTranslations("bookingRefund");
  const b = useTranslations("bookings");
  const back = useBack(bookingId);
  return (
    <BookingDetailState
      action={back}
      back={back}
      body={b("detailsFailedBody")}
      retry={retry}
      retryLabel={t("actions.retry")}
      title={t("states.loadFailed")}
    />
  );
}

/**
 * What this page itself has just done, laid over what the API last said
 * until it is read again: a cancel that stood, the request it opened, and the
 * line to say about it.
 */
type Done = {
  readonly cancelled?: boolean;
  readonly refund?: ApiRefundCase;
  readonly notice?: string;
  readonly announce?: string;
};

function RefundContent({ booking, reload }: { readonly booking: ApiBooking; readonly reload: () => void }) {
  const t = useTranslations("bookingRefund");
  const format = useRefundFormat();
  const now = useMountTime();
  const back = useBack(booking.id);
  const money = useBookingMoney(booking.id);
  const [done, setDone] = useState<Done>({});

  const current =
    done.cancelled && booking.state !== "CANCELLED"
      ? { ...booking, state: "CANCELLED" as const, cancelledAt: new Date(now).toISOString(), cancelledByUserId: booking.adviseeId }
      : booking;
  const opened = done.refund;
  const cases = opened && money.cases ? [opened, ...money.cases.filter((item) => item.id !== opened.id)] : money.cases;
  const exit = bookingExit({ booking: current, invoice: money.invoice, cases, now });
  const invoice = money.invoice;

  if (exit.kind === "waiting") {
    if (money.error) return <RefundFailed bookingId={booking.id} retry={money.reload} />;
    return <RefundSkeleton bookingId={booking.id} />;
  }
  if (!invoice || exit.kind === "none" || exit.kind === "cancel") {
    const paid = invoice?.status === "paid" || invoice?.status === "refunded";
    return (
      <BookingDetailState
        action={back}
        back={back}
        body={paid ? t("states.nothingRescheduled") : t("states.nothingUnpaid")}
        title={t("states.nothingTitle")}
      />
    );
  }
  if (exit.kind === "closed") {
    return (
      <BookingDetailState
        action={back}
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
          onCancelledOnly={() => {
            setDone({ cancelled: true, notice: t("errors.cancelledOnly", { amount: format.baht(exit.refundSatang) }) });
            reload();
          }}
          onOpened={(refund) =>
            setDone({ cancelled: true, refund, announce: t("announce.cancelled", { amount: format.baht(exit.refundSatang) }) })
          }
        />
      );
      break;
    case "claim":
      mode = (
        <ClaimMode
          booking={current}
          exit={exit}
          invoice={invoice}
          notice={done.notice}
          onOpened={(refund) =>
            setDone({ cancelled: done.cancelled, refund, announce: t("announce.claimed", { amount: format.baht(exit.refundSatang) }) })
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
          onOpened={(refund, notice) => setDone({ refund, notice, announce: t("announce.reported") })}
        />
      );
      break;
    default:
      mode = <RefundStatusMode booking={current} exit={exit} invoice={invoice} notice={done.notice} />;
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
function RefundSkeleton({ bookingId }: { readonly bookingId: string }) {
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
