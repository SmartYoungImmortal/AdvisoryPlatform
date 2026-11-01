"use client";

import { Check, Info, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How long a confirmation stays. */
const TOAST_MS = 3_000;
/** Longer for a reason that comes with something to do, such as unblocking. */
const PROBLEM_TOAST_MS = 6_000;
/** The exit, matched to the card's leaving animation. */
const EXIT_MS = 200;
/** How far a toast has to be pushed sideways before letting go dismisses it. */
const SWIPE_PX = 72;
/** A finger that moves less than this is still a tap on the card. */
const TAP_SLOP_PX = 6;

/** One message: what happened, and a second line when there is more to say. */
export type ToastMessage = {
  readonly text: string;
  readonly detail?: string;
  /** A change that worked; otherwise a reason it could not happen. */
  readonly ok: boolean;
  /** Restarts the countdown for each message. */
  readonly id: number;
};

/**
 * Runs `onDone` once `duration` has passed without a pause, starting again
 * for every new `key` (null stops it). A pause keeps what is left, so the
 * toast a reader is hovering or reading never leaves under them.
 */
export function useCountdown(key: string | number | null, duration: number, paused: boolean, onDone: () => void) {
  const left = useRef(duration);
  const since = useRef(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  // Declared before the timer, so a new message's full time is in place
  // before the timer for it starts.
  useEffect(() => {
    left.current = duration;
  }, [key, duration]);
  useEffect(() => {
    if (key === null || paused) return;
    since.current = Date.now();
    const timer = setTimeout(() => done.current(), left.current);
    return () => {
      clearTimeout(timer);
      left.current = Math.max(0, left.current - (Date.now() - since.current));
    };
  }, [key, paused]);
}

/**
 * A toast's state: the message, whether it is playing its exit, `show` to
 * put up another, and the controls the card takes (pause while it is read,
 * dismiss when it is closed). `initial` is a message to open with, for a page
 * that lands on news (the settings after a password change).
 *
 * A message while one is showing swaps the text in place, with no new
 * entrance: rapid presses must not make the toast blink in and out.
 */
export function useStatusToast(initial?: Omit<ToastMessage, "id">) {
  const [toast, setToast] = useState<ToastMessage | null>(() => (initial ? { ...initial, id: 0 } : null));
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);

  const show = useCallback((text: string, ok: boolean, detail?: string) => {
    setLeaving(false);
    setPaused(false);
    setToast({ text, detail, ok, id: Date.now() });
  }, []);
  const clear = useCallback(() => setToast(null), []);
  const dismiss = useCallback(() => setLeaving(true), []);

  useCountdown(toast && !leaving ? toast.id : null, toast?.ok ? TOAST_MS : PROBLEM_TOAST_MS, paused, dismiss);

  useEffect(() => {
    if (!leaving) return;
    const gone = setTimeout(() => {
      setToast(null);
      setLeaving(false);
    }, EXIT_MS);
    return () => clearTimeout(gone);
  }, [leaving]);

  return { toast, leaving, paused, show, clear, dismiss, setPaused };
}

/**
 * Where every toast in the app stands: centred above the tab bar on the
 * phone, 24 off the bottom right corner from `lg`. Fixed to the screen and
 * outside the pages' zoom, so its sizes are the screen's.
 */
export function ToastViewport({ children }: { readonly children: ReactNode }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0"
      role="status"
    >
      {children}
    </div>
  );
}

/** What a toast is about, which sets its tile: done, a reason, a message, anything else arriving. */
export type ToastTone = "done" | "reason" | "message" | "notice";

const TILE: Record<ToastTone, string> = {
  done: "size-7 rounded-full bg-confirm/12 text-confirm",
  reason: "size-7 rounded-full bg-muted text-muted-foreground",
  message: "size-9 rounded-lg bg-primary text-primary-foreground",
  notice: "size-9 rounded-lg bg-hero-action text-hero-action-foreground",
};

const BAR: Record<ToastTone, string> = {
  done: "bg-confirm",
  reason: "bg-muted-foreground",
  message: "bg-primary",
  notice: "bg-foreground/40",
};

/**
 * The one toast card the app draws, for a change it confirms and for a
 * notification that just arrived alike: solid white, so what is under it
 * never shows through, 380 wide from `lg` (the phone's width less 12 a side
 * below it), 16 round, on a hairline and a wide soft shadow. A mark at the
 * left says what it is about (a small green tick on its own tint for done,
 * a blue bubble tile for a message), the title in ink with the time at the
 * right when there is one, a second line in grey, and an action under them
 * as a small black capsule, or with `href` the whole card as the way to what
 * it is about. How long it has left runs out along its foot,
 * and stops while the pointer or the focus is on it. A close at its top
 * right on the desktop, shown on hover; on a touch screen it is pushed off
 * sideways.
 *
 * It rises in with a little overshoot and drops back out.
 */
export function ToastCard({
  tone,
  icon,
  title,
  meta,
  detail,
  action,
  href,
  onOpen,
  duration,
  countdownKey,
  paused = false,
  leaving = false,
  onPause,
  onClose,
}: {
  readonly tone: ToastTone;
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  /** A word at the title's right, such as when it arrived. */
  readonly meta?: ReactNode;
  readonly detail?: ReactNode;
  /** The way to what it is about, drawn as `TOAST_ACTION`. */
  readonly action?: ReactNode;
  /** Makes the whole card the way to what it is about, in place of an action. */
  readonly href?: string;
  /** Called as the card is opened through `href`. */
  readonly onOpen?: () => void;
  /** How long the countdown runs, in ms. */
  readonly duration: number;
  /** A new key restarts the countdown for a new message in the same card. */
  readonly countdownKey: string | number;
  readonly paused?: boolean;
  readonly leaving?: boolean;
  readonly onPause?: (paused: boolean) => void;
  readonly onClose?: () => void;
}) {
  const c = useTranslations("common");
  const Icon = icon;
  const [drag, setDrag] = useState<{ readonly from: number; readonly by: number } | null>(null);
  // Whether the finger moved the card, so letting go of a push is not a tap on it.
  const pushed = useRef(false);

  // A finger pushes it sideways; let go past `SWIPE_PX` and it is gone.
  const press = (event: PointerEvent<HTMLDivElement>) => {
    pushed.current = false;
    if (event.pointerType === "mouse" || !onClose) return;
    setDrag({ from: event.clientX, by: 0 });
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const by = event.clientX - drag.from;
    if (Math.abs(by) > TAP_SLOP_PX) pushed.current = true;
    setDrag({ from: drag.from, by });
  };
  const release = () => {
    if (drag && Math.abs(drag.by) > SWIPE_PX) onClose?.();
    setDrag(null);
  };
  const by = drag?.by ?? 0;

  return (
    <div
      className={cn(
        "group/toast pointer-events-auto relative w-full max-w-[380px] touch-pan-y overflow-hidden rounded-2xl bg-card text-foreground shadow-toast ring-1 ring-foreground/[0.07] lg:w-[380px]",
        "motion-reduce:animate-none",
        leaving
          ? "animate-out fade-out zoom-out-95 slide-out-to-bottom-2 fill-mode-forwards duration-200 ease-in"
          : "animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-[420ms] ease-[cubic-bezier(0.21,1.02,0.73,1)]",
        drag ? "transition-none" : "transition-[transform,opacity] duration-200",
      )}
      onBlur={() => onPause?.(false)}
      onFocus={() => onPause?.(true)}
      onMouseEnter={() => onPause?.(true)}
      onMouseLeave={() => onPause?.(false)}
      onPointerCancel={release}
      onPointerDown={press}
      onPointerMove={move}
      onPointerUp={release}
      style={by ? { transform: `translateX(${by}px)`, opacity: Math.max(0.2, 1 - Math.abs(by) / 240) } : undefined}
    >
      <div className={cn("flex items-start gap-3 px-4 py-3.5", onClose && "lg:pr-11")}>
        <span aria-hidden className={cn("flex shrink-0 items-center justify-center", TILE[tone])}>
          <Icon className="size-4" strokeWidth={2.5} />
        </span>
        <div className={cn("min-w-0 flex-1", tone === "done" || tone === "reason" ? "pt-1" : "pt-0.5")}>
          <div className="flex items-baseline gap-2">
            <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-5 font-semibold">{title}</p>
            {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
          </div>
          {detail ? <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-muted-foreground">{detail}</p> : null}
          {action ? <div className="mt-2.5">{action}</div> : null}
        </div>
      </div>

      {/* The whole card is the link, laid over it; the close stays above it. */}
      {href ? (
        <Link
          aria-label={typeof title === "string" ? title : undefined}
          className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          href={href}
          onClick={(event) => {
            if (pushed.current) {
              event.preventDefault();
              return;
            }
            onOpen?.();
          }}
        />
      ) : null}

      {/* How long it has left, running out along the card's own foot (cut
          by its corners), held while it is read. */}
      <span
        aria-hidden
        className={cn("animate-toast-countdown absolute inset-x-0 bottom-0 h-0.5 motion-reduce:hidden", BAR[tone])}
        key={countdownKey}
        style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? "paused" : "running" }}
      />

      {onClose ? (
        <Button
          aria-label={c("close")}
          className="absolute top-2.5 right-2.5 z-10 hidden size-7 rounded-full p-0 text-muted-foreground transition-opacity duration-150 group-hover/toast:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 lg:flex lg:opacity-0"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden className="size-3.5" strokeWidth={2.5} />
        </Button>
      ) : null}
    </div>
  );
}

/** The capsule a toast's action is drawn as: the site's black pill, toast-sized. */
export const TOAST_ACTION =
  "inline-flex h-8 items-center rounded-full bg-hero-action px-3.5 text-xs font-medium text-hero-action-foreground transition-colors hover:bg-hero-action/85";

/**
 * A change confirmed, or the reason it could not happen: the toast card
 * with a green tick (or the grey sign of a reason). Hand it the whole state
 * `useStatusToast` returns.
 */
export function StatusToast({
  toast,
  leaving,
  paused = false,
  setPaused,
  dismiss,
}: {
  readonly toast: ToastMessage | null;
  readonly leaving: boolean;
  readonly paused?: boolean;
  readonly setPaused?: (paused: boolean) => void;
  readonly dismiss?: () => void;
}) {
  return (
    <ToastViewport>
      {toast ? (
        <ToastCard
          countdownKey={toast.id}
          detail={toast.detail}
          duration={toast.ok ? TOAST_MS : PROBLEM_TOAST_MS}
          icon={toast.ok ? Check : Info}
          leaving={leaving}
          onClose={dismiss}
          onPause={setPaused}
          paused={paused}
          title={toast.text}
          tone={toast.ok ? "done" : "reason"}
        />
      ) : null}
    </ToastViewport>
  );
}
