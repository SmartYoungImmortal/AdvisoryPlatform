import Image, { type StaticImageData } from "next/image";
import { FileText, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { cn } from "@/lib/utils";

/** Figma "Time Stamp" chip — border-filled pill, 8/4 padding, 12/18 Thai semibold. */
export function DayDivider({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center">
      <Badge className="h-auto bg-border py-1 font-semibold text-foreground">
        {children}
      </Badge>
    </div>
  );
}

/** 12/14 Geist timestamp under a bubble. */
function Stamp({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <p
      className={cn(
        "font-latin text-xs leading-3.5 font-normal text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * Figma "Conversation Partner's Message" — 32px avatar, bubble on surface-muted with
 * a square bottom-left corner, then a timestamp indented 40px.
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
          <ChatAvatar className="self-start" size={32} />
          <div className="flex max-w-[276px] shrink-0 flex-col items-start gap-3">
            <div
              className={cn(
                "flex max-w-[276px] shrink-0 items-center justify-center rounded-tl-md rounded-tr-md rounded-br-md bg-muted p-2",
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

/** Plain Thai body text inside a partner bubble (14/20, max 260px). */
export function PartnerText({ children }: { readonly children: ReactNode }) {
  return (
    <p className="max-w-[260px] min-w-px flex-1 text-sm font-normal whitespace-pre-line text-foreground">
      {children}
    </p>
  );
}

/**
 * Figma "My Message" — right-aligned stack with 10px padding, an accent bubble with
 * a square bottom-right corner, then a right-aligned timestamp.
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
              "flex max-w-[276px] shrink-0 items-start rounded-tl-md rounded-tr-md rounded-bl-md bg-primary p-2",
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

/** Thai body text inside my bubble (14/20 white, max 260px). */
export function MyText({ children }: { readonly children: ReactNode }) {
  return (
    <p className="max-w-[260px] text-sm font-normal whitespace-pre-line text-primary-foreground">
      {children}
    </p>
  );
}

/** Figma file bubble body — 36px file glyph, then a 214px name/meta stack. */
export function FileBody({
  name,
  meta,
}: {
  readonly name: string;
  readonly meta: string;
}) {
  return (
    <>
      <FileText className="size-9 shrink-0 text-foreground" />
      <div className="flex w-[214px] shrink-0 flex-col items-start gap-2 font-normal">
        <p className="font-latin w-full text-sm text-foreground">
          {name}
        </p>
        <p className="w-full text-sm whitespace-pre-wrap text-muted-foreground">
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
 * Figma "Failed Message" — surface-muted bubble with a destructive hairline and a
 * 14px radius, plus a retry hint below.
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
      <div className="flex shrink-0 flex-col items-end gap-1 overflow-clip">
        {/* Figma "Bubble" is exactly 260 x 40 with the stroke drawn inside. */}
        <div className="flex h-10 w-[260px] shrink-0 items-start overflow-clip rounded-xl border border-destructive bg-muted px-3.5 py-2.5">
          <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
            {text}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 overflow-clip">
          <TriangleAlert className="size-3 shrink-0 text-destructive" />
          <p className="text-right text-xs font-normal whitespace-nowrap text-destructive">
            {meta}
          </p>
        </div>
      </div>
    </div>
  );
}
