import Image, { type StaticImageData } from "next/image";
import { MessageSquareReply, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
            i < filled ? "fill-primary text-primary" : "fill-none text-border",
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
}: {
  readonly avatar: StaticImageData;
  readonly name: string;
  readonly meta: string;
  readonly date: string;
  readonly body: string;
  readonly replyLabel?: string;
  readonly reply?: string;
  readonly replyAction?: string;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card p-3.5">
      <div className="flex w-full shrink-0 items-start gap-2.5 overflow-clip">
        <Image
          alt=""
          className="mt-1 size-8 shrink-0 rounded-full object-cover"
          height={32}
          src={avatar}
          width={32}
        />
        <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
          <p className="w-full text-sm font-medium text-foreground">
            {name}
          </p>
          <p className="w-full text-xs font-normal text-muted-foreground">
            {meta}
          </p>
        </div>
        <span className="mt-[11px] shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
          {date}
        </span>
      </div>

      <Stars className="mt-2" gap={3} size={13} />

      <p className="mt-2 w-full text-sm font-normal text-foreground">
        {body}
      </p>

      {reply ? (
        <div className="mt-2 flex w-full shrink-0 flex-col items-start gap-1 overflow-clip rounded-lg bg-muted px-3 py-2.5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {replyLabel}
          </p>
          <p className="w-full text-sm font-normal text-foreground">
            {reply}
          </p>
        </div>
      ) : null}

      {replyAction ? (
        <Button
          className="mt-2 h-auto shrink-0 gap-1.5 overflow-clip p-0 no-underline"
          variant="link"
        >
          <MessageSquareReply className="size-3.5 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">
            {replyAction}
          </span>
        </Button>
      ) : null}
    </div>
  );
}
