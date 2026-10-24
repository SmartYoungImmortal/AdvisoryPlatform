"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** How far each arrow key steps through the photos. */
const ARROW_STEP: Partial<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 };

/**
 * The photographs, large, one at a time: a swipeable track that fills the
 * screen, opened from either gallery. Arrow keys and the two buttons step
 * through it (a jump, not a glide), Escape closes it (the dialog's own), and
 * the counter is read off the scroll position, so it cannot drift from the
 * photo on screen.
 *
 * Mounted afresh on every open (the portal unmounts on close), so it starts
 * on the photo that was pressed.
 */
function ViewerBody({ photos, start }: { readonly photos: readonly string[]; readonly start: number }) {
  const t = useTranslations("service");
  const [current, setCurrent] = useState(start);
  const track = useRef<HTMLDivElement | null>(null);
  const total = photos.length;

  // Stable, so a re-render (every scroll sets `current`) does not jump back.
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      track.current = node;
      if (node) node.scrollLeft = start * node.clientWidth;
    },
    [start],
  );

  const go = (to: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: ((to + total) % total) * el.clientWidth, behavior: "instant" });
  };

  // The arrow keys, on the window while the viewer is open (the dialog keeps
  // focus inside it), so no plain element has to listen for keys. The photo
  // on screen is read off the track, the same source as the counter.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const step = ARROW_STEP[event.key];
      const el = track.current;
      if (!step || !el) return;
      const at = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: ((at + step + total) % total) * el.clientWidth, behavior: "instant" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  const round = "size-11 rounded-full text-on-media hover:bg-on-media/15 hover:text-on-media";
  // Centred by `top`, not a translate: the button's own press nudge is a
  // translate, and it would override the centring mid-click.
  const side = "absolute top-[calc(50%-1.375rem)] hidden bg-on-media/10 md:inline-flex";

  return (
    <div className="flex size-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 py-3 md:px-6">
        <span className="font-latin text-base text-on-media tabular-nums">
          {t("photoCounter", { current: current + 1, total })}
        </span>
        <DialogClose
          render={<Button aria-label={t("closePhotos")} className={round} size="icon" type="button" variant="ghost" />}
        >
          <X aria-hidden className="size-5" />
        </DialogClose>
      </div>
      <div
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain"
        onScroll={(event) => {
          const el = event.currentTarget;
          setCurrent(Math.round(el.scrollLeft / el.clientWidth));
        }}
        ref={attach}
      >
        {photos.map((src, i) => (
          <div className="relative size-full shrink-0 snap-center px-3 pb-6 md:px-24 md:pb-10" key={src}>
            <div className="relative size-full">
              <Image
                alt={t("photoOf", { current: i + 1, total })}
                className="object-contain"
                fill
                sizes="100vw"
                src={src}
              />
            </div>
          </div>
        ))}
      </div>
      {total > 1 ? (
        <>
          <Button
            aria-label={t("prevPhoto")}
            className={cn(round, side, "left-4")}
            onClick={() => go(current - 1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Button>
          <Button
            aria-label={t("nextPhoto")}
            className={cn(round, side, "right-4")}
            onClick={() => go(current + 1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronRight aria-hidden className="size-5" />
          </Button>
        </>
      ) : null}
    </div>
  );
}

/** One photo of the desktop collage, and the way into the viewer at it. */
function Tile({
  src,
  index,
  label,
  onOpen,
  children,
}: {
  readonly src: string;
  readonly index: number;
  readonly label: string;
  readonly onOpen: (index: number) => void;
  readonly children?: ReactNode;
}) {
  const t = useTranslations("service");
  return (
    <Button
      aria-label={label}
      className="group/tile relative size-full cursor-zoom-in overflow-hidden rounded-2xl bg-muted p-0 shadow-hero-card hover:bg-muted"
      onClick={() => onOpen(index)}
      // What the zoom cursor promises, said on hover.
      title={t("openPhotos")}
      type="button"
      variant="ghost"
    >
      <Image
        alt=""
        className="object-cover"
        fetchPriority={index === 0 ? "high" : undefined}
        fill
        loading={index === 0 ? "eager" : "lazy"}
        sizes={index === 0 ? "(min-width: 1024px) 500px, 100vw" : "(min-width: 1024px) 250px, 50vw"}
        src={src}
      />
      {/* A shade under the pointer, the one sign the photo can be opened. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-scrim/0 transition-colors duration-150 group-hover/tile:bg-scrim/10"
      />
      {children}
    </Button>
  );
}

/**
 * The service's photographs: the cover first, then whatever else the advisor
 * has added (`ApiPublicService.images`).
 *
 * Phone and portrait tablet: a track that swipes, each photo a page with the
 * next one peeking in at the edge, so a second photo announces itself.
 * Desktop: an editorial collage, the cover large and the next two stacked
 * beside it, so every photo is in the first screen rather than in a row of
 * thumbnails under the fold. Any photo opens the large viewer at itself.
 *
 * One photo is a composition of its own rather than a gallery with nothing
 * in it: no counter, no tiles, only the photograph and the line about the
 * session laid over its corner.
 */
export function ServicePhotos({
  photos,
  title,
  chip,
}: {
  readonly photos: readonly string[];
  /** The service's name, for the viewer's heading. */
  readonly title: string;
  /** A line laid over the first photo's corner. */
  readonly chip?: ReactNode;
}) {
  const t = useTranslations("service");
  const [viewer, setViewer] = useState({ open: false, start: 0 });
  const total = photos.length;
  const many = total > 1;
  // The collage's right column: the next two; the rest wait in the viewer.
  const side = photos.slice(1, 3);
  const open = (start: number) => setViewer({ open: true, start });

  const overlay = chip ? <span className="pointer-events-none absolute bottom-3 left-3 lg:bottom-4 lg:left-4">{chip}</span> : null;

  return (
    <section aria-label={t("galleryLabel")}>
      {/* The track bleeds to the screen's edges, its first page lined up
          with the column. */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 scroll-px-5 md:-mx-12 md:px-12 md:scroll-px-12 lg:hidden">
        {photos.map((src, i) => {
          const frame = cn(
            "relative aspect-[4/3] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted shadow-hero-card",
            many ? "w-[86%] md:w-[72%]" : "w-full",
          );
          const image = (
            <Image
              alt=""
              className="object-cover"
              fetchPriority={i === 0 ? "high" : undefined}
              fill
              loading={i === 0 ? "eager" : "lazy"}
              sizes="(min-width: 768px) 72vw, 86vw"
              src={src}
            />
          );
          if (!many) {
            return (
              <div className={frame} key={src}>
                {image}
                {overlay}
              </div>
            );
          }
          return (
            <Button
              aria-label={t("photoOf", { current: i + 1, total })}
              className={cn(frame, "h-auto p-0 hover:bg-muted")}
              key={src}
              onClick={() => open(i)}
              type="button"
              variant="ghost"
            >
              {image}
              {i === 0 ? overlay : null}
              <span
                aria-hidden
                className="absolute right-3 bottom-3 rounded-full bg-scrim/55 px-2.5 py-1 font-latin text-xs font-normal text-on-media tabular-nums"
              >
                {t("photoCounter", { current: i + 1, total })}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="hidden lg:block">
        {many ? (
          // 16:9, so the whole collage sits in the first screen at 1710×985
          // under the head; the cover's frame comes out near 7:6.
          <div className="grid aspect-video grid-cols-[2fr_1fr] gap-3">
            <Tile index={0} label={t("photoOf", { current: 1, total })} onOpen={open} src={photos[0]}>
              {overlay}
            </Tile>
            <div className={cn("grid gap-3", side.length > 1 ? "grid-rows-2" : "grid-rows-1")}>
              {side.map((src, k) => {
                const i = k + 1;
                const last = k === side.length - 1;
                // Past three, the corner says how many more wait in the viewer.
                const more = total > 3 ? t("morePhotos", { count: total - 3 }) : t("allPhotos", { count: total });
                return (
                  <Tile
                    index={i}
                    key={src}
                    label={last ? more : t("photoOf", { current: i + 1, total })}
                    onOpen={open}
                    src={src}
                  >
                    {last ? (
                      <span className="pointer-events-none absolute right-4 bottom-4 inline-flex h-11 items-center gap-2 rounded-full bg-card/85 px-4 text-base font-medium text-foreground shadow-hero-card backdrop-blur-md">
                        <Images aria-hidden className="size-5" />
                        {more}
                      </span>
                    ) : null}
                  </Tile>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted shadow-hero-card">
            <Image
              alt=""
              className="object-cover"
              fetchPriority="high"
              fill
              loading="eager"
              sizes="(min-width: 1024px) 760px, 100vw"
              src={photos[0]}
            />
            {overlay}
          </div>
        )}
      </div>

      {many ? (
        <Dialog
          onOpenChange={(next) => setViewer((value) => ({ ...value, open: next }))}
          open={viewer.open}
        >
          <DialogPortal>
            <DialogOverlay className="bg-scrim/85 supports-backdrop-filter:backdrop-blur-md" />
            {/* A plain 150ms fade in and out, as a panel opening, nothing more. */}
            <DialogPrimitive.Popup className="fixed inset-0 z-50 outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none">
              <DialogTitle className="sr-only">{title}</DialogTitle>
              <ViewerBody photos={photos} start={viewer.start} />
            </DialogPrimitive.Popup>
          </DialogPortal>
        </Dialog>
      ) : null}
    </section>
  );
}
