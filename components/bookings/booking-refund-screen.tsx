"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { BookingDetailState, DetailColumn } from "@/components/bookings/booking-detail-screen";
import { bookingExit, bookingPopupHref, paidWay, refundHref, sameOffer, signInHref } from "@/components/bookings/booking-exit";
import { asUuid, useMountTime } from "@/components/bookings/booking-flow";
import { refundFailure, type RefundFailure } from "@/components/bookings/refund-actions";
import { CancelBones, CancelRefundMode, ClaimBones, ClaimMode } from "@/components/bookings/refund-cancel";
import { ReportFormBones, ReportHeadBones, ReportMode } from "@/components/bookings/refund-report";
import {
  Bone,
  RefundActionsBones,
  RefundCard,
  RefundHeadBones,
  RefundList,
  RefundRowBones,
  RefundSection,
  useDeadlineLine,
  useRefundFormat,
} from "@/components/bookings/refund-sheet";
import { RefundStatusMode } from "@/components/bookings/refund-status";
import { moneyReadProblem, useBookingMoney, type MoneyReadFailure } from "@/components/bookings/use-booking-exit";
import { Button } from "@/components/ui/button";
import { getBooking, getService } from "@/lib/api/resources";
import type { ApiBooking, ApiPublicService, ApiRefundCase } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";

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

/**
 * The last answer there was, kept through a failed read again, so what the
 * page last showed (the status a press just reached, say) stays on screen
 * with a line about the failed read. Undefined only until a first answer;
 * null (no receipt) is an answer.
 */
function useKept<T>(value: T | undefined): T | undefined {
  const [kept, setKept] = useState(value);
  if (value !== undefined && value !== kept) setKept(value);
  return value === undefined ? kept : value;
}

function useSupportFor(bookingId: string): string {
  const t = useTranslations("bookingRefund");
  const l = useTranslations("landing");
  return `mailto:${l("footerEmailAddress")}?subject=${encodeURIComponent(t("supportSubject.id", { id: bookingId }))}`;
}

function RefundData({ id }: { readonly id: string }) {
  const t = useTranslations("bookingRefund");
  const b = useTranslations("bookings");
  const fetchBooking = useCallback((signal: AbortSignal) => getBooking(id, signal), [id]);
  const booking = useResource<ApiBooking>(`bookings/${id}`, fetchBooking);
  const shown = useKept(booking.data);
  // Opened on a cached answer (or failure), the booking is read again once, showing that answer meanwhile, as its
  // money is (`useBookingMoney`): another tab may have cancelled it and filed its refund since.
  const { reload: reloadBooking } = booking;
  const cached = useRef(booking.data !== undefined || booking.error !== null);
  useEffect(() => {
    if (!cached.current) return;
    cached.current = false;
    reloadBooking();
  }, [reloadBooking]);

  if (!shown && booking.loading) return <RefundSkeleton bookingId={id} />;
  // Someone else's booking is a 403 or a 404; either way, for this account it does not exist.
  const failure = booking.error ? refundFailure(booking.error) : null;
  if (failure === "notFound") return <RefundNotFound />;
  if (!shown) {
    if (failure === "signIn") return <RefundSignIn bookingId={id} />;
    return (
      <RefundFailed
        bookingId={id}
        refused={t("states.loadRefusedBody")}
        retry={booking.reload}
        retryBody={b("detailsFailedBody")}
        title={t("states.loadFailed")}
        failure={failure ?? "retry"}
      />
    );
  }
  return <RefundContent booking={shown} bookingFailure={failure} reload={booking.reload} />;
}

/**
 * A read that never answered. Pressing again helps only after a network
 * failure, a timeout or a server fault; a refusal goes to support, though
 * nothing was sent, so the page says nothing has changed.
 */
function RefundFailed({
  title,
  failure,
  retryBody,
  refused,
  deadline,
  retry,
  bookingId,
}: {
  readonly title: string;
  readonly failure: Exclude<RefundFailure, "signIn">;
  readonly retryBody: string;
  readonly refused: string;
  /** Under a refusal, once the booking is known: the §8 line the email to support does not stop. */
  readonly deadline?: string | null;
  readonly retry: () => void;
  readonly bookingId: string;
}) {
  const t = useTranslations("bookingRefund");
  const back = useBack(bookingId);
  const support = useSupportFor(bookingId);
  if (failure === "retry") {
    return <BookingDetailState back={back} body={retryBody} retry={retry} retryLabel={t("actions.retry")} title={title} />;
  }
  return (
    <BookingDetailState
      action={{ href: support, label: t("actions.mailSupport"), icon: Mail }}
      back={back}
      body={refused}
      note={deadline}
      title={title}
    />
  );
}

/** A read again that failed while the page still shows the last answer: what that means, and what helps. */
const STALE = {
  retry: "errors.rereadFailed",
  signIn: "errors.rereadSignIn",
  notFound: "errors.rereadRefused",
  refused: "errors.rereadRefused",
} as const satisfies Record<RefundFailure, string>;

function StaleNotice({
  failure,
  bookingId,
  retry,
}: {
  readonly failure: RefundFailure;
  readonly bookingId: string;
  readonly retry: () => void;
}) {
  const t = useTranslations("bookingRefund");
  const tr = useTranslations("transactions");
  const support = useSupportFor(bookingId);
  const action = "-my-3 h-11 border-0 px-0 align-middle text-xs font-medium lg:text-frame-label";
  return (
    <p className="text-xs text-muted-foreground lg:text-frame-label" role="status">
      {t(STALE[failure])}{" "}
      {failure === "retry" ? (
        <Button className={action} onClick={retry} type="button" variant="link">
          {t("actions.retry")}
        </Button>
      ) : failure === "signIn" ? (
        <Button className={action} nativeButton={false} render={<Link href={signInHref(refundHref(bookingId))} />} variant="link">
          {t("actions.signIn")}
        </Button>
      ) : (
        <Button className={action} nativeButton={false} render={<a href={support} />} variant="link">
          {tr("contactSupport")}
        </Button>
      )}
    </p>
  );
}

/** Support about this booking, named in the subject by its service and day once the service is known. */
function useBookingSupport(booking: ApiBooking): string {
  const t = useTranslations("bookingRefund");
  const l = useTranslations("landing");
  const when = useRefundFormat();
  const fetchService = useCallback((signal: AbortSignal) => getService(booking.serviceId, signal), [booking.serviceId]);
  const service = useResource<ApiPublicService>(`services/${booking.serviceId}`, fetchService);
  const subject = service.data
    ? t("supportSubject.booking", { service: service.data.name, date: when.day(booking.startTime), id: booking.id })
    : t("supportSubject.id", { id: booking.id });
  return `mailto:${l("footerEmailAddress")}?subject=${encodeURIComponent(subject)}`;
}

/**
 * Its money is not on a receipt this page can read: on the booking it
 * replaced (`missing`), or on a charge other than the unpaid one shown here
 * (`unpaid`). Support, with the booking named in the subject.
 */
function RefundPaidElsewhere({
  booking,
  receipt,
  now,
}: {
  readonly booking: ApiBooking;
  readonly receipt: "missing" | "unpaid";
  readonly now: number;
}) {
  const t = useTranslations("bookingRefund");
  const back = useBack(booking.id);
  const support = useBookingSupport(booking);
  const deadline = useDeadlineLine()(booking, now);
  return (
    <BookingDetailState
      action={{ href: support, label: t("actions.mailSupport"), icon: Mail }}
      back={back}
      body={t(receipt === "missing" ? "states.paidElsewhereBody" : "states.paidUnshownBody")}
      note={deadline}
      title={t(receipt === "missing" ? "states.paidElsewhereTitle" : "states.paidUnshownTitle")}
    />
  );
}

/**
 * Nothing to refund here. A held slot was simply never paid. A cancelled
 * booking with no paid receipt, or one moved to a new time, may still have
 * been paid somewhere this page cannot see, so it says only what it found and
 * offers support.
 */
function RefundNothing({ booking, rescheduled }: { readonly booking: ApiBooking; readonly rescheduled: boolean }) {
  const t = useTranslations("bookingRefund");
  const back = useBack(booking.id);
  const support = useBookingSupport(booking);
  const held = !rescheduled && booking.state === "PENDING_PAYMENT";
  let body = t("states.nothingNoReceipt");
  if (rescheduled) body = t("states.nothingRescheduled");
  else if (held) body = t("states.nothingUnpaid");
  return (
    <BookingDetailState
      action={held ? undefined : { href: support, label: t("actions.mailSupport"), icon: Mail }}
      back={back}
      body={body}
      title={t("states.nothingTitle")}
    />
  );
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
  /** How the refund call failed after this page's cancel stood: the claim that follows offers what helps. */
  readonly failure?: RefundFailure;
};

/**
 * A money read that never answered, named by what failed. A refusal of this
 * account (403) is no failed load: its title and body say the account cannot.
 */
const MONEY_FAILED = {
  invoice: {
    title: "states.moneyFailed",
    refused: "states.moneyRefusedBody",
    forbiddenTitle: "states.moneyForbidden",
    forbidden: "states.moneyForbiddenBody",
  },
  requests: {
    title: "states.requestsFailed",
    refused: "states.requestsRefusedBody",
    forbiddenTitle: "states.requestsForbidden",
    forbidden: "states.requestsForbiddenBody",
  },
} as const satisfies Record<MoneyReadFailure["read"], Record<"title" | "refused" | "forbiddenTitle" | "forbidden", string>>;

const CANCELLED_ONLY = {
  retry: "errors.cancelledOnly",
  signIn: "errors.cancelledOnlySignIn",
  notFound: "errors.cancelledOnlyRefused",
  refused: "errors.cancelledOnlyRefused",
} as const satisfies Record<RefundFailure, string>;

function RefundContent({
  booking,
  bookingFailure,
  reload,
}: {
  readonly booking: ApiBooking;
  /** The booking's read again failed; `booking` is the last answer. */
  readonly bookingFailure: RefundFailure | null;
  readonly reload: () => void;
}) {
  const t = useTranslations("bookingRefund");
  const format = useRefundFormat();
  const deadlineLine = useDeadlineLine();
  const mounted = useMountTime();
  // Only for the skeleton while the money loads: the service's name wraps the facts where the card's will.
  const fetchService = useCallback((signal: AbortSignal) => getService(booking.serviceId, signal), [booking.serviceId]);
  const service = useResource<ApiPublicService>(`services/${booking.serviceId}`, fetchService);
  // The clock the rule is read at: the page's opening, until a press finds the offer has moved on.
  const [movedTo, setMovedTo] = useState<number>();
  const now = movedTo ?? mounted;
  const back = useBack(booking.id);
  const money = useBookingMoney(booking.id);
  const { reload: reloadMoney } = money;
  // Kept as a pair, once both have answered: until the invoice is known the hook reads its requests as
  // an unpaid invoice's none, which kept alone would let a paid booking whose requests failed read as unclaimed.
  const settled = useMemo(
    () => (money.invoice !== undefined && money.cases !== undefined ? { invoice: money.invoice, cases: money.cases } : undefined),
    [money.invoice, money.cases],
  );
  const kept = useKept(settled);
  const invoice = kept?.invoice;
  const known = kept?.cases;
  const moneyFailure = money.failure ? refundFailure(money.failure.error) : null;
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
  const cases = opened && known ? [opened, ...known.filter((item) => item.id !== opened.id)] : known;
  const exit = bookingExit({ booking: current, invoice, cases, now });
  // The page is about money, so it waits for it even where the popup's rule does not (a held slot's plain cancel):
  // a held slot whose receipt then reads paid would otherwise open on "nothing to refund".
  const loading = exit.kind === "waiting" || kept === undefined;
  // A failed read again with an answer still on screen: the page keeps it and says so.
  const stale = bookingFailure ?? (loading ? null : moneyFailure);

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
    const fresh = bookingExit({ booking: current, invoice, cases, now: at });
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

  if (loading) {
    const failed = money.failure;
    if (!failed) {
      return <RefundSkeleton booking={booking} bookingId={booking.id} now={now} serviceName={service.data?.name} />;
    }
    const failure = refundFailure(failed.error);
    if (failure === "signIn") return <RefundSignIn bookingId={booking.id} />;
    const words = MONEY_FAILED[failed.read];
    const forbidden = moneyReadProblem(failed.error) === "forbidden";
    return (
      <RefundFailed
        bookingId={booking.id}
        deadline={deadlineLine(booking, now)}
        failure={failure}
        refused={t(forbidden ? words.forbidden : words.refused)}
        retry={money.reload}
        retryBody={t("states.moneyFailedBody")}
        title={t(forbidden ? words.forbiddenTitle : words.title)}
      />
    );
  }
  if (exit.kind === "paidElsewhere") return <RefundPaidElsewhere booking={booking} now={now} receipt={exit.receipt} />;
  if (!invoice || exit.kind === "none" || exit.kind === "cancel" || exit.kind === "rescheduled") {
    return <RefundNothing booking={booking} rescheduled={exit.kind === "rescheduled"} />;
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
          rereadFailed={bookingFailure !== null}
          stillOffered={stillOffered}
          onCancelledOnly={(at, failure) => {
            setDone({ cancelledAt: at, failure, notice: t(CANCELLED_ONLY[failure], { amount: format.baht(exit.refundSatang) }) });
            refresh();
          }}
          onOpened={({ refund, alreadyOpen }, at) => {
            setDone(
              alreadyOpen
                ? { cancelledAt: at, refund, notice: t("errors.alreadyOpen") }
                : { cancelledAt: at, refund, announce: t("announce.cancelled", { amount: format.baht(exit.refundSatang) }) },
            );
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
          failed={done.failure}
          invoice={invoice}
          notice={notice}
          onOpened={({ refund, alreadyOpen }) =>
            setDone(
              alreadyOpen
                ? { cancelledAt: done.cancelledAt, refund, notice: t("errors.alreadyOpen") }
                : {
                    cancelledAt: done.cancelledAt,
                    refund,
                    announce: t("announce.claimed", { amount: format.baht(exit.refundSatang) }),
                  },
            )
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
          onOpened={({ refund, alreadyOpen }, line) =>
            setDone(
              alreadyOpen
                ? { refund, notice: t("errors.alreadyOpenReport") }
                : { refund, notice: line, announce: t("announce.reported") },
            )
          }
          stillOffered={stillOffered}
        />
      );
      break;
    default:
      mode = <RefundStatusMode booking={current} exit={exit} invoice={invoice} notice={notice} />;
  }

  return (
    // Cancel mode's own "keep the booking" goes back to the popup, so from lg the column draws no second way back,
    // only its height: the card starts where the skeleton and the status the press swaps in do.
    <DetailColumn back={exit.kind === "cancelRefund" ? { ...back, fromLg: "space" } : back}>
      <p aria-live="polite" className="sr-only">
        {done.announce}
      </p>
      {stale ? <StaleNotice bookingId={booking.id} failure={stale} retry={refresh} /> : null}
      {mode}
    </DetailColumn>
  );
}

/** A trail of four steps: a cancellation's request on record, the card a popup's refund row opens on. */
const TRAIL_BONES = ["กกกกกกกกก กกกกกก", "กกกกกกกก กกกกกกก", "กกกกกก กกกกกกกกกกก", "กกกกกก กกกกก กก กกกกกก"] as const;

/**
 * The card's own shape while the booking and its money load, still, no
 * shimmer, built in each mode's own boxes and words, so the page keeps its
 * height when the data lands. Once the booking is known, it and the clock
 * say the mode a paid booking with no request takes (`paidWay`): the cancel
 * at its share, the claim at its share, or the report's form.
 *
 * Whether a cancelled booking has its request yet is in the money. The
 * advisee's own cancel here files it in the same press, so their full-share
 * cancel opens on its status: the claim's body too, the head beside four
 * steps, but with the status's one-line meta and no button. A half share
 * keeps the claim's box. Before the booking is known, or for a window shut,
 * the head beside a trail of four steps.
 */
function RefundSkeleton({
  bookingId,
  booking,
  now,
  serviceName,
}: {
  readonly bookingId?: string;
  readonly booking?: ApiBooking;
  /** The clock the page reads its rule at. */
  readonly now?: number;
  readonly serviceName?: string;
}) {
  const t = useTranslations("bookingRefund");
  const back = useBack(bookingId);
  const way = booking && now !== undefined ? paidWay(booking, now) : undefined;

  let shape: ReactNode;
  if (booking && way?.kind === "report") {
    shape = (
      <>
        <RefundCard
          foot={<ReportFormBones booking={booking} />}
          head={
            <RefundHeadBones serviceName={serviceName} title={t("head.report")}>
              <ReportHeadBones booking={booking} />
            </RefundHeadBones>
          }
        />
        <RefundActionsBones />
      </>
    );
  } else if (way?.kind === "cancelRefund") {
    shape = <CancelBones serviceName={serviceName} way={way} />;
  } else if (booking && way?.kind === "claim" && (way.share === "half" || way.by === "other")) {
    shape = <ClaimBones booking={booking} serviceName={serviceName} way={way} />;
  } else {
    const filed = way?.kind === "claim";
    shape = (
      <>
        <RefundCard
          head={
            <RefundHeadBones
              meta={filed ? t("meta.status.requested") : "กกกกกกกกก กกกกก 00 กกกกกก"}
              serviceName={serviceName}
              title={filed ? t("stage.requested") : undefined}
            />
          }
        >
          <RefundSection heading={<Bone text={filed ? t("progress.heading") : "กกกกกกกก"} />}>
            <RefundList ordered={filed}>
              {TRAIL_BONES.map((line) => (
                <RefundRowBones key={line} sub="0 กก 0000 · 00:00" title={line} />
              ))}
            </RefundList>
          </RefundSection>
        </RefundCard>
        {filed ? null : <RefundActionsBones />}
      </>
    );
  }

  return (
    <DetailColumn back={back}>
      <div aria-busy className="flex w-full flex-col">
        <span className="sr-only" role="status">
          {t("busy.loading")}
        </span>
        <div aria-hidden className="flex w-full flex-col gap-6 lg:gap-8">
          {shape}
        </div>
      </div>
    </DetailColumn>
  );
}
