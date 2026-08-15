import Image from "next/image";
import { Clock, Paperclip, Star, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { sarahJenskins as sarah } from "@/lib/assets/r2";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="flex h-5 w-full shrink-0 items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
        {label}
      </span>
      <span className="shrink-0 text-sm font-medium whitespace-nowrap text-foreground">
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
          <div className="flex w-full shrink-0 flex-col items-center gap-1.5 px-6 pt-4.5 text-center">
            <p className="w-full text-heading font-semibold text-foreground">
              {t("endedTitle")}
            </p>
            <p className="w-full text-sm font-normal text-muted-foreground">
              {t("endedSubtitle")}
            </p>
          </div>
        </div>

        {/* Figma "Summary": card with duration and shared-file counts. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
            <SummaryRow icon={Clock} label={t("durationLabel")} value={t("durationValue")} />
            <SummaryRow icon={Paperclip} label={t("filesLabel")} value={t("filesValue")} />
          </div>
        </div>

        {/* Figma "Review Prompt": 24/20 copy, a 44px star row, then the comment box. */}
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-6">
          <p className="w-full text-center text-base font-medium text-foreground">
            {t("promptTitle")}
          </p>
          <p className="mt-1.5 w-full text-center text-sm font-normal text-muted-foreground">
            {t("promptBody")}
          </p>
          <div className="mt-3.5 flex shrink-0 items-center gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Button
                aria-label={`${i + 1}`}
                className="size-11 shrink-0"
                key={i}
                size="icon"
                variant="ghost"
              >
                <Star className="size-7 fill-transparent text-primary" />
              </Button>
            ))}
          </div>
          {/* The comment is over the length limit on this state, so the invalid
              treatment comes from aria-invalid rather than a pinned red border —
              that also announces the problem instead of only colouring it. */}
          <Textarea
            aria-invalid
            className="mt-3.5 h-24 resize-none bg-muted px-3 text-sm shadow-none field-sizing-fixed"
            defaultValue={t("commentValue")}
          />
        </div>

        {/* Figma "Submit Error": 14px glyph beside a 12/18 destructive line. */}
        <div className="flex w-full shrink-0 items-start gap-2 px-6 pt-2">
          <TriangleAlert className="size-3.5 shrink-0 text-destructive" />
          <p className="min-w-px flex-1 text-xs font-normal text-destructive">
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
