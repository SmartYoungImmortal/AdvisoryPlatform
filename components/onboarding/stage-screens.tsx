import Image from "next/image";
import {
  BadgeCheck,
  CalendarDays,
  ChevronsUpDown,
  CircleCheck,
  IdCard,
  ImageUp,
  Phone,
  Plus,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import idCard from "@/assets/onboarding/thai-national-id.png";
import { AlertBanner } from "@/components/mobile/banner";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
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
import { BulletLine, CheckLine, DropZone, StageHeader } from "@/components/onboarding/parts";
import { Card, CardDivider, StackRow } from "@/components/screening/parts";

/** Figma "Become an advisor (Light)" — 995:6410. */
export function BecomeAdvisorScreen() {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("introSubtitle")}
          title={t("introTitle")}
        />
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <Card>
            <StackRow body={t("verifyBody")} icon={BadgeCheck} title={t("verifyTitle")} />
            <CardDivider />
            <StackRow body={t("scheduleBody")} icon={CalendarDays} title={t("scheduleTitle")} />
            <CardDivider />
            <StackRow body={t("earnBody")} icon={Wallet} title={t("earnTitle")} />
          </Card>
        </div>
        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/advisor-onboarding/stage-1">{t("start")}</PrimaryButton>
          <NeutralButton href="/profile">{t("later")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Advisor Onboarding - Stage 1" (995:6215) and its error state (995:6452). */
export function OnboardingStage1Screen({
  state = "default",
}: {
  readonly state?: "default" | "errors";
}) {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const err = state === "errors";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/advisor/apply" label={c("back")} />
      <ScreenBody>
        <StageHeader label={t("stepOf", { n: 1 })} step={1} title={t("s1Title")} />

        {err ? (
          <AlertBanner
            body={t("s1ErrorBody")}
            icon={TriangleAlert}
            title={t("s1ErrorTitle")}
          />
        ) : null}

        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-2">
          <Field
            error={err ? t("legalNameError") : undefined}
            id="ob-name"
            invalid={err}
            label={err ? t("fullNameLabel") : t("legalNameLabel")}
            placeholder={err ? t("fullNamePlaceholder") : t("legalNamePlaceholder")}
          />
          <Field
            defaultValue={err ? t("phoneFilled") : undefined}
            error={err ? t("phoneError") : undefined}
            icon={Phone}
            id="ob-phone"
            invalid={err}
            label={t("phoneLabel")}
            latin
            placeholder={t("phonePlaceholder")}
          />
          <Field
            error={err ? t("dobError") : undefined}
            icon={CalendarDays}
            id="ob-dob"
            invalid={err}
            label={t("dobLabel")}
            placeholder={err ? t("dobFilledPlaceholder") : t("dobPlaceholder")}
          />
          <div className="flex w-full shrink-0 flex-col items-start gap-[6px]">
            <label
              className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground"
              htmlFor="ob-bio"
            >
              {err ? t("bioIntroLabel") : t("bioLabel")}
            </label>
            <textarea
              className="font-thai h-[84px] w-full resize-none rounded-[8px] border border-input bg-muted px-3 py-[8px] text-[14px] leading-[20px] font-normal text-foreground outline-none placeholder:text-muted-foreground"
              id="ob-bio"
              placeholder={t("bioPlaceholder")}
            />
            <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
              {t("bioHint")}
            </p>
          </div>
        </div>

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton className="disabled:opacity-40" disabled>
            {t("continue")}
          </PrimaryButton>
        </div>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/**
 * Figma "Advisor Onboarding - Stage 2" (995:6250), its uploaded state (995:6292)
 * and its rejected state (995:6496).
 */
export function OnboardingStage2Screen({
  state = "default",
}: {
  readonly state?: "default" | "uploaded" | "rejected";
}) {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const uploaded = state === "uploaded";
  const rejected = state === "rejected";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/advisor-onboarding/stage-1" label={c("back")} />
      <ScreenBody>
        <StageHeader label={t("stepOf", { n: 2 })} step={2} title={t("s2Title")} />

        {rejected ? (
          <AlertBanner
            body={t("s2ErrorBody")}
            icon={TriangleAlert}
            title={t("s2ErrorTitle")}
          />
        ) : null}

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          {uploaded ? (
            /* Figma "Uploaded Document" (402 x 262): a 354 x 208 preview, a 10px
               gap, then the 36px file-info row; the actions row follows 12px down. */
            <>
              <Image
                alt={t("fileName")}
                className="h-[208px] w-full shrink-0 rounded-[14px] object-cover"
                src={idCard}
              />
              <div className="mt-[10px] flex h-9 w-full shrink-0 items-start gap-[10px]">
                <div className="flex min-w-px flex-1 flex-col items-start gap-[2px]">
                  <p className="font-latin w-full text-[14px] leading-[20px] font-medium text-foreground">
                    {t("fileName")}
                  </p>
                  <p className="font-latin w-full text-[12px] leading-[14px] font-normal text-muted-foreground">
                    {t("fileMeta")}
                  </p>
                </div>
                <CircleCheck className="mt-2 size-5 shrink-0 text-primary" />
              </div>
              <div className="mt-3 flex w-full shrink-0 items-center gap-3">
                <NeutralButton className="min-w-px flex-1">
                  <ImageUp className="size-4" />
                  {t("replace")}
                </NeutralButton>
                <NeutralButton className="min-w-px flex-1 border-destructive text-destructive">
                  <Trash2 className="size-4" />
                  {t("remove")}
                </NeutralButton>
              </div>
            </>
          ) : (
            <DropZone
              action={
                <NeutralButton className="mt-3 w-auto">
                  <ImageUp className="size-4" />
                  {t("browse")}
                </NeutralButton>
              }
              icon={IdCard}
              invalid={rejected}
              subtitle={t("uploadSubtitle")}
              title={t("uploadTitle")}
            />
          )}
        </div>

        {/* Figma guidance / next-steps list. */}
        <div className={`flex w-full shrink-0 flex-col items-start gap-[6px] px-6 ${uploaded ? "pt-6" : "pt-5"}`}>
          <p className="font-thai mb-[2px] w-full text-[14px] leading-[20px] font-medium text-foreground">
            {uploaded ? t("nextHeading") : t("guidance")}
          </p>
          {uploaded ? (
            <>
              <BulletLine>{t("next1")}</BulletLine>
              <BulletLine>{t("next2")}</BulletLine>
            </>
          ) : (
            <>
              <CheckLine>{t("check1")}</CheckLine>
              <CheckLine>{t("check2")}</CheckLine>
              <CheckLine>{t("check3")}</CheckLine>
            </>
          )}
        </div>

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton className="disabled:opacity-40" disabled={!uploaded}>
            {t("continue")}
          </PrimaryButton>
        </div>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Advisor Onboarding - Stage 3" (995:6341) and its missing-proof state (995:6544). */
export function OnboardingStage3Screen({
  state = "default",
}: {
  readonly state?: "default" | "missing-proof";
}) {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const err = state === "missing-proof";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/advisor-onboarding/stage-2" label={c("back")} />
      <ScreenBody>
        <StageHeader label={t("stepOf", { n: 3 })} step={3} title={t("s3Title")} />

        {err ? (
          <AlertBanner
            body={t("s3ErrorBody")}
            icon={TriangleAlert}
            title={t("s3ErrorTitle")}
          />
        ) : null}

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
            {t("s3Intro")}
          </p>
        </div>

        {/* Figma "Skill Card 1": skill picker plus a proof drop zone. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6 pt-4">
          <div
            className={`flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-[14px] border bg-card p-[14px] ${
              err ? "border-destructive" : "border-transparent"
            }`}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <p className="font-thai text-[14px] leading-[20px] font-medium text-foreground">
                {t("skillCard")}
              </p>
              <Trash2 className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <Field
              icon={ChevronsUpDown}
              id="skill-1"
              label={t("skillLabel")}
              placeholder={t("skillPlaceholder")}
            />
            <div className="flex w-full shrink-0 flex-col items-start gap-[6px]">
              <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground">
                {t("proofLabel")}
              </p>
              <DropZone
                action={null}
                compact
                icon={ImageUp}
                invalid={err}
                subtitle={t("proofHint")}
                title={t("proofBrowse")}
              />
            </div>
          </div>
          <NeutralButton>
            <Plus className="size-4" />
            {t("addSkill")}
          </NeutralButton>
        </div>

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton className="disabled:opacity-40" disabled>
            {t("submitReview")}
          </PrimaryButton>
        </div>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
