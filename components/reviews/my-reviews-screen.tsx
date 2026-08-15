import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { arayaS as araya, christopherNolan as chris, jamesGunn as james } from "@/lib/assets/r2";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import { ThaiText } from "@/components/mobile/thai-text";
import { ReviewCard, Stars } from "@/components/reviews/review-parts";

/** Figma "Distribution" row — a 6px track with a proportional fill. */
function DistributionRow({ label, fill }: { readonly label: string; readonly fill: number }) {
  return (
    <div className="flex h-3.5 w-full shrink-0 items-center">
      <span className="font-latin w-2 shrink-0 text-xs leading-3.5 font-normal text-muted-foreground">
        {label}
      </span>
      <div className="ml-2 h-1.5 min-w-px flex-1 overflow-clip rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

/**
 * Figma "Advisor - My reviews" (995:9772) and "My reviews - Empty" (995:9561).
 */
export function MyReviewsScreen({
  state = "default",
}: {
  readonly state?: "default" | "empty";
}) {
  const t = useTranslations("reviews");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("title")} />

        {state === "empty" ? (
          /* Figma "Empty State": 80px badge, 34/40 title block, then a 5-star row. */
          <div className="flex w-full shrink-0 flex-col items-center px-6 pt-[72px] text-center">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted">
              <Star className="size-8.5 text-muted-foreground" />
            </span>
            <p className="mt-4 w-full text-2xl font-semibold text-foreground">
              {t("emptyTitle")}
            </p>
            <p className="mt-2 w-full text-sm font-normal text-muted-foreground">
              <ThaiText>{t("emptyBody")}</ThaiText>
            </p>
            <Stars className="mt-4" filled={0} gap={3} size={18} />
          </div>
        ) : (
          <>
            {/* Figma "Summary Card": 4.9 score block beside the 5-bar distribution. */}
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
              <div className="flex w-full shrink-0 items-start gap-4 overflow-clip rounded-xl bg-card p-3.5">
                <div className="flex w-[72px] shrink-0 flex-col items-center gap-2.5 pt-3.5">
                  <p className="font-latin text-xl leading-6 font-semibold text-foreground">
                    4.9
                  </p>
                  <Stars gap={3} size={12} />
                  <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
                    {t("reviewCount")}
                  </p>
                </div>
                <div className="flex min-w-px flex-1 flex-col items-start gap-[5px]">
                  <DistributionRow fill={38} label="5" />
                  <DistributionRow fill={5} label="4" />
                  <DistributionRow fill={2} label="3" />
                  <DistributionRow fill={1} label="2" />
                  <DistributionRow fill={1} label="1" />
                </div>
              </div>
            </div>

            {/* Figma "Review List": 20px top padding, 12px between cards. */}
            <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6 pt-5">
              <ReviewCard
                avatar={araya}
                body={t("r1Body")}
                date={t("r1Date")}
                meta={t("r1Meta")}
                name={t("r1Name")}
                reply={t("r1Reply")}
                replyLabel={t("yourReply")}
              />
              <ReviewCard
                avatar={chris}
                body={t("r2Body")}
                date={t("r2Date")}
                meta={t("r2Meta")}
                name={t("r2Name")}
                replyAction={t("reply")}
              />
              <ReviewCard
                avatar={james}
                body={t("r3Body")}
                date={t("r3Date")}
                meta={t("r3Meta")}
                name={t("r3Name")}
                replyAction={t("reply")}
              />
            </div>
          </>
        )}

        <ScreenSpacer />
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
