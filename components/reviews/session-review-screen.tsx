"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleCheckBig, Info, Star, TriangleAlert, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, useCallback, useId, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { DetailColumn } from "@/components/bookings/booking-detail-screen";
import { asUuid, liveAdvisorHref } from "@/components/bookings/booking-flow";
import { AdvisorFace, useClock } from "@/components/bookings/booking-sheet";
import { PILL_LG, SHEET_X } from "@/components/payment/invoice-screens";
import { Stars } from "@/components/reviews/review-parts";
import { REVIEW_STARS_MAX, REVIEW_TEXT_MAX_LENGTH } from "@/components/reviews/reviews-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { createBookingReview, getAdvisor, getBooking, getBookingReview, getService } from "@/lib/api/resources";
import type { ApiBooking, ApiPublicAdvisor, ApiPublicService, ApiReview } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/reviews/session?booking=`: rating one consultation, read from and written
 * to the API, laid out as the booking's own page is (`DetailColumn`): one card
 * in the panel's narrow column, its next steps under it.
 *
 * ## Which consultation
 *
 * A review is addressed by its booking — `GET|POST|PUT /bookings/:bookingId/review`
 * — because a review has no id of its own: the appointment's id *is* the review's.
 * The id comes from `?booking=<uuid>`, read behind a `Suspense` boundary as
 * `useSearchParams` needs under `output: "export"`. Without one there is nothing
 * to review, and the screen says so rather than showing a form that could not
 * be submitted. The booking itself names the service and the advisor, so the
 * card says who and what is being rated.
 *
 * ## Which state
 *
 * - **404 "Review not found"** is the ordinary answer for a consultation nobody
 *   has reviewed, so it opens the rating form. It is not an error state.
 * - **200** means it is on record, so it opens the recap — with the stars, the
 *   comment and any reply as they actually are.
 * - A booking that is not `COMPLETED` cannot be reviewed yet (the API answers
 *   409 to the attempt), so it says so before the reader writes anything.
 *
 * `state="submitted"` still forces the recap for `/reviews/session/submitted`.
 *
 * ## What it writes
 *
 * `POST /bookings/:bookingId/review`, once. `CreateReviewDto` takes `stars`
 * (integer 1–5) and an optional `comment` up to 4,000 characters; a failure is
 * the API's own sentence. `PUT` would replace a review and is wired as
 * `putBookingReview`, but is not reachable from here: the card says a review is
 * public and cannot be changed once sent, and an edit button would contradict it.
 */
export function SessionReviewScreen({
  state = "default",
}: {
  readonly state?: "default" | "submitted";
}) {
  const t = useTranslations("reviews");

  return (
    <Suspense
      fallback={
        <DetailColumn crumb={t("crumb")}>
          <ReviewSkeleton />
        </DetailColumn>
      }
    >
      <ReviewForBooking forceSubmitted={state === "submitted"} />
    </Suspense>
  );
}

/** The booking named in `?booking=`, if it is one. */
function ReviewForBooking({ forceSubmitted }: { readonly forceSubmitted: boolean }) {
  const t = useTranslations("reviews");
  const bookingId = asUuid(useSearchParams().get("booking"));

  if (!bookingId) {
    return (
      <ReviewState body={t("noBookingBody")} icon={Star} title={t("noBookingTitle")} />
    );
  }
  return <BookingReview bookingId={bookingId} forceSubmitted={forceSubmitted} key={bookingId} />;
}

/** The booking, and the review it has or has not got. */
function BookingReview({ bookingId, forceSubmitted }: { readonly bookingId: string; readonly forceSubmitted: boolean }) {
  const s = useTranslations("search");
  const reviewFetcher = useCallback(
    async (signal: AbortSignal) => {
      try {
        return await getBookingReview(bookingId, signal);
      } catch (cause) {
        // 404 is "nobody has reviewed this yet", which is the form's cue.
        if (cause instanceof ApiError && cause.status === 404) return null;
        throw cause;
      }
    },
    [bookingId],
  );
  const bookingFetcher = useCallback((signal: AbortSignal) => getBooking(bookingId, signal), [bookingId]);
  const review = useResource<ApiReview | null>(`bookings/${bookingId}/review`, reviewFetcher);
  const booking = useResource<ApiBooking>(`bookings/${bookingId}`, bookingFetcher);

  const failed = review.error ?? booking.error;
  if (failed) {
    return (
      <ReviewState
        body={failed.message}
        icon={TriangleAlert}
        retry={() => {
          review.reload();
          booking.reload();
        }}
        title={s("loadFailedTitle")}
      />
    );
  }
  if (review.loading || booking.loading || !booking.data) {
    return (
      <DetailColumn>
        <ReviewSkeleton />
      </DetailColumn>
    );
  }
  return (
    <ReviewContent
      booking={booking.data}
      forceSubmitted={forceSubmitted}
      onSubmitted={review.reload}
      review={review.data ?? null}
    />
  );
}

/** The booking's service and advisor joined, then the state the review is in. */
function ReviewContent({
  booking,
  review,
  forceSubmitted,
  onSubmitted,
}: {
  readonly booking: ApiBooking;
  readonly review: ApiReview | null;
  readonly forceSubmitted: boolean;
  readonly onSubmitted: () => void;
}) {
  const t = useTranslations("reviews");
  const fetchService = useCallback((signal: AbortSignal) => getService(booking.serviceId, signal), [booking.serviceId]);
  const fetchAdvisor = useCallback((signal: AbortSignal) => getAdvisor(booking.advisorId, signal), [booking.advisorId]);
  const service = useResource<ApiPublicService>(`services/${booking.serviceId}`, fetchService);
  const advisor = useResource<ApiPublicAdvisor>(`advisors/${booking.advisorId}`, fetchAdvisor);
  const subject = (
    <ReviewSubject advisor={advisor.data} booking={booking} serviceName={service.data?.name ?? review?.serviceName} />
  );

  let body: ReactNode;
  if (review || forceSubmitted) body = <Recap advisorId={booking.advisorId} review={review} subject={subject} />;
  else if (booking.state !== "COMPLETED") body = <NotYet subject={subject} />;
  else body = <RatingForm bookingId={booking.id} onSubmitted={onSubmitted} subject={subject} />;

  return <DetailColumn crumb={t("crumb")}>{body}</DetailColumn>;
}

/** The card every state draws: the receipt's paper, the booking's card. */
const CARD = cn("flex w-full flex-col rounded-card border border-hero-card-border bg-card pt-6 pb-6 shadow-hero-card lg:pt-9 lg:pb-9", SHEET_X);

/** Where the card's own content starts under the subject, a hairline between. */
const UNDER_SUBJECT = "mt-5 flex flex-col border-t border-border pt-5 lg:mt-7 lg:pt-7";

/** The way on under the card, the receipt's capsules. */
const PILL = cn("md:h-11 md:text-sm", PILL_LG);

/**
 * Who and what is being rated, as a card about a booking opens: the advisor's
 * face, the service, and with whom and when.
 */
function ReviewSubject({
  booking,
  advisor,
  serviceName,
}: {
  readonly booking: ApiBooking;
  readonly advisor: ApiPublicAdvisor | undefined;
  readonly serviceName: string | undefined;
}) {
  const format = useFormatter();
  const clock = useClock();
  const start = new Date(booking.startTime);

  return (
    <header className="flex items-center gap-3 lg:gap-4">
      <AdvisorFace advisor={advisor} className="size-11 text-sm lg:size-14 lg:text-frame-body" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
        <p className="truncate text-base font-semibold text-foreground lg:text-frame-figure">{serviceName}</p>
        <p className="truncate text-sm text-muted-foreground lg:text-frame-meta">
          {advisor ? `${advisor.displayName} · ` : null}
          {format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          {" · "}
          <span className="font-latin tabular-nums">
            {clock(start)} – {clock(booking.endTime)}
          </span>
        </p>
      </div>
    </header>
  );
}

/** The word for a number of stars, as a rating prompt says it back. */
function useStarWord(): (stars: number) => string {
  const t = useTranslations("reviews");
  const words = [t("starWord1"), t("starWord2"), t("starWord3"), t("starWord4"), t("starWord5")];
  return (stars) => words[stars - 1] ?? "";
}

/**
 * The rating still to be sent: the prompt, five stars that fill up to the one
 * under the pointer and say its word beside them, the comment with its count,
 * and before the button the line that says a review is public and final, so
 * the reader knows it before they press rather than after.
 */
function RatingForm({
  bookingId,
  subject,
  onSubmitted,
}: {
  readonly bookingId: string;
  readonly subject: ReactNode;
  /** The review landed: read it again, so the recap shows it as stored. */
  readonly onSubmitted: () => void;
}) {
  const t = useTranslations("reviews");
  const format = useFormatter();
  const word = useStarWord();
  const heading = useId();
  const commentId = useId();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const shown = hover || stars;

  async function submit() {
    if (stars < 1 || sending) return;
    setFailure(null);
    setSending(true);
    try {
      const body = comment.trim();
      await createBookingReview(bookingId, { stars, ...(body ? { comment: body } : {}) });
      invalidate(`bookings/${bookingId}/review`);
      invalidate("advisors/");
      onSubmitted();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : t("submitError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <article aria-labelledby={heading} className={CARD}>
        {subject}
        <div className={UNDER_SUBJECT}>
          <h1 className="text-lg font-semibold text-foreground lg:text-frame-heading" id={heading}>
            {t("promptTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground lg:mt-1.5 lg:text-frame-meta">{t("promptBody")}</p>

          <div className="mt-4 flex items-center gap-3 lg:mt-6 lg:gap-4">
            {/* The hover lights the stars up to the one under the pointer; it
                clears as the pointer leaves a star, so the group itself needs
                no handler of its own. */}
            <div aria-label={t("promptTitle")} className="-ml-1.5 flex items-center" role="radiogroup">
              {Array.from({ length: REVIEW_STARS_MAX }, (_, i) => i + 1).map((value) => (
                <Button
                  aria-checked={stars === value}
                  aria-label={t("starAria", { count: value, word: word(value) })}
                  className="size-11 rounded-full hover:bg-transparent lg:size-14"
                  key={value}
                  onClick={() => {
                    setStars(value);
                    setFailure(null);
                  }}
                  onMouseEnter={() => setHover(value)}
                  onMouseLeave={() => setHover(0)}
                  role="radio"
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Star
                    aria-hidden
                    className={cn(
                      "size-8 transition-colors duration-100 motion-reduce:transition-none lg:size-10",
                      value <= shown ? "fill-primary text-primary" : "fill-muted text-accented",
                    )}
                    strokeWidth={1.5}
                  />
                </Button>
              ))}
            </div>
            <span aria-hidden className="text-sm font-medium text-foreground lg:text-frame-meta">
              {shown > 0 ? word(shown) : null}
            </span>
          </div>

          <label className="mt-5 text-sm font-medium text-foreground lg:mt-7 lg:text-frame-meta" htmlFor={commentId}>
            {t("commentLabel")}
          </label>
          <Textarea
            aria-invalid={failure !== null || undefined}
            className="mt-2 min-h-32 resize-none rounded-xl bg-card px-3.5 py-3 text-sm field-sizing-fixed lg:mt-3 lg:min-h-44 lg:px-4 lg:text-frame-meta"
            id={commentId}
            maxLength={REVIEW_TEXT_MAX_LENGTH}
            onChange={(event) => {
              setComment(event.target.value);
              setFailure(null);
            }}
            placeholder={t("commentPlaceholder")}
            value={comment}
          />
          <p className="mt-1.5 self-end font-latin text-xs tabular-nums text-muted-foreground lg:text-frame-label">
            {format.number(comment.length)}/{format.number(REVIEW_TEXT_MAX_LENGTH)}
          </p>

          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground lg:mt-4 lg:text-frame-label">
            <Info aria-hidden className="mt-px size-3.5 shrink-0 lg:size-4" />
            {t("submittedNote")}
          </p>
          {failure ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-destructive lg:text-frame-meta" role="alert">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {failure}
            </p>
          ) : null}
        </div>
      </article>

      <div className="flex flex-col gap-2.5">
        <Button
          className={cn(authPill(true), PILL, "disabled:opacity-40")}
          disabled={stars < 1 || sending}
          onClick={() => void submit()}
          type="button"
        >
          {failure ? t("retry") : t("submitReview")}
        </Button>
        <Button className={cn(authPill(false), PILL)} nativeButton={false} render={<Link href="/bookings" />} variant="outline">
          {t("later")}
        </Button>
      </div>
    </>
  );
}

/**
 * The review on record: sent and when, the stars with their word, the comment
 * as a quote, and the advisor's reply under it when there is one.
 *
 * `review` is null only when the route forces the recap without one on record;
 * the card then says it was sent and leaves the rest out rather than filling it
 * with a made-up quote.
 */
function Recap({
  review,
  subject,
  advisorId,
}: {
  readonly review: ApiReview | null;
  readonly subject: ReactNode;
  readonly advisorId: string;
}) {
  const t = useTranslations("reviews");
  const format = useFormatter();
  const word = useStarWord();
  const heading = useId();

  return (
    <>
      <article aria-labelledby={heading} className={CARD}>
        {subject}
        <div className={UNDER_SUBJECT}>
          <h1
            className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium text-success lg:gap-x-2 lg:text-frame-meta"
            id={heading}
          >
            <CircleCheckBig aria-hidden className="size-4 shrink-0 lg:size-5" />
            {t("submittedHeading")}
            {review ? (
              <span className="font-normal text-muted-foreground">
                · {format.dateTime(new Date(review.createdAt), { day: "numeric", month: "short", year: "numeric" })}
              </span>
            ) : null}
          </h1>
          {review ? (
            <>
              <div className="mt-4 flex items-center gap-3 lg:mt-5">
                <Stars filled={review.stars} gap={4} size={24} />
                <span className="text-sm font-medium text-foreground lg:text-frame-meta">{word(review.stars)}</span>
              </div>
              {review.comment ? (
                <blockquote className="mt-4 text-sm leading-relaxed whitespace-pre-line text-foreground lg:mt-5 lg:text-frame-body">
                  “{review.comment}”
                </blockquote>
              ) : null}
              {review.advisorReply ? (
                <div className="mt-4 flex flex-col gap-1 rounded-xl bg-muted/60 p-4 lg:mt-5 lg:gap-1.5 lg:p-5">
                  <p className="text-xs font-medium text-muted-foreground lg:text-frame-label">{t("advisorReplyLabel")}</p>
                  <p className="text-sm whitespace-pre-line text-foreground lg:text-frame-meta">{review.advisorReply}</p>
                </div>
              ) : null}
            </>
          ) : null}
          <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground lg:mt-6 lg:text-frame-label">
            <Info aria-hidden className="mt-px size-3.5 shrink-0 lg:size-4" />
            {t("submittedNote")}
          </p>
        </div>
      </article>

      <div className="flex flex-col gap-2.5">
        <Button className={cn(authPill(true), PILL)} nativeButton={false} render={<Link href="/bookings" />}>
          {t("backToBookings")}
        </Button>
        <Button
          className={cn(authPill(false), PILL)}
          nativeButton={false}
          render={<Link href={liveAdvisorHref(advisorId)} />}
          variant="outline"
        >
          {t("viewAdvisor")}
        </Button>
      </div>
    </>
  );
}

/** A consultation still ahead, or one that never took place: nothing to rate yet. */
function NotYet({ subject }: { readonly subject: ReactNode }) {
  const t = useTranslations("reviews");
  const heading = useId();

  return (
    <>
      <article aria-labelledby={heading} className={CARD}>
        {subject}
        <div className={UNDER_SUBJECT}>
          <h1 className="text-base font-semibold text-foreground lg:text-frame-figure" id={heading}>
            {t("notCompletedTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground lg:mt-1.5 lg:text-frame-meta">{t("notCompletedBody")}</p>
        </div>
      </article>
      <Button className={cn(authPill(true), PILL)} nativeButton={false} render={<Link href="/bookings" />}>
        {t("backToBookings")}
      </Button>
    </>
  );
}

/**
 * Nothing to show, unboxed as the booking's own missing page is: one muted
 * icon, what went wrong, and the way back, with the retry when asking again
 * could change it.
 */
function ReviewState({
  icon: Icon,
  title,
  body,
  retry,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly retry?: () => void;
}) {
  const t = useTranslations("reviews");
  const pill = "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

  return (
    <DetailColumn crumb={t("crumb")}>
      <div
        aria-live="polite"
        className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:gap-5 lg:rounded-2xl lg:border lg:border-border lg:py-20"
        role="status"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
          <Icon aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
        </span>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-base font-semibold text-foreground lg:text-frame-figure">{title}</h1>
          <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{body}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {retry ? (
            <Button className={cn(authPill(false), pill)} onClick={retry} type="button" variant="outline">
              {t("retry")}
            </Button>
          ) : null}
          <Button className={cn(authPill(true), pill)} nativeButton={false} render={<Link href="/bookings" />}>
            {t("backToBookings")}
          </Button>
        </div>
      </div>
    </DetailColumn>
  );
}

/** The card's own shape while the booking and its review load. */
function ReviewSkeleton() {
  const bone = "animate-pulse bg-muted motion-reduce:animate-none";

  return (
    <div aria-busy className="flex w-full flex-col gap-6 lg:gap-8">
      <div aria-hidden className={cn(CARD, "gap-5 lg:gap-7")}>
        <div className="flex items-center gap-3 lg:gap-4">
          <span className={cn(bone, "size-11 shrink-0 rounded-full lg:size-14")} />
          <span className="flex flex-1 flex-col gap-2">
            <span className={cn(bone, "h-4 w-2/3 rounded lg:h-5")} />
            <span className={cn(bone, "h-3.5 w-1/2 rounded lg:h-4")} />
          </span>
        </div>
        <span className={cn(bone, "h-6 w-1/2 rounded-lg lg:h-8")} />
        <span className={cn(bone, "h-10 w-56 rounded-lg lg:h-14 lg:w-72")} />
        <span className={cn(bone, "h-32 w-full rounded-xl lg:h-44")} />
      </div>
      <span aria-hidden className={cn(bone, "h-11 w-full rounded-full lg:h-14")} />
    </div>
  );
}
