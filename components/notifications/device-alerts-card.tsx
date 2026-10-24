"use client";

import { BellRing, CircleCheck, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { authPill } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { usePushState } from "@/lib/push/use-push-state";
import { disablePush, enablePush, type PushState } from "@/lib/push/web-push";
import { cn } from "@/lib/utils";

/** How long the confirmation toast stays. */
const TOAST_MS = 3_000;
/** Longer for a reason that comes with something to do, such as unblocking. */
const PROBLEM_TOAST_MS = 6_000;
/** The exit, matched to `duration-200` on the toast. */
const EXIT_MS = 200;
/** How long the presses must pause before the confirmation shows. */
const SETTLE_MS = 400;

/** What to say under the button, for the states the button cannot change. */
const NOTE_KEY = {
  blocked: "pushBlocked",
  unsupported: "pushUnsupported",
  "needs-install": "pushNeedsInstall",
  unavailable: "pushUnavailable",
} as const satisfies Partial<Record<PushState, string>>;

/**
 * The card beside the feed (desktop and a landscape iPad): a bell in a soft
 * circle, what device alerts are for, and one capsule that turns them on (or
 * off once they are on). The permission prompt runs from the button itself;
 * there is no separate page. A phone or an upright tablet does not show it:
 * there the switch (`PushToggle`) is in settings only.
 */
export function DeviceAlertsCard() {
  const t = useTranslations("notifications");
  const [state, setState] = usePushState();
  // What the browser last confirmed, what the reader last asked for, and
  // whether a request is out: refs, so rapid presses never re-render the loop.
  const settled = useRef<PushState | null>(null);
  const wish = useRef<PushState | null>(null);
  const running = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);
  useEffect(() => {
    // Follows the state the browser reports on load, while nothing is running.
    if (running.current || (state !== "on" && state !== "off")) return;
    settled.current = state;
    wish.current = state;
  }, [state]);
  // Everything the card has to say is a toast for a moment: the change that
  // worked, or why it could not happen (blocked, unsupported, a failure).
  // `id` restarts the countdown bar for each message.
  const [toast, setToast] = useState<{ readonly text: string; readonly ok: boolean; readonly id: number } | null>(null);

  // Leaving plays its exit before the toast unmounts.
  const [leaving, setLeaving] = useState(false);

  // A new message while one is showing swaps the text in place, with no new
  // entrance: rapid presses must not make the toast blink in and out.
  const show = (text: string, ok: boolean) => {
    setLeaving(false);
    setToast({ text, ok, id: Date.now() });
  };

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

  const on = state === "on";
  const problem = (s: PushState | null) => (s && s in NOTE_KEY ? t(NOTE_KEY[s as keyof typeof NOTE_KEY]) : null);

  // Optimistic: the button and the toast answer the press at once, and the
  // subscribe / unsubscribe runs behind them. Only if the browser or the API
  // says otherwise (permission refused, a network failure) does it flip back.
  // A state the press cannot change (blocked, unsupported) answers with why.
  //
  // Rapid presses never wait or get dropped: each one flips the button at once
  // and only the last wish is carried out. One request runs at a time; when it
  // ends, it runs again if the wish has changed meanwhile.
  const toggle = () => {
    if (state !== "on" && state !== "off") {
      const why = problem(state);
      if (why) show(why, false);
      return;
    }
    const target = state === "on" ? "off" : "on";
    wish.current = target;
    setState(target);
    // The confirmation waits until the presses stop, so a burst of taps shows
    // one toast for where it ended instead of "เปิด / ปิด" flickering.
    if (settle.current) clearTimeout(settle.current);
    setToast(null);
    settle.current = setTimeout(() => show(t(target === "on" ? "pushIsOn" : "pushIsOff"), true), SETTLE_MS);
    if (running.current) return;
    running.current = true;
    // One request at a time, then again while the wish has moved on since.
    const chase = async (): Promise<void> => {
      if (wish.current === settled.current) return;
      const want = wish.current;
      const next = await (want === "on" ? enablePush() : disablePush());
      settled.current = next;
      if (next !== want) {
        // The browser said no (permission refused, unsupported): show what
        // is true and why, and stop chasing the wish.
        wish.current = next;
        setState(next);
        show(problem(next) ?? t("pushFailed"), false);
      }
      return chase();
    };
    void (async () => {
      try {
        await chase();
      } catch {
        wish.current = settled.current;
        setState(settled.current);
        show(t("pushFailed"), false);
      } finally {
        running.current = false;
      }
    })();
  };

  const toastNode = (
    // The toast, at the bottom right (centred above the tab bar on a phone).
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6 lg:inset-x-auto lg:right-8 lg:bottom-8 lg:px-0"
      role="status"
    >
      {toast ? (
        // A small white card with a hairline and a soft shadow, the icon bare
        // beside one line of text, a countdown along its foot. Sized for the
        // frame's zoom, so it renders near 16px type at 1440. Rises in once and
        // drops back out; later messages only swap the text.
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
          <span className="min-w-0">{toast.text}</span>
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

  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-border p-5 lg:gap-5 lg:p-7">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-12">
        <BellRing aria-hidden className="size-5 lg:size-6" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground lg:text-frame-body">{t("deviceTitle")}</h2>
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("primerSubtitle")}</p>
      </div>
      <Button
        // The black capsule while off, the call to act; a quiet outline once on,
        // when the only thing left to do is turn it off.
        className={cn(authPill(!on), "lg:h-11 lg:text-frame-meta")}
        // Never greyed out: a press always answers, with the change or a toast.
        onClick={toggle}
        type="button"
        variant={on ? "outline" : "default"}
      >
        {on ? t("pushTurnOff") : t("primerEnable")}
      </Button>
      {toastNode}
    </div>
  );
}
