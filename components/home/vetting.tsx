import { BadgeCheck, FileCheck, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { ThaiText } from "@/components/mobile/thai-text";

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
    <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6">
      <p className="w-full text-base font-semibold text-foreground">
        {t("vettingTitle")}
      </p>
      <div className="flex w-full shrink-0 flex-col items-stretch divide-y overflow-clip rounded-xl border bg-card">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <div
            className="flex w-full shrink-0 items-start gap-3 p-3"
            key={title}
          >
            <Icon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-success" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full text-sm font-semibold text-foreground">
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
