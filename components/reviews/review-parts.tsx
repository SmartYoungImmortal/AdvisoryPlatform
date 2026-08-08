import Image, { type StaticImageData } from "next/image";
import { MessageSquareReply, Star } from "lucide-react";

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
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-[14px] bg-card p-[14px]">
      <div className="flex w-full shrink-0 items-start gap-[10px] overflow-clip">
        <Image
          alt=""
          className="mt-1 size-8 shrink-0 rounded-full object-cover"
          height={32}
          src={avatar}
          width={32}
        />
        <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
          <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground">
            {name}
          </p>
          <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
            {meta}
          </p>
        </div>
        <span className="font-thai mt-[11px] shrink-0 text-[12px] leading-[18px] font-normal whitespace-nowrap text-muted-foreground">
          {date}
        </span>
      </div>

      <Stars className="mt-2" gap={3} size={13} />

      <p className="font-thai mt-2 w-full text-[14px] leading-[20px] font-normal text-foreground">
        {body}
      </p>

      {reply ? (
        <div className="mt-2 flex w-full shrink-0 flex-col items-start gap-1 overflow-clip rounded-[10px] bg-muted px-3 py-[10px]">
          <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
            {replyLabel}
          </p>
          <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-foreground">
            {reply}
          </p>
        </div>
      ) : null}

      {replyAction ? (
        <button
          className="mt-2 flex shrink-0 items-center gap-[6px] overflow-clip text-primary"
          type="button"
        >
          <MessageSquareReply className="size-[14px] shrink-0" />
          <span className="font-thai text-[14px] leading-[20px] font-medium whitespace-nowrap">
            {replyAction}
          </span>
        </button>
      ) : null}
    </div>
  );
}
