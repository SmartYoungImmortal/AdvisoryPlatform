"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

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


/**
 * The cover, and the way into every photograph: the first one fills the
 * frame, and with more than one it is a button that opens the large viewer,
 * a white pill on its top corner saying how many there are (top, not bottom:
 * the advisor's face laps the bottom edge). The photographs are drawn once,
 * here, rather than again in a gallery further down the page.
 */
export function CoverPhoto({
  photos,
  title,
  className,
}: {
  readonly photos: readonly string[];
  /** The service's name, for the viewer's heading. */
  readonly title: string;
  /** The frame: its size, shape and corners. */
  readonly className: string;
}) {
  const t = useTranslations("service");
  const [open, setOpen] = useState(false);
  const total = photos.length;
  const frame = cn("relative block overflow-hidden bg-muted", className);
  if (total === 0) return <span className={frame} />;

  const image = (
    <Image
      alt=""
      className="object-cover"
      fetchPriority="high"
      fill
      loading="eager"
      sizes="(min-width: 1024px) 500px, 100vw"
      src={photos[0]}
    />
  );
  if (total === 1) return <span className={frame}>{image}</span>;

  return (
    <>
      <Button
        aria-label={t("allPhotos", { count: total })}
        className={cn(frame, "group/cover h-auto cursor-zoom-in p-0 hover:bg-muted")}
        onClick={() => setOpen(true)}
        // What the zoom cursor promises, said on hover.
        title={t("openPhotos")}
        type="button"
        variant="ghost"
      >
        {image}
        {/* A shade under the pointer, the one sign the photo can be opened. */}
        <span
          aria-hidden
          className="absolute inset-0 bg-scrim/0 transition-colors duration-150 group-hover/cover:bg-scrim/10"
        />
        {/* On the phone the bar floats over the cover's top and the intro's
            sheet laps its foot by 32, so the count sits 12 above the sheet. */}
        <span className="pointer-events-none absolute right-3 bottom-11 inline-flex md:top-3 md:bottom-auto items-center gap-1.5 rounded-full bg-card/95 px-3 py-1 text-xs font-medium text-foreground shadow-hero-card lg:top-[19px] lg:right-[19px] lg:gap-[7.125px] lg:px-[19px] lg:py-[7.125px] lg:text-frame-meta">
          <Images aria-hidden className="size-3.5 lg:size-[19px]" strokeWidth={1.75} />
          {t("allPhotos", { count: total })}
        </span>
      </Button>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogPortal>
          <DialogOverlay className="bg-scrim/85 supports-backdrop-filter:backdrop-blur-md" />
          {/* A plain 150ms fade in and out, as a panel opening, nothing more. */}
          <DialogPrimitive.Popup className="fixed inset-0 z-50 outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none">
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <ViewerBody photos={photos} start={0} />
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
