import { MessageSquareReply, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { REVIEW_TEXT_MAX_LENGTH } from "@/components/reviews/reviews-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The reply length the composer counts against.
 *
 * Figma draws no counter, and this used to be 500 borrowed from the chat report's
 * details box. The API has an actual bound — `REVIEW_TEXT_MAX_LENGTH`, 4,000, in
 * `reviews.constants.ts` — and a field that stops a reader at 500 when the server
 * would have taken 4,000 is the counter lying about the limit.
 */
export const REPLY_MAX = REVIEW_TEXT_MAX_LENGTH;

/** Figma star rows — filled stars use the accent, empty ones the border tint. */
export function Stars({
  size,
  gap,
  filled = 5,
  className,
}: {
  readonly size: number;
  readonly gap: number;
  readonly filled?: number;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center", className)} style={{ gap }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          className={cn(
            "shrink-0",
            // An empty star was drawn on `--border`, the hairline colour, which
            // on the cooler ground reads as nothing at all — so a 3-star review
            // and a 5-star one looked alike. `--accented` is the stronger of the
            // two neutral edges, and the fill keeps the shape readable.
            i < filled ? "fill-primary text-primary" : "fill-muted text-accented",
          )}
          key={i}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

/**
 * The reviewer's portrait slot with nothing to put in it.
 *
 * `ReviewResponseDto` carries `reviewerDisplayName` and `reviewerAvatarKey`, and
 * an avatar key is a storage key, not a URL. The only route that presigns one is
 * `GET /users/me/avatar` — your own. There is nothing that turns *another*
 * person's key into a picture, so a real review has no photograph available to it
 * and this is their initial on the muted step instead.
 */
export function ReviewerMark({ name }: { readonly name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground lg:size-12 lg:text-frame-body"
    >
      {name.trim().slice(0, 1)}
    </span>
  );
}

/**
 * Figma "Review Card" — surface, 14px radius: a 32px avatar row with a date, a 13px
 * star row, the review body, then either the advisor's reply or a reply affordance.
 *
 * `children` is the third of those endings: the frames that open a composer
 * (995:8857) put it exactly where the reply block and the reply link go, so the
 * card takes it as a slot rather than growing a second copy of the composer.
 *
 * `stars` and `avatar` are what connecting this to the API needed. The star row
 * was hard-coded to five, so a three-star review drew five filled stars; and the
 * portrait took a bundled `StaticImageData`, which a review row can never supply
 * — see `ReviewerMark`.
 */
export function ReviewCard({
  avatar,
  name,
  meta,
  date,
  body,
  stars = 5,
  replyLabel,
  reply,
  replyAction,
  onReply,
  children,
}: {
  readonly avatar: ReactNode;
  readonly name: string;
  readonly meta: ReactNode;
  readonly date: string;
  readonly body: ReactNode;
  /** 1 to 5, as the API stores it. */
  readonly stars?: number;
  readonly replyLabel?: string;
  readonly reply?: string;
  readonly replyAction?: string;
  readonly onReply?: () => void;
  readonly children?: ReactNode;
}) {
  return (
    // A row of the feed, not a card: the list draws the hairline between
    // reviews, as the notification and transaction feeds do.
    <article className="flex w-full flex-col items-start py-5 lg:py-7">
      <div className="flex w-full items-start gap-3 lg:gap-4">
        {avatar}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
          <p className="text-sm font-semibold text-foreground lg:text-frame-body">{name}</p>
          <p className="text-xs text-muted-foreground tabular-nums lg:text-frame-meta">{meta}</p>
        </div>
        <span className="mt-0.5 shrink-0 font-latin text-xs whitespace-nowrap text-muted-foreground tabular-nums lg:text-frame-label">
          {date}
        </span>
      </div>

      <Stars className="mt-3" filled={stars} gap={3} size={14} />

      {/* A review's comment is optional in the API — the stars stand on their
          own — so a rating with nothing written leaves this out rather than
          drawing an empty line. */}
      {body ? <p className="mt-2 w-full text-sm text-foreground lg:text-frame-body">{body}</p> : null}

      {reply ? (
        /* The advisor's reply under the review it answers, on the muted step. */
        <div className="mt-4 flex w-full flex-col gap-1.5 rounded-2xl bg-muted/60 px-4 py-3.5 lg:px-5 lg:py-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground lg:text-frame-label">
            <MessageSquareReply aria-hidden className="size-3.5" />
            {replyLabel}
          </p>
          <p className="w-full text-sm text-foreground lg:text-frame-body">{reply}</p>
        </div>
      ) : null}

      {replyAction ? (
        <Button
          className="mt-3 h-auto gap-1.5 p-0 text-sm font-medium text-foreground underline underline-offset-4 hover:bg-transparent lg:text-frame-meta"
          onClick={onReply}
          variant="ghost"
        >
          <MessageSquareReply aria-hidden className="size-3.5" />
          {replyAction}
        </Button>
      ) : null}

      {children}
    </article>
  );
}

/**
 * Figma "Reply Composer" — 995:8857 on the replying frame and 995:9640 on the
 * reply-failed one: a muted 10px block holding the same 12/18 caption the sent
 * reply wears, a 72px field, one 12/18 line of guidance, and the cancel/send
 * pair split down the middle.
 *
 * The failed frame is that same block with two substitutions — the guidance
 * line becomes destructive and the send button becomes a retry — so this is one
 * component with a `failed` flag rather than a second composer. Figma pins a
 * red stroke on the field there; here it comes from `aria-invalid`, which also
 * announces the problem instead of only colouring it.
 *
 * Figma draws no counter. It is added on the guidance row rather than under it,
 * so the block keeps the height the frame gives it in both states.
 */
export function ReplyComposer({
  id,
  value,
  failed = false,
  onChange,
  onCancel,
  onSubmit,
}: {
  readonly id: string;
  readonly value: string;
  readonly failed?: boolean;
  readonly onChange: (value: string) => void;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
}) {
  const t = useTranslations("reviews");
  const c = useTranslations("common");
  const noteId = `${id}-note`;

  return (
    <div className="mt-4 flex w-full flex-col items-start gap-2.5 rounded-2xl bg-muted/60 p-4 lg:p-5">
      <label className="w-full text-sm font-medium text-foreground lg:text-frame-meta" htmlFor={id}>
        {t("yourReply")}
      </label>
      <Textarea
        aria-describedby={noteId}
        aria-invalid={failed || undefined}
        className="h-24 resize-none rounded-xl border-accented bg-card px-4 py-3 text-base shadow-none field-sizing-fixed lg:text-frame-body"
        id={id}
        maxLength={REPLY_MAX}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("replyPlaceholder")}
        value={value}
      />
      <div className="flex w-full shrink-0 items-start gap-2">
        <p
          className={cn(
            "min-w-px flex-1 text-xs font-normal",
            failed ? "text-destructive" : "text-muted-foreground",
          )}
          id={noteId}
          role={failed ? "alert" : undefined}
        >
          {failed ? t("replyError") : t("replyHint")}
        </p>
        {/* The pair reads as a number, not as prose, so it is announced through
            the label and drawn with the Latin figures the rest of the app uses
            for counts. */}
        <span
          aria-label={t("replyCounterLabel", { count: value.length, max: REPLY_MAX })}
          className="font-latin shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground"
        >
          {value.length}/{REPLY_MAX}
        </span>
      </div>
      <div className="flex w-full items-center gap-2.5 lg:justify-end">
        <Button className={cn(authPill(false), PILL, "flex-1 lg:flex-none")} onClick={onCancel} type="button" variant="outline">
          {c("cancel")}
        </Button>
        <Button
          className={cn(authPill(true), PILL, "flex-1 lg:flex-none")}
          disabled={value.trim().length === 0}
          onClick={onSubmit}
          type="button"
        >
          {failed ? t("retry") : t("replySend")}
        </Button>
      </div>
    </div>
  );
}

/** The composer's capsules: the desk's, a step down on the phone. */
const PILL = "h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";
