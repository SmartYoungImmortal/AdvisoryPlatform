"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { usePushState } from "@/lib/push/use-push-state";
import { disablePush, enablePush, type PushState } from "@/lib/push/web-push";
import { cn } from "@/lib/utils";

/** What to say under the switch, for the states that need a word. */
const NOTE_KEY = {
  blocked: "pushBlocked",
  unsupported: "pushUnsupported",
  "needs-install": "pushNeedsInstall",
  unavailable: "pushUnavailable",
} as const satisfies Partial<Record<PushState, string>>;

/**
 * The one control for device notifications (Web Push): a switch that asks the browser for
 * permission, subscribes it and tells the API (or the reverse), and shows what the browser really
 * says rather than what was last pressed. A state the person cannot change from here, such as a
 * blocked permission, disables the switch and says in one line why and what to do.
 *
 * `row` is a settings-list row (glyph, label, switch); `inline` is the bare label and switch for a
 * page header.
 */
export function PushToggle({
  layout = "inline",
  showLabel = true,
  className,
}: {
  readonly layout?: "row" | "inline";
  /** Off where a heading beside the switch already names it; still read out. */
  readonly showLabel?: boolean;
  readonly className?: string;
}) {
  const t = useTranslations("notifications");
  const label = useId();
  const [state, setState] = usePushState();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const change = async (next: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      setState(await (next ? enablePush() : disablePush()));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  let note: string | null = null;
  if (failed) note = t("pushFailed");
  else if (state && state in NOTE_KEY) note = t(NOTE_KEY[state as keyof typeof NOTE_KEY]);
  const canChange = state === "on" || state === "off";
  const row = layout === "row";

  return (
    <div className={cn("flex flex-col gap-1", row && "p-3.5", className)}>
      <div className={cn("flex items-center", row ? "gap-3" : "gap-2.5")}>
        {row ? <Bell aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : null}
        <span
          className={cn(
            "text-sm text-foreground",
            row ? "min-w-0 flex-1 font-medium" : "text-muted-foreground",
            !showLabel && "sr-only",
          )}
          id={label}
        >
          {t("pushLabel")}
        </span>
        <Switch
          aria-labelledby={label}
          checked={state === "on"}
          disabled={!canChange || busy}
          onCheckedChange={(next) => void change(next)}
        />
      </div>
      <p aria-live="polite" className={cn("text-xs text-muted-foreground", row ? "pl-7" : "max-w-60")} role="status">
        {note}
      </p>
    </div>
  );
}
