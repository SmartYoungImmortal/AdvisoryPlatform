import Image from "next/image";
import { CircleCheckBig, Clock, Paperclip, Star, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { sarahJenskins as sarah } from "@/lib/assets/r2";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
} from "@/components/mobile/screen";
import {
  ACCOUNT_CONFIRM_PANEL,
  ACCOUNT_NAV,
} from "@/components/profile/account-chrome";
import { Stars } from "@/components/reviews/review-parts";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

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

/**
 * Figma "Review - Submit failed (Light)" (995:9723) and "Review - Already
 * submitted (Light)" (995:9650).
 *
 * Figma "Desktop / Review - Submit failed (Light)" (1787:26266) and "Desktop /
 * Review - Already submitted (Light)" (1952:36732) gather the whole screen into
 * a 640px panel under the app's nav: neither frame has a back bar or a head
 * band, because the hero is the heading and the only way on from here is one of
 * the actions at the bottom. Both states wear that same chrome, so only what is
 * inside the panel answers to `state`.
 */
export function SessionReviewScreen({
  state = "default",
}: {
  readonly state?: "default" | "submitted";
}) {
  return (
    <MobileScreen className="pt-6 lg:pt-0" wide>
      <ScreenBody>
        <div className={ACCOUNT_NAV}>
          <TopBar unreadNotifications />
        </div>

        <div
          className={cn(
            "flex w-full flex-1 flex-col items-center",
            ACCOUNT_CONFIRM_PANEL,
            "lg:mt-18",
          )}
        >
          {state === "submitted" ? <AlreadySubmitted /> : <SubmitFailed />}
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

/** The panel contents of Figma 995:9723 — the rating still waiting to be sent. */
function SubmitFailed() {
  const t = useTranslations("reviews");

  return (
    <>
      {/* Figma "Ended Hero": 70px inset, 96px avatar, then the 40/20 text
          block. Inside the panel that inset is the panel's own padding. */}
      <div className="flex w-full shrink-0 flex-col items-center pt-[70px] lg:pt-4">
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

      {/* Figma "Summary": card with duration and shared-file counts. The
          card is the page surface on the phone; on the panel it would
          vanish into it, so it takes the muted tint the frame gives it. */}
      <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6">
        <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5 lg:bg-muted/50">
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

      {/* The phone frame pins its actions to the bottom edge; the panel is
          only as tall as its content, so the spacer goes with the frame and
          the stack turns into Figma's right-aligned row. */}
      <ScreenSpacer className="lg:hidden" />
      <ScreenActions className="lg:flex-row-reverse lg:justify-start lg:pt-8 lg:pb-0">
        <PrimaryButton className="lg:w-auto" href="/reviews">
          {t("retry")}
        </PrimaryButton>
        <NeutralButton className="lg:w-auto" href="/profile">
          {t("backHome")}
        </NeutralButton>
      </ScreenActions>
    </>
  );
}

/**
 * The panel contents of Figma "Review - Already submitted (Light)" (995:9650).
 *
 * Nothing here takes input: the rating is on record, so the 44px star buttons
 * of the rating state are a plain 18px row and the comment box is the quote it
 * became. There is one way on, and it leaves the flow.
 */
function AlreadySubmitted() {
  const t = useTranslations("reviews");

  return (
    <>
      {/* Figma "Hero": 72px inset, a 96px success badge, then a 22px gap to the
          40/20/18 text block. Inside the panel that inset is its padding. */}
      <div className="flex w-full shrink-0 flex-col items-center gap-5.5 px-6 pt-18 lg:pt-4">
        <span className="flex size-24 shrink-0 items-center justify-center overflow-clip rounded-full bg-success-surface">
          <CircleCheckBig className="size-11 text-success" />
        </span>
        <div className="flex w-full shrink-0 flex-col items-center gap-2.5 overflow-clip text-center">
          <p className="w-full text-heading font-semibold text-foreground">
            {t("submittedTitle")}
          </p>
          <p className="w-full text-sm font-normal text-muted-foreground">
            {t("submittedSubtitle")}
          </p>
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("submittedMeta")}
          </p>
        </div>
      </div>

      {/* Figma "Recap": the rating and the comment as they were sent, then the
          12/18 line that says why there is nothing to change here. The card
          takes the same muted tint the summary does, for the same reason —
          on the panel a white card on white has no edge. */}
      <div className="flex w-full shrink-0 flex-col items-center gap-2.5 px-6 pt-6">
        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip rounded-xl bg-card p-3.5 lg:bg-muted/50">
          <div className="flex w-full shrink-0 items-center gap-2.5">
            <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
              {t("submittedRatingLabel")}
            </span>
            <Stars gap={4} size={18} />
          </div>
          <p className="w-full text-sm font-normal text-foreground">
            {t("submittedQuote")}
          </p>
        </div>
        <p className="w-full text-center text-xs font-normal text-muted-foreground">
          {t("submittedNote")}
        </p>
      </div>

      {/* The phone frame pins its one action to the bottom edge; the panel is
          only as tall as its content, so the spacer goes with the frame and
          the button shrinks to the 240px the desktop frame centres. */}
      <ScreenSpacer className="lg:hidden" />
      <ScreenActions className="lg:pt-7 lg:pb-4">
        <PrimaryButton className="lg:w-60" href="/bookings">
          {t("backToBookings")}
        </PrimaryButton>
      </ScreenActions>
    </>
  );
}
