"use client";

import { BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { authPill } from "@/components/auth/auth-split";
import { StatusToast, useStatusToast } from "@/components/mobile/toast";
import { Button } from "@/components/ui/button";
import { usePushState } from "@/lib/push/use-push-state";
import { disablePush, enablePush, type PushState } from "@/lib/push/web-push";
import { cn } from "@/lib/utils";

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
  const { toast, leaving, paused, show, clear, dismiss, setPaused } = useStatusToast();

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
    clear();
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
      <StatusToast dismiss={dismiss} leaving={leaving} paused={paused} setPaused={setPaused} toast={toast} />
    </div>
  );
}

/**
 * The card's own shape while the feed beside it loads: the circle, the two
 * lines and the capsule as bones, and nothing to press. Turning alerts on is
 * offered once there is a feed for them to be about; an empty one drops the
 * card altogether. Each line is one line box of its text's step (`h-lh`) with
 * the bone inside, as the feed's skeleton does, so the card stands as tall.
 */
export function DeviceAlertsCardSkeleton() {
  const bone = "animate-pulse bg-muted motion-reduce:animate-none";

  return (
    <div aria-hidden className="flex w-full flex-col items-start gap-4 rounded-2xl border border-border p-5 lg:gap-5 lg:p-7">
      <span className={cn(bone, "size-10 rounded-full lg:size-12")} />
      <div className="flex w-full flex-col gap-1">
        <span className="flex h-lh items-center text-base lg:text-frame-body">
          <span className={cn(bone, "h-4 w-2/3 rounded lg:h-4.5")} />
        </span>
        <span className="flex h-lh items-center text-sm lg:text-frame-meta">
          <span className={cn(bone, "h-3.5 w-full rounded lg:h-4")} />
        </span>
      </div>
      {/* `authPill`'s heights, with the frame's from `lg`. */}
      <span className={cn(bone, "h-11 w-full rounded-full md:h-12 lg:h-11")} />
    </div>
  );
}
