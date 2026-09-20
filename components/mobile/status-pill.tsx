import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A status, in colour, on the consumer side.
 *
 * The console has had this since it was ported — ten status groups over five
 * colours (`components/cms/status.tsx`). The app people actually use had none
 * of it: "ชำระแล้ว", "รอยืนยัน" and "ยกเลิก" were all the same 12px grey, and a
 * reader had to read the word to learn the outcome. `--success`, `--warning`
 * and `--info` were defined and then used seventeen times in the whole app.
 *
 * Same colour vocabulary as the console, so the two halves of the product agree
 * on what green means, and the same soft treatment: a tinted ground with the
 * colour as ink, never a solid fill fighting the accent.
 *
 * Colour is never the only carrier — each pill states its status in words, and
 * an `icon` can double it for the cases where the word is short.
 */
export type StatusTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent-surface text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

export function StatusPill({
  tone = "neutral",
  icon: Icon,
  className,
  children,
}: {
  readonly tone?: StatusTone;
  readonly icon?: LucideIcon;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" /> : null}
      {children}
    </span>
  );
}
