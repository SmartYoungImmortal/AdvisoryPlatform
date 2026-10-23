"use client";

import { useSearchParams } from "next/navigation";
import { CircleCheckBig, Clock, Star, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { EmptyState } from "@/components/mobile/empty-state";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
} from "@/components/mobile/screen";
import {
  ACCOUNT_CONFIRM_PANEL,
  ACCOUNT_NAV,
} from "@/components/profile/account-chrome";
import { ChatMark } from "@/components/chat/chat-avatar";
import { Stars } from "@/components/reviews/review-parts";
import {
  REVIEW_STARS_MAX,
  REVIEW_TEXT_MAX_LENGTH,
  pendingCopy,
} from "@/components/reviews/reviews-data";
import { TopBar } from "@/components/topbar";
import { ApiError } from "@/lib/api/client";
import { createBookingReview, getBookingReview } from "@/lib/api/resources";
import type { ApiReview } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * Figma "Review - Submit failed (Light)" (995:9723) and "Review - Already
 * submitted (Light)" (995:9650), read from and written to the API.
 *
 * ## Which consultation
 *
 * A review is addressed by its booking — `GET|POST|PUT /bookings/:bookingId/review`
 * — because a review has no id of its own: the appointment's id *is* the review's.
 * This route has no booking in its path, so the id comes from `?booking=<uuid>`,
 * read behind a `Suspense` boundary the way `components/work/session-detail.tsx`
 * does it. Without one there is nothing to review, and the screen says so rather
 * than showing a rating form that could not be submitted.
 *
 * ## Which of the two frames
 *
 * The frames were two routes. They are now the two answers the API gives:
 *
 * - **404 "Review not found"** is the ordinary answer for a consultation nobody
 *   has reviewed, so it opens the rating form. It is not an error state.
 * - **200** means it is on record, so it opens the recap — with the stars and the
 *   comment that were actually sent, not the frame's quote.
 *
 * `state="submitted"` still forces the recap for `/reviews/session/submitted`.
 *
 * ## What it writes
 *
 * `POST /bookings/:bookingId/review`, once. `CreateReviewDto` takes `stars`
 * (integer 1–5) and an optional `comment` up to 4,000 characters. A `409` is the
 * two cases worth telling apart — "A consultation can only be reviewed once it is
 * completed" and "This consultation has already been reviewed" — and both arrive
 * as the API's own sentence rather than being guessed at here.
 *
 * `PUT` on the same path would replace a review, and it is wired in
 * `lib/api/resources.ts` as `putBookingReview`. It is deliberately not reachable
 * from this screen: the frame's own closing line is "รีวิวจะแสดงต่อสาธารณะและ
 * แก้ไขไม่ได้หลังส่ง", so offering an edit here would contradict the copy directly
 * above it. That is a product decision to make before the button exists, not one
 * to smuggle in with the wiring.
 *
 * ## What it cannot show
 *
 * The frame's hero is a portrait of the advisor and its summary card counts the
 * call's duration and the files shared. None of that is in `ReviewResponseDto`, no
 * route presigns another user's avatar, and there is no call-duration resource at
 * all — so the hero takes a glyph and the summary shows the consultation's own
 * length, which the review row does carry.
 */

export function SessionReviewScreen({
  state = "default",
}: {
  readonly state?: "default" | "submitted";
}) {
  return (
    <MobileScreen className="pt-6 lg:pt-0" wide>
      <ScreenBody>
        <div className={ACCOUNT_NAV}>
          <TopBar unreadNotifications />
        </div>

        <div
          className={cn(
            "flex w-full flex-1 flex-col items-center",
            ACCOUNT_CONFIRM_PANEL,
            "lg:mt-18",
          )}
        >
          {/* `useSearchParams` needs a boundary under `output: "export"`, or the
              exported HTML renders empty — same reason and same shape as
              `components/work/work-screens.tsx`. */}
          <Suspense fallback={<NoBooking />}>
            <ReviewForBooking forceSubmitted={state === "submitted"} />
          </Suspense>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

/** The booking named in `?booking=`, and the review it has or has not got. */
function ReviewForBooking({ forceSubmitted }: { readonly forceSubmitted: boolean }) {
  const bookingId = useSearchParams().get("booking");

  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      if (!bookingId) throw new Error("No booking in the query string");
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
  const review = useResource<ApiReview | null>(
    bookingId ? `bookings/${bookingId}/review` : "bookings/none/review",
    fetcher,
  );

  if (!bookingId) return <NoBooking />;
  if (review.loading) return <RecapSkeleton />;
  if (review.error) return <ReadFailed message={review.error.message} />;
  if (review.data || forceSubmitted) {
    return <AlreadySubmitted review={review.data ?? null} />;
  }
  return <RatingForm bookingId={bookingId} />;
}

/** No `?booking=`, so there is no consultation to be reviewing. */
function NoBooking() {
  const t = useTranslations("reviews");

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-center justify-center pt-10">
        <EmptyState
          body={pendingCopy(
            t,
            "noBookingBody",
            "เปิดหน้านี้จากรายการจองที่จบแล้ว ระบบจะรู้ว่าคุณกำลังรีวิวครั้งไหน",
          )}
          icon={Star}
          title={pendingCopy(t, "noBookingTitle", "ไม่มีการปรึกษาที่จะรีวิว")}
        />
      </div>
      <ScreenActions className="lg:pt-7 lg:pb-4">
        <PrimaryButton className="lg:w-60" href="/bookings">
          {t("backToBookings")}
        </PrimaryButton>
      </ScreenActions>
    </>
  );
}

/** The read failed for a reason that is not "no review yet". */
function ReadFailed({ message }: { readonly message: string }) {
  const t = useTranslations("reviews");
  const s = useTranslations("search");

  return (
    <>
      <div className="flex w-full shrink-0 flex-col items-center gap-3 px-6 pt-14 text-center">
        <TriangleAlert className="size-8 text-destructive" />
        <p className="w-full text-lg font-semibold text-foreground">
          {s("loadFailedTitle")}
        </p>
        <p className="w-full text-sm font-normal text-muted-foreground">{message}</p>
      </div>
      <ScreenSpacer className="lg:hidden" />
      <ScreenActions className="lg:pt-7 lg:pb-4">
        <PrimaryButton className="lg:w-60" href="/bookings">
          {t("backToBookings")}
        </PrimaryButton>
      </ScreenActions>
    </>
  );
}

function RecapSkeleton() {
  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-4 px-6 pt-14">
      <div className="size-24 shrink-0 rounded-full bg-muted" />
      <div className="h-7 w-2/3 rounded-md bg-muted" />
      <div className="h-4 w-4/5 rounded-md bg-muted" />
      <div className="h-24 w-full rounded-card bg-muted" />
    </div>
  );
}

/**
 * The panel contents of Figma 995:9723 — the rating still waiting to be sent.
 *
 * The frame draws a five-star row as five ghost buttons and a comment box with
 * nothing behind either. They are real now: the stars are the rating, the box is
 * the comment, and the submit writes. The error line under them is the API's own
 * sentence, which is the only thing that separates "this consultation is not
 * completed" from "you already reviewed it".
 */
function RatingForm({ bookingId }: { readonly bookingId: string }) {
  const t = useTranslations("reviews");

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (stars < 1 || sending) return;
    setFailure(null);
    setSending(true);
    try {
      const body = comment.trim();
      await createBookingReview(bookingId, {
        stars,
        ...(body ? { comment: body } : {}),
      });
      invalidate(`bookings/${bookingId}/review`);
      invalidate("advisors/");
      setDone(true);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return <AlreadySubmitted review={null} />;
  }

  return (
    <>
      {/* Figma "Ended Hero": 70px inset, 96px avatar, then the 40/20 text block.
          The portrait is a glyph: the review routes name no advisor and no route
          presigns another user's avatar. */}
      <div className="flex w-full shrink-0 flex-col items-center pt-[70px] lg:pt-4">
        <ChatMark size={96} />
        <div className="flex w-full shrink-0 flex-col items-center gap-1.5 px-6 pt-4.5 text-center">
          <p className="w-full text-heading font-semibold text-foreground">
            {t("endedTitle")}
          </p>
        </div>
      </div>

      {/* Figma "Review Prompt": 24/20 copy, a 44px star row, then the comment box. */}
      <div className="flex w-full shrink-0 flex-col items-center px-6 pt-6">
        <p className="w-full text-center text-base font-medium text-foreground">
          {t("promptTitle")}
        </p>
        <p className="mt-1.5 w-full text-center text-sm font-normal text-muted-foreground">
          {t("promptBody")}
        </p>
        <div className="mt-3.5 flex shrink-0 items-center gap-2">
          {Array.from({ length: REVIEW_STARS_MAX }, (_, i) => i + 1).map((value) => (
            <Button
              aria-label={String(value)}
              aria-pressed={stars === value}
              className="size-11 shrink-0"
              key={value}
              onClick={() => setStars(value)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Star
                className={cn(
                  "size-7 text-primary",
                  value <= stars ? "fill-primary" : "fill-transparent",
                )}
              />
            </Button>
          ))}
        </div>
        <Textarea
          aria-invalid={failure !== null || undefined}
          aria-label={t("promptTitle")}
          className="mt-3.5 h-24 resize-none bg-muted px-3 text-sm shadow-none field-sizing-fixed"
          maxLength={REVIEW_TEXT_MAX_LENGTH}
          onChange={(event) => {
            setComment(event.target.value);
            setFailure(null);
          }}
          value={comment}
        />
      </div>

      {/* Figma "Submit Error": 14px glyph beside a 12/18 destructive line. */}
      {failure ? (
        <div className="flex w-full shrink-0 items-start gap-2 px-6 pt-2">
          <TriangleAlert className="size-3.5 shrink-0 text-destructive" />
          <p className="min-w-px flex-1 text-xs font-normal text-destructive" role="alert">
            {failure}
          </p>
        </div>
      ) : null}

      {/* The phone frame pins its actions to the bottom edge; the panel is only
          as tall as its content, so the spacer goes with the frame and the stack
          turns into Figma's right-aligned row. */}
      <ScreenSpacer className="lg:hidden" />
      <ScreenActions className="lg:flex-row-reverse lg:justify-start lg:pt-8 lg:pb-0">
        <PrimaryButton
          className="lg:w-auto disabled:opacity-40"
          disabled={stars < 1 || sending}
          onClick={() => void submit()}
          type="button"
        >
          {failure ? t("retry") : pendingCopy(t, "submitReview", "ส่งรีวิว")}
        </PrimaryButton>
        <NeutralButton className="lg:w-auto" href="/profile">
          {t("backHome")}
        </NeutralButton>
      </ScreenActions>
    </>
  );
}

/**
 * The panel contents of Figma "Review - Already submitted (Light)" (995:9650).
 *
 * Nothing here takes input: the rating is on record, so the 44px star buttons of
 * the rating state are a plain 18px row and the comment box is the quote it
 * became. There is one way on, and it leaves the flow.
 *
 * `review` is null when the frame is forced by the route or when a submit has just
 * landed and the list has not been read again; the recap then shows what it knows
 * and leaves the rest out rather than filling it with the frame's fixture.
 */
function AlreadySubmitted({ review }: { readonly review: ApiReview | null }) {
  const t = useTranslations("reviews");
  const s = useTranslations("search");
  const submittedAt = review
    ? new Date(review.modifiedAt).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      {/* Figma "Hero": 72px inset, a 96px success badge, then a 22px gap to the
          40/20/18 text block. */}
      <div className="flex w-full shrink-0 flex-col items-center gap-5.5 px-6 pt-18 lg:pt-4">
        <span className="flex size-24 shrink-0 items-center justify-center overflow-clip rounded-full bg-success-surface">
          <CircleCheckBig className="size-11 text-success" />
        </span>
        <div className="flex w-full shrink-0 flex-col items-center gap-2.5 overflow-clip text-center">
          <p className="w-full text-heading font-semibold text-foreground">
            {t("submittedTitle")}
          </p>
          {submittedAt ? (
            <p className="w-full text-xs font-normal text-muted-foreground">
              {submittedAt}
            </p>
          ) : null}
        </div>
      </div>

      {/* Figma "Recap": the rating and the comment as they were sent, then the
          12/18 line that says why there is nothing to change here. */}
      <div className="flex w-full shrink-0 flex-col items-center gap-2.5 px-6 pt-6">
        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip rounded-card bg-card p-3.5 lg:bg-muted/50">
          <div className="flex w-full shrink-0 items-center gap-2.5">
            <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
              {t("submittedRatingLabel")}
            </span>
            <Stars filled={review?.stars ?? 0} gap={4} size={18} />
          </div>
          {review?.comment ? (
            <p className="w-full text-sm font-normal text-foreground">
              {review.comment}
            </p>
          ) : null}
          {review ? (
            <div className="flex h-5 w-full shrink-0 items-center gap-2.5">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                {t("durationLabel")}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums whitespace-nowrap text-foreground">
                {s("durationMinutes", { count: review.serviceDurationMinutes })}
              </span>
            </div>
          ) : null}
        </div>
        <p className="w-full text-center text-xs font-normal text-muted-foreground">
          {t("submittedNote")}
        </p>
      </div>

      <ScreenSpacer className="lg:hidden" />
      <ScreenActions className="lg:pt-7 lg:pb-4">
        <PrimaryButton className="lg:w-60" href="/bookings">
          {t("backToBookings")}
        </PrimaryButton>
      </ScreenActions>
    </>
  );
}
