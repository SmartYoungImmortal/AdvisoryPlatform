"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/mobile/buttons";
import { cn } from "@/lib/utils";

/**
 * Every retry control the six offline frames draw: the banner's "ลองใหม่", the
 * queue's per-row retry and its "ลองซิงก์อีกครั้ง", and the primary action on
 * the two outcome screens.
 *
 * These are prototype screens over `lib/mock-db` — there is no service worker
 * and no network layer to ask — so the button does not pretend to reconnect and
 * nothing here listens to `navigator.onLine`. What it does own is the one piece
 * of state a retry genuinely has: *an attempt is in flight*. It holds that for
 * the length of an attempt and then drops it, leaving the screen in the state
 * its frame draws, which is the truthful outcome while the device is offline.
 * The spinner says so to everyone; `aria-busy` says so to a screen reader.
 */
const ATTEMPT_MS = 1200;

function useAttempt() {
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A tap that unmounts the screen mid-attempt would otherwise set state on a
  // gone component, so the timer is cleared on the way out.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const start = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPending(true);
    timer.current = setTimeout(() => setPending(false), ATTEMPT_MS);
  }, []);

  return { pending, start };
}

/**
 * Figma "Primary Action" on the two outcome frames (1952:36030, 1952:36275) —
 * the full-width 36px action, with the spinner taking the leading slot while
 * the attempt runs.
 */
export function RetryAction({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const { pending, start } = useAttempt();

  return (
    <PrimaryButton
      aria-busy={pending}
      className={className}
      disabled={pending}
      onClick={start}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </PrimaryButton>
  );
}

/**
 * Figma's bare retry labels — the accent word in the connectivity banner
 * (1952:36304), the centred "ลองซิงก์อีกครั้ง" (1952:36125) and the muted
 * "ลองใหม่" inside a queue row (1952:36114). Drawn as plain text, built as a
 * real control so they carry the focus ring, the press state and the disabled
 * state the primitive already has.
 */
export function RetryLink({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const { pending, start } = useAttempt();

  return (
    <Button
      aria-busy={pending}
      className={cn(
        "h-auto shrink-0 gap-1.5 p-0 text-sm font-medium whitespace-nowrap",
        className,
      )}
      disabled={pending}
      onClick={start}
      variant="link"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {children}
    </Button>
  );
}
