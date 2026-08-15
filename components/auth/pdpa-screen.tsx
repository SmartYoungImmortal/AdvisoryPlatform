import { CreditCard, MessageSquare, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";

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
    <MobileScreen>
      <ScreenTopBar href="/register" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="gap-2 pt-4" subtitle={t("subtitle")} title={t("title")} />

        {/* Figma "What We Use": card of three 64px rows split by hairlines. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
            <UseRow body={t("profileBody")} icon={UserRound} title={t("profileTitle")} />
            <div className="h-px w-full shrink-0 bg-muted" />
            <UseRow
              body={t("sessionsBody")}
              icon={MessageSquare}
              title={t("sessionsTitle")}
            />
            <div className="h-px w-full shrink-0 bg-muted" />
            <UseRow body={t("paymentsBody")} icon={CreditCard} title={t("paymentsTitle")} />
          </div>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/profile">{t("accept")}</PrimaryButton>
          <NeutralButton href="/terms">{t("readFull")}</NeutralButton>
        </ScreenActions>
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
    <MobileScreen>
      <ScreenTopBar href="/pdpa" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("title")} />
        {/* Figma "Document": 8px top padding, 18px between sections, 6px title→body. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4.5 px-6 pt-2">
          {sections.map((n) => (
            <div
              className="flex w-full shrink-0 flex-col items-start gap-1.5"
              key={n}
            >
              <p className="w-full text-sm font-medium text-foreground">
                {t(`s${n}Title`)}
              </p>
              <p className="w-full text-sm font-normal text-muted-foreground">
                {t(`s${n}Body`)}
              </p>
            </div>
          ))}
        </div>
        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}
