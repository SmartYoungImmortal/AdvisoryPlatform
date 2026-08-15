import { CalendarDays, CreditCard, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";

/** Figma "Info Card" row — 64px tall, 16px glyph, title/body stack. */
function PrimerRow({
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

/** Figma "Push primer (Light)" — 995:10920. */
export function PushPrimerScreen() {
  const t = useTranslations("notifications");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/notifications" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("primerSubtitle")}
          title={t("primerTitle")}
        />

        {/* Figma "What We Use": 12px top padding, then a 194px three-row card. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
            <PrimerRow
              body={t("primerBookingsBody")}
              icon={CalendarDays}
              title={t("primerBookingsTitle")}
            />
            <div className="h-px w-full shrink-0 bg-muted" />
            <PrimerRow
              body={t("primerMessagesBody")}
              icon={MessageSquare}
              title={t("primerMessagesTitle")}
            />
            <div className="h-px w-full shrink-0 bg-muted" />
            <PrimerRow
              body={t("primerPaymentsBody")}
              icon={CreditCard}
              title={t("primerPaymentsTitle")}
            />
          </div>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/notifications">{t("primerEnable")}</PrimaryButton>
          <NeutralButton href="/profile">{t("primerLater")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
