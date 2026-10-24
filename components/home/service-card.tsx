"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { VerifiedTick } from "@/components/home/parts";
import { Face, Fee } from "@/components/home/section-parts";
import { Tilt } from "@/components/motion";
import type { LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * Which part of the card each of the four steps of a consultation points at
 * (`HowToUse`): what was found, what it costs, who it is with, where the
 * review goes.
 */
export type CardMark = "title" | "fee" | "advisor" | "score";

/**
 * A ring drawn round one part of the card when `HowToUse` points at it. Never
 * shown without motion: the card reads the same with or without it.
 */
function Mark({
  mark,
  on,
  className,
  children,
}: {
  readonly mark: CardMark;
  readonly on: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  if (!on) return <span className={className}>{children}</span>;
  return (
    // `isolate`, so the ring can sit under the words it surrounds.
    <span className={cn("relative isolate", className)} data-mark={mark}>
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-3 -inset-y-2 -z-1 rounded-lg bg-primary/6 opacity-0 ring-2 ring-primary/35"
        data-mark-ring
      />
      {children}
    </span>
  );
}

/** The score; nothing at all where nobody has scored it yet, unless the card is asked to say so. */
function Score({ item, sayNone }: { readonly item: LiveService; readonly sayNone: boolean }) {
  const t = useTranslations("search");
  if (item.rating === null || item.reviews === 0) {
    return sayNone ? <span className="text-sm text-muted-foreground lg:text-base">{t("noReviews")}</span> : null;
  }
  return (
    <span className="flex shrink-0 items-center gap-1 text-sm lg:text-base">
      <Star aria-hidden className="size-4 fill-primary text-primary" />
      <span className="font-latin font-semibold text-foreground tabular-nums">{item.rating.toFixed(1)}</span>
      <span className="font-latin text-muted-foreground tabular-nums">({item.reviews})</span>
    </span>
  );
}

/**
 * One service, the same card wherever the home page shows one: its photograph,
 * then what it is, then what it costs for how long, then who gives it on a
 * single line. Nothing else; the service page has the rest.
 *
 * The link is the still hit area. The face inside it lifts under the pointer,
 * and on `lg` turns towards it (`Tilt`) with the photograph a layer deeper,
 * sliding against the turn.
 */
export function ServiceCard({
  item,
  variant = "tall",
  lead = false,
  tilt = true,
  marks = false,
  clone = false,
  className,
  photoClassName,
}: {
  readonly item: LiveService;
  /** Photograph above the copy, or beside it. */
  readonly variant?: "tall" | "wide";
  /** The one large card of a group: a title a step up. */
  readonly lead?: boolean;
  readonly tilt?: boolean;
  /** Carry the rings `HowToUse` lights in turn. */
  readonly marks?: boolean;
  /** A marquee's second copy: still pressable, out of the tab order. */
  readonly clone?: boolean;
  /** Where the card sits: its grid cell or its width. */
  readonly className?: string;
  /** The photograph's box: its aspect, or its share of a wide card. */
  readonly photoClassName?: string;
}) {
  const wide = variant === "wide";
  const face = (
    <span
      className={cn(
        "flex h-full overflow-hidden rounded-card border border-hero-card-border bg-card shadow-hero-card transition-[box-shadow,translate] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-hero-card-hover motion-reduce:transition-none",
        wide ? "flex-row" : "flex-col",
      )}
    >
      <span className={cn("relative block shrink-0 overflow-hidden bg-muted", photoClassName)}>
        <Image
          alt=""
          className="absolute inset-0 size-full scale-[1.06] object-cover transition-[scale] duration-700 ease-out [translate:calc(var(--tilt-x,0)*-10px)_calc(var(--tilt-y,0)*-10px)] group-hover:scale-[1.1] motion-reduce:transition-none"
          src={item.cover}
        />
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-2.5 p-4 lg:gap-3.5 lg:p-6",
          wide && "justify-center",
        )}
      >
        <Mark className="block min-w-0" mark="title" on={marks}>
          <span
            className={cn(
              "line-clamp-2 font-semibold text-foreground",
              lead ? "text-lg lg:text-2xl" : "text-base lg:text-xl",
            )}
          >
            {item.title}
          </span>
        </Mark>
        <Mark className="block" mark="fee" on={marks}>
          <Fee minutes={item.minutes} price={item.price} />
        </Mark>
        <span className="flex min-w-0 items-center justify-between gap-3">
          <Mark className="flex min-w-0 items-center gap-2" mark="advisor" on={marks}>
            <Face className="size-7 lg:size-8" face={item.face} name={item.advisorName} />
            <span className="truncate text-sm text-muted-foreground lg:text-base">{item.advisorName}</span>
            <VerifiedTick className="size-4 lg:size-4.5" />
          </Mark>
          <Mark className="shrink-0" mark="score" on={marks}>
            <Score item={item} sayNone={marks} />
          </Mark>
        </span>
      </span>
    </span>
  );

  return (
    <Link
      className={cn(
        "group block min-h-0 rounded-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      data-service-card
      href={item.href}
      tabIndex={clone ? -1 : undefined}
    >
      {tilt ? (
        <Tilt className="h-full" faceClassName="h-full" max={lead ? 3 : 4}>
          {face}
        </Tilt>
      ) : (
        face
      )}
    </Link>
  );
}
