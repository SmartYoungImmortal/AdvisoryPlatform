import Image, { type StaticImageData } from "next/image";
import { FileText, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { ChatMark } from "@/components/chat/chat-avatar";
import { StatusPill } from "@/components/mobile/status-pill";
import { cn } from "@/lib/utils";

/**
 * The corners a bubble keeps, and the corner it gives up to point at its author.
 *
 * Both sides were drawn at `md` (8px) with a square tail. 12px is the step the
 * rest of the app's cards now take, and a bubble is the smallest card in the
 * product, so it takes the same one — the tail stays square.
 */
const BUBBLE = "flex max-w-[276px] shrink-0 overflow-hidden px-3 py-2";

/**
 * A day break in the thread.
 *
 * It used to be a filled `bg-border` pill at the same 12px semibold as the copy
 * around it, which made a separator the loudest object on the screen. A day
 * break is chrome: a hairline across the column with the date sitting in it, so
 * the eye reads it as structure and moves on.
 */
export function DayDivider({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 items-center gap-3 py-1">
      <span aria-hidden className="h-px min-w-px flex-1 bg-border" />
      <span className="shrink-0 text-xs font-medium whitespace-nowrap text-muted-foreground">
        {children}
      </span>
      <span aria-hidden className="h-px min-w-px flex-1 bg-border" />
    </div>
  );
}

/** 12/14 Geist timestamp under a bubble — a number, so tabular and muted. */
function Stamp({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <p
      className={cn(
        "font-latin text-xs leading-3.5 font-normal tabular-nums text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * Figma "Conversation Partner's Message" — 32px avatar, bubble with a square
 * bottom-left corner, then a timestamp indented 40px.
 *
 * The bubble was `bg-muted` on the page ground. Those two are now one step
 * apart, so the most-read screen in the product was grey text in a grey box on a
 * grey page — the "mush" the owner means. It sits on the card surface with the
 * hairline and the resting elevation instead: a white object on the thread's
 * ground, against the accent block the reader's own messages are.
 *
 * The portrait is `ChatMark`, not a photograph. `ChatMessageResponseDto` carries
 * a `senderUserId` and nothing else about the author, and no route presigns
 * another user's avatar, so there is no face to put here — see `ChatMark`.
 */
export function PartnerMessage({
  time,
  children,
  bubbleClassName,
}: {
  readonly time: string;
  readonly children: ReactNode;
  readonly bubbleClassName?: string;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start">
      <div className="flex max-w-[320px] shrink-0 flex-col items-start justify-end gap-1">
        <div className="flex shrink-0 items-end gap-2">
          <ChatMark className="self-start" size={32} />
          <div className="flex max-w-[276px] shrink-0 flex-col items-start gap-3">
            <div
              className={cn(
                BUBBLE,
                "items-center justify-center rounded-tl-card rounded-tr-card rounded-br-card border border-border bg-card shadow-card",
                bubbleClassName,
              )}
            >
              {children}
            </div>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center pl-10">
          <Stamp className="min-w-px flex-1">{time}</Stamp>
        </div>
      </div>
    </div>
  );
}

/** Plain Thai body text inside a partner bubble (14/20, the bubble's measure). */
export function PartnerText({ children }: { readonly children: ReactNode }) {
  return (
    <p className="max-w-63 min-w-px flex-1 text-sm font-normal whitespace-pre-line text-foreground">
      {children}
    </p>
  );
}

/**
 * Figma "My Message" — right-aligned stack with 10px padding, an accent bubble with
 * a square bottom-right corner, then a right-aligned timestamp.
 *
 * The accent fill already separates this side; what it was missing is the weight
 * to match the partner's new card, so it carries the same resting elevation.
 */
export function MyMessage({
  time,
  children,
  bubbleClassName,
}: {
  readonly time: string;
  readonly children: ReactNode;
  readonly bubbleClassName?: string;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-end justify-end">
      <div className="flex max-w-[296px] shrink-0 flex-col items-end justify-end gap-2.5 p-2.5">
        <div className="flex max-w-[276px] shrink-0 flex-col items-start">
          <div
            className={cn(
              BUBBLE,
              "items-start rounded-tl-card rounded-tr-card rounded-bl-card bg-primary shadow-card",
              bubbleClassName,
            )}
          >
            {children}
          </div>
        </div>
        <div className="flex shrink-0 items-end justify-end">
          <Stamp>{time}</Stamp>
        </div>
      </div>
    </div>
  );
}

/** Thai body text inside my bubble (14/20, the accent's paired ink). */
export function MyText({ children }: { readonly children: ReactNode }) {
  return (
    <p className="max-w-63 text-sm font-normal whitespace-pre-line text-primary-foreground">
      {children}
    </p>
  );
}

/**
 * Figma file bubble body — 36px file glyph, then a 214px name/meta stack.
 *
 * The glyph now sits in its own tinted chip: a bare 36px outline against 14px
 * copy was the largest thing in the bubble and the least informative. The meta
 * line drops to the app's 12px meta step and takes tabular figures, since it is
 * a date and a file size.
 */
export function FileBody({
  name,
  meta,
}: {
  readonly name: string;
  readonly meta: string;
}) {
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText aria-hidden className="size-4.5 text-primary" />
      </span>
      <div className="flex w-[214px] shrink-0 flex-col items-start gap-1 font-normal">
        <p className="font-latin w-full text-sm font-medium text-foreground">
          {name}
        </p>
        <p className="w-full text-xs tabular-nums whitespace-pre-wrap text-muted-foreground">
          {meta}
        </p>
      </div>
    </>
  );
}

/** Figma image bubble body — fills the fixed bubble box. */
export function ImageBody({
  src,
  alt = "",
}: {
  readonly src: StaticImageData;
  readonly alt?: string;
}) {
  return (
    <span className="relative block h-full min-w-px flex-1 overflow-hidden">
      <Image alt={alt} className="absolute inset-0 size-full object-cover" src={src} />
    </span>
  );
}

/**
 * Figma "Failed Message" — a bubble with a destructive hairline and a retry hint
 * below.
 *
 * The fill was `bg-muted`, which is now the page's own step; on a destructive
 * hairline a faint destructive tint says the same thing and reads as one object
 * with the warning under it. The hint becomes a pill so the state is a status
 * rather than a stray red line.
 */
export function FailedMessage({
  text,
  meta,
}: {
  readonly text: string;
  readonly meta: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-start justify-end overflow-clip px-4">
      <div className="flex shrink-0 flex-col items-end gap-1.5 overflow-clip">
        {/* Figma "Bubble" is 260px wide with the stroke drawn inside. */}
        <div className="flex w-[260px] shrink-0 items-start overflow-clip rounded-tl-card rounded-tr-card rounded-bl-card border border-destructive bg-destructive/8 px-3.5 py-2.5">
          <p className="min-w-px flex-1 text-sm font-normal text-foreground">
            {text}
          </p>
        </div>
        <StatusPill icon={TriangleAlert} tone="danger">
          {meta}
        </StatusPill>
      </div>
    </div>
  );
}
