import { CreditCard, MessageSquare, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { AUTH_CARD, AuthFooter, AuthTopNav } from "@/components/auth/auth-chrome";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { SurfaceList } from "@/components/mobile/surface";
import { cn } from "@/lib/utils";

/** Figma "Info Card" row — 64px tall: 16px glyph inset 14px, then a title/body stack. */
function UseRow({
  icon: Icon,
  title,
  body,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-3.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-medium text-foreground">
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

/** Figma "PDPA consent (Light)" — 995:4285. */
export function PdpaScreen() {
  const t = useTranslations("pdpa");
  const c = useTranslations("common");

  return (
    // Figma "Desktop / PDPA consent (Light)" (1787:24095).
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/register" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <div className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}>
          <ScreenHeading className="gap-2 pt-4" subtitle={t("subtitle")} title={t("title")} />

          {/* Figma "What We Use": card of three 64px rows split by hairlines.
              It was `bg-card` on the card surface with hand-drawn dividers — a
              white block on white, which is why the desktop frame had already
              reached for `bg-muted/50`. One well, hairlines from `SurfaceList`,
              at both sizes. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
            <SurfaceList tier="well">
              <UseRow body={t("profileBody")} icon={UserRound} title={t("profileTitle")} />
              <UseRow
                body={t("sessionsBody")}
                icon={MessageSquare}
                title={t("sessionsTitle")}
              />
              <UseRow body={t("paymentsBody")} icon={CreditCard} title={t("paymentsTitle")} />
            </SurfaceList>
          </div>

          <ScreenSpacer className="lg:hidden" />
          <ScreenActions stacked>
            {/* Consent is the last step of sign-up, so accepting lands on home. */}
            <PrimaryButton block href="/">
              {t("accept")}
            </PrimaryButton>
            <NeutralButton block href="/terms">
              {t("readFull")}
            </NeutralButton>
          </ScreenActions>
        </div>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Terms of Service (Light)" — 995:4533. */
export function TermsScreen() {
  const t = useTranslations("terms");
  const c = useTranslations("common");
  const sections = [1, 2, 3, 4, 5] as const;

  return (
    // Figma "Desktop / Terms of Service (Light)" (1787:24166) — the document
    // reads in the same card, which is what keeps the measure short enough to
    // read at 1440 instead of running the full page width.
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/pdpa" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <div className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}>
          <ScreenHeading className="pt-4" title={t("title")} />
          {/* Figma "Document": 8px top padding, 18px between sections, 6px title→body.
              Section heads step to 16px semibold: at 14px medium they were the
              same size as the paragraph under them, so five sections read as one
              undifferentiated wall. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-4.5 px-6 pt-2 lg:gap-6 lg:pb-8">
            {sections.map((n) => (
              <div
                className="flex w-full shrink-0 flex-col items-start gap-1.5"
                key={n}
              >
                <p className="w-full text-base font-semibold text-foreground lg:text-lg">
                  {t(`s${n}Title`)}
                </p>
                <p className="w-full text-sm font-normal text-muted-foreground">
                  {t(`s${n}Body`)}
                </p>
              </div>
            ))}
          </div>
          <ScreenSpacer className="lg:hidden" />
        </div>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}
