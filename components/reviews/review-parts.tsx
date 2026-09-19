import Image, { type StaticImageData } from "next/image";
import { MessageSquareReply, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface } from "@/components/mobile/surface";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The reply length the composer counts against. Figma draws no counter, so the
 * ceiling is the one the app already uses for its other free-text field (the
 * chat report's details box) rather than a second number.
 */
export const REPLY_MAX = 500;

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
 * Figma "Review Card" — surface, 14px radius: a 32px avatar row with a date, a 13px
 * star row, the review body, then either the advisor's reply or a reply affordance.
 *
 * `children` is the third of those endings: the frames that open a composer
 * (995:8857) put it exactly where the reply block and the reply link go, so the
 * card takes it as a slot rather than growing a second copy of the composer.
 */
export function ReviewCard({
  avatar,
  name,
  meta,
  date,
  body,
  replyLabel,
  reply,
  replyAction,
  onReply,
  children,
}: {
  readonly avatar: StaticImageData;
  readonly name: string;
  readonly meta: string;
  readonly date: string;
  readonly body: string;
  readonly replyLabel?: string;
  readonly reply?: string;
  readonly replyAction?: string;
  readonly onReply?: () => void;
  readonly children?: ReactNode;
}) {
  return (
    <Surface className="flex w-full shrink-0 flex-col items-start p-3.5">
      <div className="flex w-full shrink-0 items-start gap-2.5 overflow-clip">
        <Image
          alt=""
          className="mt-0.5 size-9 shrink-0 rounded-full object-cover"
          height={36}
          src={avatar}
          width={36}
        />
        <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
          <p className="w-full text-sm font-semibold text-foreground">
            {name}
          </p>
          <p className="w-full text-xs font-normal tabular-nums text-muted-foreground">
            {meta}
          </p>
        </div>
        <span className="font-latin mt-0.5 shrink-0 text-xs font-normal tabular-nums whitespace-nowrap text-muted-foreground">
          {date}
        </span>
      </div>

      <Stars className="mt-2.5" gap={3} size={14} />

      <p className="mt-2 w-full text-sm font-normal text-foreground">
        {body}
      </p>

      {reply ? (
        /* The advisor's reply belongs under the review it answers — the `well`
           tier — and its caption is a status, not a label in the same grey as
           the review's own meta line. */
        <Surface
          className="mt-3 flex w-full shrink-0 flex-col items-start gap-1.5 p-3"
          tier="well"
        >
          <StatusPill icon={MessageSquareReply} tone="accent">
            {replyLabel}
          </StatusPill>
          <p className="w-full text-sm font-normal text-foreground">
            {reply}
          </p>
        </Surface>
      ) : null}

      {replyAction ? (
        <Button
          className="mt-2.5 h-auto shrink-0 gap-1.5 overflow-clip p-0 no-underline"
          onClick={onReply}
          variant="link"
        >
          <MessageSquareReply className="size-3.5 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">
            {replyAction}
          </span>
        </Button>
      ) : null}

      {children}
    </Surface>
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
    <Surface
      className="mt-3 flex w-full shrink-0 flex-col items-start gap-2 p-3"
      tier="well"
    >
      <label className="w-full text-sm font-medium text-foreground" htmlFor={id}>
        {t("yourReply")}
      </label>
      <Textarea
        aria-describedby={noteId}
        aria-invalid={failed || undefined}
        className="h-18 resize-none rounded-card border-border bg-card px-3 text-sm shadow-none field-sizing-fixed"
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
      <div className="flex w-full shrink-0 items-start gap-2.5 overflow-clip">
        <NeutralButton className="min-w-px flex-1" onClick={onCancel} type="button">
          {c("cancel")}
        </NeutralButton>
        <PrimaryButton
          className="min-w-px flex-1 disabled:opacity-40"
          disabled={value.trim().length === 0}
          onClick={onSubmit}
          type="button"
        >
          {failed ? t("retry") : t("replySend")}
        </PrimaryButton>
      </div>
    </Surface>
  );
}
