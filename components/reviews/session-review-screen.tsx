import Image from "next/image";
import { Clock, Paperclip, Star, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import sarah from "@/assets/avatars/sarah-jenskins.png";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";

/** Figma "Summary Row" — 16px glyph, label, right-aligned value. */
function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: typeof Clock;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex h-5 w-full shrink-0 items-center gap-[10px]">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="font-thai min-w-px flex-1 text-[14px] leading-[20px] font-normal text-muted-foreground">
        {label}
      </span>
      <span className="font-thai shrink-0 text-[14px] leading-[20px] font-medium whitespace-nowrap text-foreground">
        {value}
      </span>
    </div>
  );
}

/** Figma "Review - Submit failed (Light)" — 995:9723. */
export function SessionReviewScreen() {
  const t = useTranslations("reviews");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenBody>
        {/* Figma "Ended Hero": 70px inset, 96px avatar, then the 40/20 text block. */}
        <div className="flex w-full shrink-0 flex-col items-center pt-[70px]">
          <Image
            alt=""
            className="size-24 shrink-0 rounded-full object-cover"
            height={96}
            src={sarah}
            width={96}
          />
          <div className="flex w-full shrink-0 flex-col items-center gap-[6px] px-6 pt-[18px] text-center">
            <p className="font-thai w-full text-[28px] leading-[40px] font-semibold text-foreground">
              {t("endedTitle")}
            </p>
            <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-muted-foreground">
              {t("endedSubtitle")}
            </p>
          </div>
        </div>

        {/* Figma "Summary": card with duration and shared-file counts. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-[14px] bg-card p-[14px]">
            <SummaryRow icon={Clock} label={t("durationLabel")} value={t("durationValue")} />
            <SummaryRow icon={Paperclip} label={t("filesLabel")} value={t("filesValue")} />
          </div>
        </div>

        {/* Figma "Review Prompt": 24/20 copy, a 44px star row, then the comment box. */}
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-6">
          <p className="font-thai w-full text-center text-[16px] leading-[24px] font-medium text-foreground">
            {t("promptTitle")}
          </p>
          <p className="font-thai mt-[6px] w-full text-center text-[14px] leading-[20px] font-normal text-muted-foreground">
            {t("promptBody")}
          </p>
          <div className="mt-[14px] flex shrink-0 items-center gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <button
                aria-label={`${i + 1}`}
                className="flex size-11 shrink-0 items-center justify-center"
                key={i}
                type="button"
              >
                <Star className="size-7 fill-transparent text-primary" />
              </button>
            ))}
          </div>
          <textarea
            className="font-thai mt-[14px] h-24 w-full resize-none rounded-[8px] border border-destructive bg-muted px-3 py-[8px] text-[14px] leading-[20px] font-normal text-foreground outline-none placeholder:text-muted-foreground"
            defaultValue={t("commentValue")}
          />
        </div>

        {/* Figma "Submit Error": 14px glyph beside a 12/18 destructive line. */}
        <div className="flex w-full shrink-0 items-start gap-2 px-6 pt-2">
          <TriangleAlert className="size-[14px] shrink-0 text-destructive" />
          <p className="font-thai min-w-px flex-1 text-[12px] leading-[18px] font-normal text-destructive">
            {t("submitError")}
          </p>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/reviews">{t("retry")}</PrimaryButton>
          <NeutralButton href="/profile">{t("backHome")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
