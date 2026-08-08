import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ChevronsUpDown, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

import chris from "@/assets/avatars/christopher-nolan.png";
import james from "@/assets/avatars/james-gunn.png";
import noMatches from "@/assets/illustrations/error-search.svg";
import sarah from "@/assets/avatars/sarah-jenskins.png";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";

/** Figma "Problem description (Light)" — 995:11176. */
export function ProblemDescriptionScreen() {
  const t = useTranslations("matching");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/chat" label={c("back")} />
      <ScreenBody>
        {/* Figma "Stage Header": 8px top padding, 10px gap, 40px subtitle block. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-[10px] overflow-clip px-6 pt-2">
          <h1 className="font-thai w-full text-[28px] leading-[40px] font-semibold text-foreground">
            {t("problemTitle")}
          </h1>
          <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-muted-foreground">
            {t("problemSubtitle")}
          </p>
        </div>

        {/* Figma "Form Fields": 8px top padding, 16px between rows. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-2">
          <Field
            icon={ChevronsUpDown}
            id="match-topic"
            label={t("topicLabel")}
            placeholder={t("topicPlaceholder")}
          />
          <Field
            icon={Wallet}
            id="match-budget"
            label={t("budgetLabel")}
            placeholder={t("budgetPlaceholder")}
          />
          {/* Figma "Bio Field": 20px label, 6px gap, 84px textarea, 6px gap, hint. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-[6px]">
            <label
              className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground"
              htmlFor="match-detail"
            >
              {t("detailLabel")}
            </label>
            <textarea
              className="font-thai h-[84px] w-full resize-none rounded-[8px] border border-input bg-muted px-3 py-[8px] text-[14px] leading-[20px] font-normal text-foreground outline-none placeholder:text-muted-foreground"
              id="match-detail"
              placeholder={t("detailPlaceholder")}
            />
            <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
              {t("detailHint")}
            </p>
          </div>
        </div>

        <ScreenSpacer />
        {/* Figma "Actions": a single disabled CTA flush to the home indicator. */}
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton href="/matching/searching">{t("search")}</PrimaryButton>
        </div>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Matching in progress (Light)" — 995:11210. */
export function MatchingProgressScreen() {
  const t = useTranslations("matching");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenBody>
        <div className="w-full flex-1" />
        {/* Figma "Processing": a 44px spinner, 64px gap, then the 34/20 text block. */}
        <div className="flex w-full shrink-0 flex-col items-center px-6">
          <span
            aria-label={t("searchingTitle")}
            className="size-11 shrink-0 animate-spin rounded-full border-[3px] border-border border-t-primary"
            role="status"
          />
          <p className="font-thai mt-[64px] w-full text-center text-[24px] leading-[34px] font-semibold text-foreground">
            {t("searchingTitle")}
          </p>
          <p className="font-thai mt-2 w-full text-center text-[14px] leading-[20px] font-normal text-muted-foreground">
            {t("searchingBody")}
          </p>
        </div>
        <div className="w-full flex-1" />
        <div className="flex w-full shrink-0 flex-col items-center px-6">
          <NeutralButton href="/matching">{t("cancelSearch")}</NeutralButton>
        </div>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma match row — 48px avatar, name/field/match stack, price + rating column. */
function MatchCard({
  avatar,
  name,
  field,
  match,
  price,
  rating,
}: {
  readonly avatar: StaticImageData;
  readonly name: string;
  readonly field: string;
  readonly match: string;
  readonly price: string;
  readonly rating: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-start gap-3 overflow-clip rounded-[14px] bg-card p-[14px]">
      <Image
        alt=""
        className="size-12 shrink-0 rounded-full object-cover"
        height={48}
        src={avatar}
        width={48}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
        <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground">
          {name}
        </p>
        <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
          {field}
        </p>
        <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-primary">
          {match}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-[2px]">
        <p className="font-thai text-[14px] leading-[20px] font-medium whitespace-nowrap text-foreground">
          {price}
        </p>
        <p className="font-thai text-[12px] leading-[18px] font-normal whitespace-nowrap text-muted-foreground">
          {rating}
        </p>
      </div>
    </div>
  );
}

/**
 * Figma "Matched advisors (Light)" (995:11235) and its no-results state (995:11285).
 */
export function MatchedAdvisorsScreen({
  state = "default",
}: {
  readonly state?: "default" | "no-results";
}) {
  const t = useTranslations("matching");
  const c = useTranslations("common");
  const empty = state === "no-results";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/matching" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={empty ? undefined : t("resultsSubtitle")}
          title={t("resultsTitle")}
        />

        {empty ? (
          <>
            {/* Figma "Empty State": 246px illustration inset 72px, then the copy. */}
            <div className="flex w-full shrink-0 flex-col items-center px-6 pt-[72px]">
              <Image
                alt=""
                className="h-[237px] w-[246px] shrink-0"
                src={noMatches}
              />
              <p className="font-thai mt-4 w-full text-center text-[24px] leading-[34px] font-semibold text-foreground">
                {t("noResultsTitle")}
              </p>
              <p className="font-thai mt-2 w-full text-center text-[14px] leading-[20px] font-normal text-muted-foreground">
                {t("noResultsBody")}
              </p>
            </div>
            <div className="flex w-full shrink-0 items-center justify-center px-6 pt-3">
              <Link
                className="font-thai text-[14px] leading-[20px] font-medium text-primary"
                href="/matching"
              >
                {t("editProblem")}
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Figma "Matches": 16px top padding, 12px between cards. */}
            <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6 pt-4">
              <MatchCard
                avatar={sarah}
                field={t("m1Field")}
                match={t("m1Match")}
                name={t("m1Name")}
                price={t("m1Price")}
                rating={t("m1Rating")}
              />
              <MatchCard
                avatar={chris}
                field={t("m2Field")}
                match={t("m2Match")}
                name={t("m2Name")}
                price={t("m2Price")}
                rating={t("m2Rating")}
              />
              <MatchCard
                avatar={james}
                field={t("m3Field")}
                match={t("m3Match")}
                name={t("m3Name")}
                price={t("m3Price")}
                rating={t("m3Rating")}
              />
            </div>
            <div className="flex w-full shrink-0 items-center justify-center px-6 pt-4">
              <Link
                className="font-thai text-[14px] leading-[20px] font-medium text-primary"
                href="/matching"
              >
                {t("refine")}
              </Link>
            </div>
          </>
        )}

        <ScreenSpacer />
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
