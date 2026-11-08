"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { ThaiText } from "@/components/mobile/thai-text";
import { useOwnProfile } from "@/components/profile/profile-data";
import { ApiErrorCard } from "@/components/service/parts";
import { DESK_BOX, DeskPage } from "@/components/work/desk-page";
import {
  ReplyComposer,
  ReviewCard,
  ReviewerMark,
  Stars,
} from "@/components/reviews/review-parts";
import { listOwnAdvisorReviews, replyToReview } from "@/components/reviews/reviews-data";
import type { Paginated } from "@/lib/api/client";
import { getAdvisorRatingSummary } from "@/lib/api/resources";
import type { ApiRatingSummary, ApiReview } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * Figma "Advisor - My reviews" (995:9772) and its empty (995:9561), replying
 * (995:8809) and reply-failed (995:9592) states, read from the API.
 *
 * ## What it reads, and why there are two calls
 *
 * `GET /advisors/me/reviews` is the list. `GET /advisors/:advisorId/reviews/summary`
 * is the score and the five bars — and it needs an advisor id, which is why
 * `GET /users/me` is read first: an advisor's user id *is* their advisor id
 * (verified: `users/me` and the public advisors list agree on it). The API
 * deliberately has no private summary route, so the advisor's own screen reads
 * the public one with their own id and the numbers cannot drift between the two
 * sides of the product.
 *
 * `distribution` always carries all five entries, highest first, so the five bars
 * are rendered straight from it with no gap-filling here. `average` is **null**
 * when `total` is 0 — the DTO says so and the live route confirms it — even though
 * `ApiRatingSummary` types it `number`; hence the guard on `total` before it is
 * shown, and the em dash when there is nothing to average.
 *
 * ## What it writes
 *
 * `PATCH /advisors/me/reviews/:bookingId/reply`, from the composer. The booking's
 * id addresses the review because a review has no id of its own. A failure keeps
 * the draft and shows the API's own sentence, which is the difference between
 * "you are not the advisor on this consultation" and "the API is not running".
 *
 * ## What it cannot show
 *
 * A reviewer's photograph. `reviewerAvatarKey` is a storage key and only
 * `GET /users/me/avatar` presigns one — your own — so there is no route that turns
 * another person's key into a picture. The card shows their initial instead of
 * borrowing a portrait from the fixtures.
 */

/** Figma "Distribution" row — a 6px track with a proportional fill. */
function DistributionRow({ label, fill }: { readonly label: string; readonly fill: number }) {
  return (
    <div className="flex h-3.5 w-full shrink-0 items-center">
      <span className="font-latin w-2 shrink-0 text-xs leading-3.5 font-normal tabular-nums text-muted-foreground">
        {label}
      </span>
      {/* The track was `bg-muted`, which is the tint the whole summary block now
          sits on, so an empty bar was invisible and only the fill read. */}
      <div className="ml-2 h-1.5 min-w-px flex-1 overflow-clip rounded-full bg-accented/60">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

/** Thai short date, e.g. "28 ก.ค." — the card's date column is that narrow. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

/** A card-shaped skeleton, so the list does not reflow when the reviews land. */
function CardSkeleton() {
  return (
    <div aria-hidden className="flex w-full animate-pulse flex-col items-start gap-2.5 py-5 motion-reduce:animate-none lg:py-7">
      <div className="flex w-full shrink-0 items-center gap-2.5">
        <div className="size-9 shrink-0 rounded-full bg-muted" />
        <div className="flex min-w-px flex-1 flex-col gap-1.5">
          <div className="h-3.5 w-1/3 rounded-md bg-muted" />
          <div className="h-3 w-2/5 rounded-md bg-muted" />
        </div>
      </div>
      <div className="h-3.5 w-20 rounded-md bg-muted" />
      <div className="h-4 w-full rounded-md bg-muted" />
      <div className="h-4 w-4/5 rounded-md bg-muted" />
    </div>
  );
}

type ReviewsState = "default" | "empty" | "replying" | "reply-failed";

export function MyReviewsScreen({
  state = "default",
}: {
  /**
   * Which frame the route opens on. Only `empty` still forces anything: the
   * composer is state now, so `/reviews/replying` and `/reviews/reply-failed`
   * cannot seed themselves against a review list that may be empty, and they open
   * on whatever the API says. Composing and failing are both reachable by using
   * the screen.
   */
  readonly state?: ReviewsState;
}) {
  const t = useTranslations("reviews");
  return (
    <DeskPage title={t("title")}>
      <ReceivedReviews state={state} />
    </DeskPage>
  );
}

/**
 * The reviews customers left the advisor, with the score beside them and a
 * reply under each: the `/reviews` page's body, and the "received" half of
 * an advisor's reviews tab on `/profile`.
 */
export function ReceivedReviews({ state = "default" }: { readonly state?: ReviewsState }) {
  const t = useTranslations("reviews");
  const s = useTranslations("search");
  // `reviews.reviewCount` is the frame's fixed "32 รีวิว", so the real count is
  // built from the number and the noun the profile's stat row already owns.
  const p = useTranslations("profile");

  const me = useOwnProfile();
  const advisorId = me.data?.id;

  const listFetcher = useCallback(
    (signal: AbortSignal) => listOwnAdvisorReviews({ limit: 50 }, signal),
    [],
  );
  const reviews = useResource<Paginated<ApiReview>>(
    "advisors/me/reviews?limit=50",
    listFetcher,
  );

  const summaryFetcher = useCallback(
    (signal: AbortSignal) =>
      advisorId
        ? getAdvisorRatingSummary(advisorId, signal)
        : Promise.reject(new Error("No advisor id yet")),
    [advisorId],
  );
  const summary = useResource<ApiRatingSummary>(
    advisorId ? `advisors/${advisorId}/reviews/summary` : "advisors/pending/summary",
    summaryFetcher,
  );

  /** The review whose reply is being written, keyed by its booking id. */
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function closeComposer() {
    setReplyingTo(null);
    setDraft("");
    setFailure(null);
  }

  async function sendReply() {
    const body = draft.trim();
    if (!replyingTo || !body || sending) return;
    setFailure(null);
    setSending(true);
    try {
      await replyToReview(replyingTo, body);
      // The list now carries a reply it did not have.
      invalidate("advisors/me/reviews");
      reviews.reload();
      closeComposer();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSending(false);
    }
  }

  const items = reviews.data?.items ?? [];
  // `state="empty"` forces the frame; otherwise the API's own answer decides,
  // and zero reviews is an answer it gives (the seed has no completed bookings).
  const isEmpty = state === "empty" || (!reviews.loading && !reviews.error && items.length === 0);
  const total = summary.data?.total ?? 0;
  const average = total > 0 ? summary.data?.average : undefined;

  return (
    <>
        {reviews.error ? (
          /* The API's own sentence and a retry. Not the empty state: "nobody has
             reviewed you" and "the list did not load" are different facts. */
          <div className="mt-5 lg:mt-8">
            <ApiErrorCard error={reviews.error} onRetry={reviews.reload} title={s("loadFailedTitle")} />
          </div>
        ) : isEmpty ? (
          <div className={cn(DESK_BOX, "mt-5 flex flex-col items-center gap-3 px-6 py-12 text-center lg:mt-8 lg:gap-5 lg:py-20")}>
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
              <Star aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
            </span>
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{t("emptyTitle")}</h2>
              <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">
                <ThaiText>{t("emptyBody")}</ThaiText>
              </p>
            </div>
          </div>
        ) : (
          /* The reviews as a feed, and the score beside them from `lg` (above
             them on the phone), so a reader scrolling still has its shape in view. */
          <div className="mt-5 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
            <div className={cn(DESK_BOX, "flex h-fit items-start gap-5 p-5 lg:col-start-2 lg:row-start-1 lg:p-6")}>
              <div className="flex shrink-0 flex-col items-center gap-2">
                <p className="font-latin text-heading leading-none font-semibold text-foreground tabular-nums lg:text-frame-title">
                  {average === undefined ? "—" : average.toFixed(1)}
                </p>
                <Stars filled={average === undefined ? 0 : Math.round(average)} gap={3} size={13} />
                <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums lg:text-frame-label">
                  {`${total} ${p("stats.reviews")}`}
                </p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
                {/* `distribution` always has all five, highest first, so there
                    is nothing to fill in here — a star nobody gave is a zero. */}
                {(summary.data?.distribution ?? []).map((bar) => (
                  <DistributionRow fill={total > 0 ? (bar.count / total) * 100 : 0} key={bar.stars} label={String(bar.stars)} />
                ))}
              </div>
            </div>

            <div className="-mt-5 flex min-w-0 flex-col divide-y divide-border lg:col-start-1 lg:row-start-1 lg:-mt-7">
              {reviews.loading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                items.map((review) => {
                  const open = replyingTo === review.appointmentId;
                  return (
                    <ReviewCard
                      avatar={<ReviewerMark name={review.reviewerDisplayName} />}
                      body={review.comment ?? ""}
                      date={shortDate(review.appointmentStartTime)}
                      key={review.appointmentId}
                      meta={`${review.serviceName} · ${s("durationMinutes", {
                        count: review.serviceDurationMinutes,
                      })}`}
                      name={review.reviewerDisplayName}
                      onReply={() => {
                        setReplyingTo(review.appointmentId);
                        // Rewriting a reply starts from the one on record, which
                        // is what `PATCH .../reply` does to an existing one.
                        setDraft(review.advisorReply ?? "");
                        setFailure(null);
                      }}
                      reply={review.advisorReply ?? undefined}
                      replyAction={open ? undefined : t("reply")}
                      replyLabel={review.advisorReply ? t("yourReply") : undefined}
                      stars={review.stars}
                    >
                      {open ? (
                        <ReplyComposer
                          failed={failure !== null}
                          id={`reply-${review.appointmentId}`}
                          onCancel={closeComposer}
                          onChange={(value) => {
                            setDraft(value);
                            // The error belongs to the send that failed, so
                            // editing retires it.
                            setFailure(null);
                          }}
                          onSubmit={() => void sendReply()}
                          value={draft}
                        />
                      ) : null}
                    </ReviewCard>
                  );
                })
              )}
              {/* The API's reason for refusing the reply, under the card it
                  belongs to. `ReplyComposer` turns its guidance line destructive
                  on `failed`; this is the sentence that line cannot carry. */}
              {failure ? (
                <p className="w-full border-0 pb-4 text-xs text-destructive lg:text-frame-label" role="alert">
                  {failure}
                </p>
              ) : null}
            </div>
          </div>
        )}
    </>
  );
}
