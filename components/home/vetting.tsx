import { BadgeCheck, FileCheck, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * Why the people on this page can be trusted.
 *
 * Fastwork answers this with three purchasable tiers (Freelancer / Specialist /
 * Professional). We have no tiers to sell, so this states the vetting that
 * actually happens: the three stages of `/advisor-onboarding` every advisor
 * clears before a profile is published. It is the same promise the "verified"
 * tick on each card is making, spelled out once.
 *
 * No counts. The catalogue is a fixture and inventing "ผู้เชี่ยวชาญ 200,000+"
 * to match a competitor's number would be a lie printed on the home screen.
 */
const STEPS = [
  { icon: BadgeCheck, title: "vetting1Title", body: "vetting1Body" },
  { icon: FileCheck, title: "vetting2Title", body: "vetting2Body" },
  { icon: ShieldCheck, title: "vetting3Title", body: "vetting3Body" },
] as const;

export function VettingSection() {
  const t = useTranslations("home");

  return (
    // One card of three rows on the phone; three cards across the desktop
    // column, on the same 1200 grid every other band there uses.
    <div className={cn("flex w-full shrink-0 flex-col items-start gap-3 px-6 lg:gap-6", PAGE)}>
      <p className="w-full text-base font-semibold text-foreground lg:text-2xl">
        {t("vettingTitle")}
      </p>
      <div
        className={cn(
          surfaceClass(),
          "flex w-full shrink-0 flex-col items-stretch divide-y divide-border overflow-clip",
          "lg:grid lg:grid-cols-3 lg:gap-6 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none",
        )}
      >
        {STEPS.map(({ icon: Icon, title, body }) => (
          <div
            className="flex w-full shrink-0 items-start gap-3 p-3 lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-card"
            key={title}
          >
            {/* The glyph sat bare at 18px against 14px copy, so the three rows
                read as a text list. A tinted circle is what makes each one a
                claim rather than a bullet. */}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10">
              <Icon aria-hidden className="size-4.5 text-success" />
            </span>
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full text-sm font-semibold text-foreground lg:text-base">
                {t(title)}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                <ThaiText>{t(body)}</ThaiText>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
