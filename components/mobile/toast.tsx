"use client";

import { CircleCheck, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** How long a confirmation stays. */
const TOAST_MS = 3_000;
/** Longer for a reason that comes with something to do, such as unblocking. */
const PROBLEM_TOAST_MS = 6_000;
/** The exit, matched to `duration-200` on the toast. */
const EXIT_MS = 200;

/** One message: what happened, and a second line when there is more to say. */
export type ToastMessage = {
  readonly text: string;
  readonly detail?: string;
  /** A change that worked; otherwise a reason it could not happen. */
  readonly ok: boolean;
  /** Restarts the countdown bar for each message. */
  readonly id: number;
};

/**
 * A toast's state: the message, whether it is playing its exit, and `show` to
 * put up another. `initial` is a message to open with, for a page that lands
 * on news (the settings after a password change).
 *
 * A message while one is showing swaps the text in place, with no new
 * entrance: rapid presses must not make the toast blink in and out.
 */
export function useStatusToast(initial?: Omit<ToastMessage, "id">) {
  const [toast, setToast] = useState<ToastMessage | null>(() => (initial ? { ...initial, id: 0 } : null));
  // Leaving plays its exit before the toast unmounts.
  const [leaving, setLeaving] = useState(false);

  const show = useCallback((text: string, ok: boolean, detail?: string) => {
    setLeaving(false);
    setToast({ text, detail, ok, id: Date.now() });
  }, []);
  const clear = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const hold = toast.ok ? TOAST_MS : PROBLEM_TOAST_MS;
    const out = setTimeout(() => setLeaving(true), hold);
    const gone = setTimeout(() => setToast(null), hold + EXIT_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, [toast]);

  return { toast, leaving, show, clear };
}

/**
 * The toast, at the bottom right (centred above the tab bar on a phone): a
 * small white card with a hairline and a soft shadow, the icon bare beside
 * the text, a countdown along its foot. Sized for the frame's zoom, so it
 * renders near 16px type at 1440. Rises in once and drops back out.
 */
export function StatusToast({ toast, leaving }: { readonly toast: ToastMessage | null; readonly leaving: boolean }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6 lg:inset-x-auto lg:right-8 lg:bottom-8 lg:px-0"
      role="status"
    >
      {toast ? (
        <div
          className={cn(
            "relative flex w-full max-w-md items-start gap-3 overflow-hidden rounded-xl border border-border bg-card px-5 py-4 text-base text-foreground shadow-panel lg:max-w-lg lg:gap-3.5 lg:px-6 lg:text-frame-body",
            "motion-reduce:animate-none",
            leaving
              ? "animate-out fade-out slide-out-to-bottom-2 fill-mode-forwards duration-200"
              : "animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-300 ease-out",
          )}
        >
          {toast.ok ? (
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-confirm lg:size-6" strokeWidth={2.25} />
          ) : (
            <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground lg:size-6" strokeWidth={2.25} />
          )}
          {toast.detail ? (
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">{toast.text}</span>
              <span className="text-sm text-muted-foreground lg:text-frame-meta">{toast.detail}</span>
            </span>
          ) : (
            <span className="min-w-0">{toast.text}</span>
          )}
          {/* How long it has left, running out along the foot. */}
          <span
            aria-hidden
            className={cn(
              "animate-toast-countdown absolute inset-x-0 bottom-0 h-1 motion-reduce:hidden",
              toast.ok ? "bg-confirm" : "bg-muted-foreground",
            )}
            key={toast.id}
            style={{ animationDuration: `${toast.ok ? TOAST_MS : PROBLEM_TOAST_MS}ms` }}
          />
        </div>
      ) : null}
    </div>
  );
}
